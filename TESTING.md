# Testing Guide for Build Toolchain and Runtime Monitoring PR

This document describes how to test all the features added in this PR.

## Prerequisites

1. Node.js 14+ installed
2. Modern web browser (Chrome recommended)
3. Terminal/command line access

## Installation

```bash
# Clone the repository
git clone https://github.com/fink2009/Random-3d-.git
cd Random-3d-

# Checkout the PR branch
git checkout copilot/add-local-build-and-serve-toolchain

# Install dependencies
npm install
```

## Test 1: Build System

### Test the build script

```bash
npm run build
```

**Expected Result:**
- Console shows: "Building distribution..."
- dist/ directory is created
- dist/ contains: index.html, sw.js, css/, js/, src/
- Console shows: "✓ Build complete! Output in dist/"
- No errors

**Verification:**
```bash
ls -la dist/
```

### Test the serve script

```bash
npm run serve
```

**Expected Result:**
- Console shows: "🚀 Server running at http://localhost:8080/"
- Server serves files from dist/
- Server doesn't crash

**Verification:**
- Server runs without errors
- Press Ctrl+C to stop (should exit cleanly)

## Test 2: Static Analysis Tool

```bash
npm run check:runtime
```

**Expected Result:**
- Console shows: "🔍 Static Runtime Checker"
- Scans all .js files in js/ directory
- Reports any warnings or info items found
- Shows summary at the end
- Exit code 0 if no warnings (only info items are okay)

**Current Expected Output:**
- 24 files scanned
- 0 warnings
- 2 info items (console.log usage in Game.js and PerformanceSettings.js)

## Test 3: Service Worker

### Start the server

```bash
npm run serve
```

### Open browser

1. Open Chrome
2. Navigate to http://localhost:8080
3. Open DevTools (F12)
4. Go to Application tab → Service Workers

**Expected Result:**
- Service worker "sw.js" is registered
- Status shows "activated and is running"
- Console shows: "[SW] Service Worker registered"

### Test caching

1. With DevTools Network tab open
2. Reload the page (F5)
3. Check network requests

**Expected Result:**
- Some requests show "(ServiceWorker)" as source
- Core assets (index.html, sw.js, css/styles.css) are cached

### Test offline capability

1. In DevTools Network tab, enable "Offline" mode
2. Reload the page

**Expected Result:**
- Page still loads (from cache)
- Some assets load successfully from service worker cache

## Test 4: Runtime Error Monitor

### Basic functionality

1. Start server: `npm run serve`
2. Open http://localhost:8080 in Chrome
3. Look at the top-right corner of the game screen

**Expected Result:**
- A dark overlay appears with "🔍 Runtime Monitor"
- Shows "✓ No errors detected" (or error/warning counts if any)
- Has a "Download Logs" button
- Has an X button to close

### Test localStorage control

Open browser console and run:

```javascript
// Disable runtime checks
localStorage.setItem('enableRuntimeChecks', 'false');
location.reload();
```

**Expected Result:**
- After reload, no error monitor overlay appears
- Console doesn't show "[Runtime] Initializing runtime monitors..."

Re-enable:

```javascript
// Enable runtime checks
localStorage.setItem('enableRuntimeChecks', 'true');
location.reload();
```

**Expected Result:**
- Error monitor overlay reappears

### Test error capture

With runtime checks enabled, trigger an error in console:

```javascript
// Trigger an error
throw new Error("Test error for monitoring");
```

**Expected Result:**
- Error monitor overlay updates
- Shows "⚠ 1 error(s)"
- Shows error message preview

### Test download logs

1. Click the "Download Logs" button in the error monitor

**Expected Result:**
- A JSON file downloads (error-logs-[timestamp].json)
- File contains error data in JSON format
- File includes errors, warnings, timestamp, and userAgent

## Test 5: Runtime Code Checker

### Basic functionality

1. Start server: `npm run serve`
2. Open http://localhost:8080 in Chrome
3. Open browser console (F12)
4. Wait 2-3 seconds for initial scan

**Expected Result:**
- Console shows: "[CodeChecker] Initialized"
- Console shows: "[CodeChecker] Starting scan..."
- Console shows: "[CodeChecker] Scan complete: X warnings, Y info"
- If warnings/info found, they appear in error monitor overlay

### Test periodic scanning

1. Keep the page open
2. Wait 30 seconds
3. Check console

**Expected Result:**
- Another scan runs automatically
- Console shows: "[CodeChecker] Starting scan..." again
- Periodic scans continue every 30 seconds

### Test scan results

With the game running, check if warnings appear:

**Expected Result:**
- No critical warnings (would show in red)
- Possible info items about console.log usage
- Code checker findings appear in error monitor as warnings

## Test 6: Potato Mode Integration

### Test forcePotato localStorage

Open browser console and run:

```javascript
// Force potato mode
localStorage.setItem('forcePotato', 'true');
location.reload();
```

**Expected Result:**
- Console shows: "[Runtime] forcePotato enabled - will use potato mode"
- Game applies potato mode settings (low quality, simplified graphics)
- Console shows: "🥔 Potato Mode Activated - Optimized for Chromebook"

Disable:

```javascript
// Disable forced potato mode
localStorage.removeItem('forcePotato');
location.reload();
```

### Test auto-detection

On a regular desktop/laptop:

**Expected Result:**
- Console shows device detection logs
- May or may not enable potato mode based on hardware
- Console shows detected GPU, memory, etc.

## Test 7: Chromebook Documentation

### Verify documentation completeness

Open README.chromebook.md and verify:

**Expected Content:**
- [ ] Instructions for users with Linux enabled
- [ ] Instructions for users without Linux access
- [ ] "Web Server for Chrome" extension instructions
- [ ] Building on another machine instructions
- [ ] Performance tips section
- [ ] Troubleshooting section
- [ ] Controls reference
- [ ] Support information

## Test 8: Integration Testing

### Full integration test

1. Build: `npm run build`
2. Serve: `npm run serve`
3. Open: http://localhost:8080
4. Wait for game to load

**Expected Result:**
- Game loads without errors
- Three.js loads successfully (check console for errors)
- Error monitor overlay appears in top-right
- Service worker registers successfully
- Code checker runs initial scan
- Game is playable
- No console errors related to new features

### Test game functionality

1. Click on game to capture pointer
2. Move with WASD
3. Look around with mouse
4. Press G for settings menu

**Expected Result:**
- All existing game functionality works
- No regressions introduced by new features
- Settings menu opens and works

## Common Issues and Solutions

### Issue: "Module not found" errors

**Solution:** Make sure Three.js is available. The game expects Three.js via import maps. You may need to install it or provide it via CDN.

### Issue: Service worker not registering

**Solution:** 
- Check that you're using HTTP/HTTPS (not file://)
- Clear browser cache and service workers
- Check browser console for errors

### Issue: Error monitor not appearing

**Solution:**
- Check localStorage: `localStorage.getItem('enableRuntimeChecks')`
- Look for console errors in the error-monitor.js module
- Verify src/runtime/ files are being served correctly

### Issue: Build fails

**Solution:**
- Check Node.js version: `node --version` (should be 14+)
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for file permission issues

## Performance Verification

### Check runtime overhead

1. Open game with runtime checks enabled
2. Open DevTools Performance tab
3. Record for 10 seconds
4. Check performance impact

**Expected Result:**
- Code checker runs asynchronously (should not block main thread)
- Error monitor overlay has minimal rendering cost
- Game FPS should not be significantly affected (<5% difference)

### Compare with checks disabled

1. Disable runtime checks: `localStorage.setItem('enableRuntimeChecks', 'false')`
2. Reload and measure performance again
3. Compare results

**Expected Result:**
- Performance difference should be negligible
- Runtime monitoring is designed to be non-blocking

## Reporting Issues

If you find any issues during testing:

1. Note the exact steps to reproduce
2. Capture any console errors
3. Take screenshots if relevant
4. Check browser and OS versions
5. Report on GitHub issues with all details

## Success Criteria

All tests pass if:

- ✅ Build creates dist/ directory successfully
- ✅ Serve starts local server on port 8080
- ✅ Static checker runs and reports results
- ✅ Service worker registers and caches assets
- ✅ Error monitor overlay appears and functions
- ✅ Code checker scans files and reports findings
- ✅ Potato mode can be forced via localStorage
- ✅ Documentation is comprehensive and accurate
- ✅ Game functionality is not affected
- ✅ No regressions in existing features
- ✅ Code review passes
- ✅ Security scan (CodeQL) passes

## Additional Notes

- Runtime checks are enabled by default but can be disabled
- Service worker works in production builds only (requires HTTP/HTTPS)
- Code checker scans run every 30 seconds by default
- Error monitor saves logs locally via download button
- All features are designed to be non-blocking and asynchronous
