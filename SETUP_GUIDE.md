# Setup Guide - Fixing Black Screen Issue

## Problem
The game shows UI elements but displays a black screen with frozen gameplay.

## Root Cause
The game requires the Three.js library to be downloaded before it can run. The library is not included in the repository to keep it lightweight and must be installed during setup.

## Solution

### Quick Fix (Recommended)
Run these commands in order:

```bash
# 1. Install npm dependencies
npm install

# 2. Download Three.js library
npm run setup

# 3. Build the game
npm run build

# 4. Start the development server
npm run serve
```

Then open http://localhost:8080 in your browser.

### What Each Command Does

1. **`npm install`** - Installs build dependencies (esbuild, mime)
2. **`npm run setup`** - Downloads Three.js r160 to the `lib/` directory
3. **`npm run build`** - Copies all game files to the `dist/` directory for serving
4. **`npm run serve`** - Starts a local web server on port 8080

### Alternative Setup (Without npm)

If you don't want to use npm:

1. Download Three.js r160 manually from [GitHub](https://github.com/mrdoob/three.js/releases/tag/r160)
2. Extract the archive to `lib/three/` (so that `lib/three/build/three.module.js` exists)
3. Serve the repository with any HTTP server:
   ```bash
   python3 -m http.server 8080
   ```

### Verification

After setup, verify the following files exist:
- `lib/three/build/three.module.js` ✓
- `lib/three/examples/jsm/` ✓
- `dist/index.html` ✓

### Troubleshooting

**Q: The game still shows a black screen after setup**
- Verify `lib/three/build/three.module.js` exists
- Check browser console for errors (F12)
- Try clearing browser cache and reloading

**Q: Setup script fails on Windows**
- The setup script requires bash, wget, and tar
- Use Git Bash, WSL, or download Three.js manually (see alternative setup above)

**Q: "Cannot find module 'three'" error**
- Run `npm run setup` to download Three.js
- Verify the `lib/` directory exists

**Q: Game runs at very low FPS**
- The game auto-detects hardware and applies appropriate settings
- On low-end devices, "Potato Mode" is applied automatically
- Press **G** to open settings and adjust quality if needed

## Performance Notes

The game includes automatic performance optimization:
- **Potato Mode** 🥔 - For Chromebooks and integrated GPUs (16x16 terrain, 3 enemies, no shadows)
- **Low** - For entry-level devices (32x32 terrain, minimal effects)
- **Medium** - Balanced (default for dedicated GPUs)
- **High** - Maximum quality (powerful systems)

You can manually adjust settings by pressing **G** in-game.

## Browser Requirements

- Modern browser with WebGL support (Chrome, Firefox, Edge, Safari)
- JavaScript enabled
- Pop-ups allowed (for pointer lock)

## Development Workflow

```bash
# Make changes to code
npm run build    # Rebuild dist/
npm run serve    # Test changes at http://localhost:8080
```

Note: The `lib/` and `dist/` directories are in `.gitignore` and should not be committed to the repository.
