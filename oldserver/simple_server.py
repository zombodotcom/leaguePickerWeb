#!/usr/bin/env python3
"""
Simple HTTP server to serve the League Arena Champion Tracker
This server handles CORS and proxies requests to the LCU API
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import urllib.error
import base64
import ssl
import os
import re
from pathlib import Path

class LCUProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.manual_lockfile_data = None
        super().__init__(*args, **kwargs)

    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            # Serve static files
            if self.path == '/':
                self.path = '/index.html'
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            self.send_error(404, "Not Found")

    def handle_api_request(self):
        try:
            # Handle manual lockfile submission
            if self.path == '/api/lockfile' and self.command == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length > 0:
                    post_data = self.rfile.read(content_length)
                    try:
                        lockfile_data = json.loads(post_data.decode('utf-8'))
                        # Store the manual lockfile data (in a real app, you'd use a database or session)
                        self.manual_lockfile_data = lockfile_data
                        self.send_json_response({'success': True, 'message': 'Lockfile data saved'})
                        return
                    except json.JSONDecodeError:
                        self.send_error_response('Invalid JSON data')
                        return

            # Read lockfile (try manual first, then automatic)
            lockfile_data = self.get_lockfile_data()
            if not lockfile_data:
                self.send_error_response('Lockfile not found. Make sure League client is running or use manual input.')
                return

            # Parse API path
            if self.path == '/api/lockfile':
                self.send_json_response(lockfile_data)
                return
            elif self.path == '/api/arena-challenge':
                self.proxy_lcu_request('/lol-challenges/v1/challenges/local-player', lockfile_data)
                return
            elif self.path == '/api/champions':
                self.proxy_lcu_request('/lol-champions/v1/owned-champions-minimal', lockfile_data)
                return
            elif self.path.startswith('/api/champion-image/'):
                image_path = self.path.replace('/api/champion-image', '')
                self.proxy_lcu_request(image_path, lockfile_data, is_binary=True)
                return
            else:
                self.send_error_response('Unknown API endpoint')
                return

        except Exception as e:
            self.send_error_response(f'Server error: {str(e)}')

    def get_lockfile_data(self):
        """Get lockfile data from manual input or automatic reading"""
        # Try manual data first
        if hasattr(self, 'manual_lockfile_data') and self.manual_lockfile_data:
            return self.manual_lockfile_data
        
        # Fall back to automatic reading
        return self.read_lockfile()

    def read_lockfile(self):
        """Read the League of Legends lockfile"""
        lockfile_paths = [
            'C:\\Riot Games\\League of Legends\\lockfile',
            'C:\\Program Files\\Riot Games\\League of Legends\\lockfile',
            'C:\\Program Files (x86)\\Riot Games\\League of Legends\\lockfile',
            'C:\\Games\\Riot Games\\League of Legends\\lockfile',
        ]

        for path in lockfile_paths:
            if os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        content = f.read().strip()
                        print(f"Found lockfile at {path}: {content}")  # Debug
                        parts = content.split(':')
                        if len(parts) >= 4:
                            return {
                                'name': parts[0],
                                'pid': parts[1],
                                'port': int(parts[2]),
                                'password': parts[3],
                                'protocol': parts[4] if len(parts) > 4 else 'https'
                            }
                except Exception as e:
                    print(f"Error reading lockfile at {path}: {e}")  # Debug
                    continue
        print("No lockfile found in any of the expected locations")  # Debug
        return None

    def proxy_lcu_request(self, path, lockfile_data, is_binary=False):
        """Proxy request to LCU API"""
        try:
            url = f"https://127.0.0.1:{lockfile_data['port']}{path}"
            
            # Create basic auth header
            credentials = base64.b64encode(f"riot:{lockfile_data['password']}".encode()).decode()
            
            # Create request
            req = urllib.request.Request(url)
            req.add_header('Authorization', f'Basic {credentials}')
            req.add_header('Accept', '*/*' if is_binary else 'application/json')
            req.add_header('Content-Type', 'application/json')
            
            # Create SSL context that doesn't verify certificates
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            # Make request
            with urllib.request.urlopen(req, context=ssl_context) as response:
                if is_binary:
                    # Handle binary data (images)
                    data = response.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.send_header('Content-Length', str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                else:
                    # Handle JSON data
                    data = response.read().decode('utf-8')
                    try:
                        json_data = json.loads(data)
                        self.send_json_response(json_data)
                    except json.JSONDecodeError:
                        self.send_text_response(data)
                        
        except urllib.error.HTTPError as e:
            error_data = e.read().decode('utf-8') if e.fp else 'HTTP Error'
            self.send_error_response(f'LCU API error: {e.code} - {error_data}')
        except Exception as e:
            self.send_error_response(f'Request failed: {str(e)}')

    def send_json_response(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_text_response(self, text):
        """Send text response"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(text.encode('utf-8'))

    def send_error_response(self, message):
        """Send error response"""
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_data = {'error': message}
        self.wfile.write(json.dumps(error_data).encode('utf-8'))

def main():
    PORT = 8080
    
    print(f"Starting League Arena Champion Tracker server on port {PORT}")
    print(f"Open your browser to: http://localhost:{PORT}")
    print("Make sure League of Legends client is running!")
    print("Press Ctrl+C to stop the server")
    
    with socketserver.TCPServer(("", PORT), LCUProxyHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()
