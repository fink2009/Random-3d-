# Running Soulsborne 3D on Chromebooks

This guide explains how to run the Soulsborne 3D game locally on a Chromebook, including instructions for users who cannot enable Linux.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Option 1: Using Linux (Beta) - Recommended](#option-1-using-linux-beta---recommended)
- [Option 2: Without Linux Access](#option-2-without-linux-access)
- [Building on Another Machine](#building-on-another-machine)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- A Chromebook with Chrome OS
- An internet connection (for initial setup)
- At least 2GB of free storage space

## Option 1: Using Linux (Beta) - Recommended

If your Chromebook supports Linux (Beta), this is the easiest method:

### 1. Enable Linux (Beta)

1. Open **Settings**
2. Click on **Advanced** → **Developers**
3. Click **Turn On** next to Linux development environment
4. Follow the on-screen instructions (this may take 10-15 minutes)

### 2. Install Node.js

Open the Linux terminal and run:

```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install -y nodejs npm

# Verify installation
node --version
npm --version
```

### 3. Clone or Download the Repository

```bash
# If you have git
git clone https://github.com/fink2009/Random-3d-.git
cd Random-3d-

# Or download and extract the ZIP file from GitHub
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Build the Game

```bash
npm run build
```

This creates an optimized bundle in the `dist/` directory.

### 6. Run the Local Server

```bash
npm run serve
```

The game will be available at `http://localhost:8080`

### 7. Open in Chrome

Open Chrome and navigate to `http://localhost:8080`

The game will automatically detect your Chromebook and enable "Potato Mode" for optimal performance!

## Option 2: Without Linux Access

If you cannot enable Linux on your Chromebook, you have several options:

### Method A: Using "Web Server for Chrome" Extension

1. **Install the Extension**
   - Open Chrome Web Store
   - Search for "Web Server for Chrome"
   - Install the extension

2. **Download the Game**
   - Download this repository as a ZIP file
   - Extract it to your Downloads folder or any accessible location
   - If you have the pre-built `dist/` folder, use that. Otherwise, see [Building on Another Machine](#building-on-another-machine)

3. **Start the Web Server**
   - Launch "Web Server for Chrome" from your Chrome apps
   - Click "Choose Folder" and select the `dist/` folder (or the root folder if you don't have dist/)
   - Make sure the server is started (should show a web address like `http://127.0.0.1:8887`)

4. **Open the Game**
   - Click on the web address shown in the Web Server
   - The game should load!

### Method B: Using Chrome's File Protocol (Limited)

**Note:** Some features like ES modules may not work with `file://` protocol. This is a fallback option.

1. **Download and Extract**
   - Download the repository as a ZIP
   - Extract to your Downloads or a convenient location

2. **Open index.html**
   - Navigate to the extracted folder
   - Right-click `index.html`
   - Select "Open with" → "Chrome"

**Limitations:** 
- ES modules may be blocked by CORS policy
- Service worker will not work
- Best to use Method A above instead

### Method C: Using Python Simple Server (if Python is available)

Some Chromebooks with Android support can run Python via Termux or similar apps:

```bash
# In the game directory
python3 -m http.server 8080
```

Then navigate to `http://localhost:8080`

## Building on Another Machine

If you can't build on your Chromebook, build on another computer and transfer the files:

### On Your Build Machine (Windows, Mac, or Linux):

1. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org)

2. **Clone the Repository**
   ```bash
   git clone https://github.com/fink2009/Random-3d-.git
   cd Random-3d-
   ```

3. **Install and Build**
   ```bash
   npm install
   npm run build
   ```

4. **Package the dist/ Folder**
   - The `dist/` folder contains everything you need
   - Compress it as a ZIP file

### On Your Chromebook:

1. **Transfer the ZIP**
   - Use Google Drive, USB drive, or email to transfer the ZIP file
   - Extract it on your Chromebook

2. **Serve the Files**
   - Use "Web Server for Chrome" extension (see Method A above)
   - Point it to the extracted `dist/` folder

## Features Optimized for Chromebooks

The game automatically detects Chromebook hardware and enables optimizations:

### Potato Mode 🥔
When running on a Chromebook or low-end device, the game automatically:
- Reduces terrain complexity (16x16 segments)
- Limits enemies, trees, and objects
- Disables shadows and post-processing
- Uses simplified materials (MeshBasicMaterial)
- Sets render scale to 75%
- Targets 30+ FPS on integrated graphics

### Manual Potato Mode
You can force Potato Mode on any device:
1. Open browser console (F12)
2. Type: `localStorage.setItem('forcePotato', 'true')`
3. Refresh the page

### Runtime Monitoring
The game includes a runtime error monitor that appears in the top-right corner:
- Shows error and warning counts
- Displays the last error message
- Provides a "Download Logs" button for debugging

To enable runtime checks:
```javascript
localStorage.setItem('enableRuntimeChecks', 'true')
```

Then refresh the page.

## Performance Tips

1. **Close Other Tabs**
   - Chrome tabs consume memory
   - Close unnecessary tabs before playing

2. **Use Potato Mode**
   - It's automatically enabled, but you can force it as shown above

3. **Disable Extensions**
   - Some extensions can slow down games
   - Try disabling them temporarily

4. **Update Chrome OS**
   - Keep your system updated for best performance

5. **Check Settings**
   - Press 'G' in-game to access the settings menu
   - Adjust quality settings if needed

## Troubleshooting

### Game Won't Load
- **Check Console**: Press F12 to open Developer Tools and check for errors
- **Clear Cache**: Clear browser cache and reload
- **Try Different Server**: If using an extension, try a different serving method

### Poor Performance
- Make sure Potato Mode is enabled (should be automatic)
- Close other applications and tabs
- Check if hardware acceleration is enabled in Chrome settings

### Service Worker Issues
- Service workers don't work with `file://` protocol
- Use a local server (Web Server for Chrome extension)
- Clear service workers: Chrome Settings → Privacy and security → Site settings → View permissions and data stored across sites → localhost → Clear data

### Can't Enable Linux
- Check if your Chromebook supports Linux (Beta)
- Some older or education-managed Chromebooks may not support it
- Use Option 2 (Without Linux Access) instead

### Build Fails
- Make sure you have Node.js version 14 or higher: `node --version`
- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

## Additional Resources

- [Main README](README.md) - Game features and controls
- [Performance Testing Guide](PERFORMANCE_TESTING.md) - Detailed performance information
- [GitHub Repository](https://github.com/fink2009/Random-3d-) - Source code and issues

## Controls

| Key | Action |
|-----|--------|
| WASD | Movement |
| Mouse | Camera look |
| Space | Dodge Roll |
| Left Click | Light Attack |
| Shift + Left Click | Heavy Attack |
| Right Click | Block |
| Shift (hold) | Sprint |
| Tab | Lock-on toggle |
| E | Interact |
| G | Settings Menu |
| Escape | Pause menu |

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section above
2. Open an issue on [GitHub](https://github.com/fink2009/Random-3d-/issues)
3. Include:
   - Your Chromebook model
   - Chrome OS version
   - Error messages from the console (F12)
   - Screenshots if applicable

## License

MIT - See main repository for details
