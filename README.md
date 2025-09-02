# 🏆 League Arena Champion Tracker

A browser extension that tracks your League of Legends Arena Champion challenge progress by connecting directly to your local League client.

## 🌐 Live Website

**Visit the live website:** [https://yourusername.github.io/leaguePickerWeb](https://yourusername.github.io/leaguePickerWeb)

The website provides:
- 📦 **Download the extension** (ZIP file)
- 📋 **Step-by-step installation guide**
- 🎮 **Usage instructions**
- ✨ **Feature overview**

## 🚀 Quick Installation

1. **Visit the website** and download the extension ZIP
2. **Extract the files** to a folder on your computer
3. **Open Chrome** and go to `chrome://extensions/`
4. **Enable "Developer mode"** (toggle in top right)
5. **Click "Load unpacked"** and select the extracted folder
6. **Extension is installed!** 🎉

## 🎮 How to Use

1. **Make sure League of Legends client is running**
2. **Click the extension icon** in your browser toolbar
3. **Click "Upload Lockfile"** and select your lockfile from:
   `C:\Riot Games\League of Legends\lockfile`
4. **Click "Load Challenge"** to see your Arena Champion progress
5. **View your completed champions** with names and images!

## ✨ Features

- **Direct LCU Access**: Connects to your local League client
- **Real-time Data**: Shows live challenge progress
- **Champion Images**: Displays champion portraits from local game data
- **Progress Tracking**: Visual progress bar and level badges
- **No Server Required**: Works entirely in the browser
- **Secure**: All data stays on your local machine

## 🔧 Technical Details

- **Manifest V3**: Uses latest Chrome extension standards
- **CORS Bypass**: Extension permissions allow localhost access
- **File API**: Reads lockfile directly from user's file system
- **HTTPS Support**: Works with League's HTTPS LCU API

## 📁 Project Structure

```
├── index.html              # GitHub Pages website
├── manifest.json           # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Extension functionality
├── package-extension.js   # Build script
├── .github/workflows/     # GitHub Actions for deployment
└── README.md              # This file
```

## 🎯 Benefits

- **No Python server needed**
- **No complex setup**
- **Works from any browser**
- **One-time installation**
- **Always accessible via extension icon**
- **Beautiful GitHub Pages website**

Perfect for League players who want to track their Arena Champion progress without any complex setup! 🏆

## 🚀 Deployment

This project automatically deploys to GitHub Pages when you push to the main branch. The website includes:

- Download links for the extension
- Installation instructions
- Usage guide
- Feature overview

Just push your changes and the website will be live at `https://yourusername.github.io/leaguePickerWeb`!
