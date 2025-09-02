# 🏆 League Arena Champion Tracker

A single-page web application that tracks your League of Legends Arena Champion challenge progress by connecting to the League Client Update (LCU) API.

## ✨ Features

- **Real-time Progress**: Shows your current Arena Champion challenge progress
- **Champion Grid**: Displays all completed champions with names and images
- **Local Data**: Uses local game data for champion images (no external CDN)
- **Beautiful UI**: Modern, responsive design with League of Legends styling
- **Single Page**: Everything runs in one HTML file

## 🚀 Quick Start

### Option 1: Python Server (Recommended)

1. **Make sure League of Legends client is running**

2. **Run the Python server:**
   ```bash
   python simple_server.py
   ```

3. **Open your browser to:**
   ```
   http://localhost:8080
   ```

4. **Click "Load Arena Challenge" to see your progress!**

### Option 2: Direct HTML (Limited)

1. **Open `index.html` directly in your browser**
2. **Note**: This won't work due to CORS restrictions, but you can see the UI

## 📋 Requirements

- **League of Legends client** must be running
- **Python 3.6+** (for the server option)
- **Modern web browser** (Chrome, Firefox, Edge, Safari)

## 🔧 How It Works

1. **Lockfile Reading**: The server reads the League client lockfile to get connection details
2. **LCU API**: Makes requests to the local League Client Update API
3. **Data Processing**: Fetches challenge data and champion information
4. **Display**: Shows your Arena Champion progress with champion names and images

## 📁 Files

- `index.html` - The main web application
- `simple_server.py` - Python server that handles LCU API requests
- `README.md` - This file

## 🎮 What You'll See

- **Challenge Progress**: Current level (Iron, Bronze, Silver, Gold, Platinum, Diamond, Master, etc.)
- **Progress Bar**: Visual representation of your completion
- **Champion Grid**: All champions you've completed the challenge with
- **Champion Images**: Local game data images for each champion
- **Champion Names**: Proper names instead of just IDs

## 🛠️ Troubleshooting

### "Lockfile not found"
- Make sure League of Legends client is running
- Check that the client is fully loaded (not just the launcher)

### "CORS errors" or "Failed to fetch"
- Use the Python server instead of opening HTML directly
- Make sure the server is running on port 8080

### "Arena Champion challenge not found"
- Make sure you have the Arena Champion challenge unlocked
- Try playing an Arena game first to generate challenge data

### Images not loading
- This is normal for some champions - the app will show champion names as fallback
- Make sure League client is running and has loaded all game data

## 🔒 Security

- All data stays local on your computer
- No external servers or data collection
- Uses League's official local API
- No account credentials required

## 📝 Notes

- The app works by reading the League client's lockfile and making requests to the local LCU API
- Champion images are served from your local game files
- The Arena Champion challenge tracks champions you've won Arena games with
- Progress updates in real-time as you complete more champions

Enjoy tracking your Arena Champion progress! 🎮