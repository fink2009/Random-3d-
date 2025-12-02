# Performance Testing Guide

This document outlines how to test the Chromebook performance optimizations.

## Quick Test Checklist

### 1. Auto-Detection Test
- Open browser console (F12)
- Look for auto-detection log messages:
  - "GPU detected: [gpu name]"
  - "🥔 Low-end device detected: [reason]" or "✓ Standard/high-end device detected"
  - "Auto-detected recommended preset: [potato/low/medium/high]"
  - "🥔 Potato Mode Activated - Optimized for Chromebook" (if potato mode)

### 2. Visual Verification (Potato Mode)
Should see:
- ✅ Very simple graphics (flat shading)
- ✅ Only ~15 trees visible
- ✅ Only ~3 enemies in the world
- ✅ ~10 rocks scattered around
- ✅ Minimal grass
- ✅ No shadows
- ✅ No bloom/glow effects
- ✅ Thick fog starting at ~30m distance
- ✅ Simple sky background (solid color)
- ✅ FPS counter in top-right corner

### 3. Settings Menu Test
1. Press **G** key (or ESC → Settings)
2. Settings menu should open
3. Verify all controls work:
   - Quality Preset dropdown (Potato/Low/Medium/High)
   - Render Scale dropdown (50%/75%/100%)
   - Shadows checkbox
   - Particles checkbox
   - Post-Processing checkbox
   - Draw Distance dropdown
   - Show FPS checkbox
4. Test changing quality preset - should apply immediately
5. Check "Performance Info" section shows:
   - Current FPS
   - Active Enemies count
   - Visible Objects count

### 4. FPS Counter Test
- Should be visible in top-right corner (if enabled)
- Color coding:
  - 🟢 Green: 50+ FPS (excellent)
  - 🟡 Yellow: 30-49 FPS (acceptable)
  - 🔴 Red: <30 FPS (poor)

### 5. Gameplay Test
On potato mode, verify:
- ✅ Smooth movement (30+ FPS)
- ✅ Combat works (attacks, dodging)
- ✅ Enemy AI functions
- ✅ Particles are disabled (no dust clouds when rolling)
- ✅ Game is fully playable

### 6. Quality Preset Comparison

#### Potato Mode (Target: Old Chromebook)
- Terrain: 16×16 segments
- Trees: 15
- Enemies: 3
- Materials: MeshBasicMaterial (no lighting)
- Shadows: OFF
- Post-processing: OFF
- Particles: OFF
- Render distance: 40m
- Target FPS: 30+

#### Low Mode
- Terrain: 32×32 segments
- Trees: 30
- Enemies: 5
- Materials: MeshLambertMaterial (simple lighting)
- Shadows: OFF
- Post-processing: OFF
- Particles: Minimal (30)
- Render distance: 60m
- Target FPS: 45+

#### Medium Mode
- Terrain: 64×64 segments
- Trees: 80
- Enemies: 10
- Materials: MeshLambertMaterial
- Shadows: ON
- Post-processing: ON
- Particles: ON (100)
- Render distance: 100m
- Target FPS: 60+

#### High Mode
- Terrain: 128×128 segments
- Trees: 150
- Enemies: 15
- Materials: MeshLambertMaterial/Standard
- Shadows: ON (high res)
- Post-processing: ON
- Particles: ON (200)
- Render distance: 200m
- Target FPS: 60+

## Browser Console Commands

Open console (F12) and try:
```javascript
// Check current settings
console.log(game.performanceSettings.getCurrentPreset());
console.log(game.performanceSettings.getSettings());

// Manually change preset
game.applyQualityPreset('potato');
game.applyQualityPreset('low');
game.applyQualityPreset('medium');
game.applyQualityPreset('high');

// Check current FPS
console.log(game.fps);

// Count visible objects
let count = 0;
game.scene.traverse(obj => { if (obj.visible && obj.isMesh) count++; });
console.log('Visible meshes:', count);
```

## Expected Performance

### Old Chromebook (Intel Celeron, Intel HD Graphics, 4GB RAM)
- **Potato Mode**: 30-45 FPS ✅
- **Low Mode**: 20-30 FPS
- **Medium Mode**: 10-20 FPS (not recommended)
- **High Mode**: <10 FPS (not playable)

### Mid-Range Laptop (i5, Integrated Graphics, 8GB RAM)
- **Potato Mode**: 60 FPS
- **Low Mode**: 50-60 FPS ✅
- **Medium Mode**: 40-50 FPS
- **High Mode**: 30-40 FPS

### Gaming PC (Dedicated GPU)
- **Any Mode**: 60+ FPS ✅

## Troubleshooting

### FPS Still Low on Potato Mode
1. Check browser console for errors
2. Try lowering render scale to 50%
3. Make sure no other tabs are open
4. Close other applications
5. Try different browser (Chrome/Edge usually faster than Firefox)

### Settings Not Saving
- Settings are saved to localStorage
- Check browser allows localStorage
- Try manually saving: `game.performanceSettings.saveToLocalStorage()`

### Graphics Look Wrong
- Refresh the page to reload settings
- Check quality preset is actually "potato"
- Look for console errors

## Testing on Different Devices

### Chromebook
1. Open Chrome browser
2. Navigate to game URL
3. Should auto-detect as Chromebook
4. Verify Potato mode is applied automatically

### Desktop (Integrated GPU)
1. Should detect Intel HD/UHD graphics
2. Should apply Potato or Low mode

### Desktop (Dedicated GPU)
1. Should detect as standard device
2. May default to Low or Medium mode for safety

### Mobile
1. Should auto-detect as mobile
2. Should apply Potato mode
3. Touch controls may not work (game designed for keyboard/mouse)

## Performance Metrics to Record

When testing, note:
- Device specs (CPU, GPU, RAM)
- Browser and version
- Quality preset used
- Average FPS
- FPS during combat
- FPS when moving quickly
- Number of visible enemies
- Time to load game
- Any stuttering or lag spikes

## Success Criteria

✅ Game loads successfully
✅ Auto-detection works correctly
✅ Settings menu opens and functions
✅ FPS counter displays
✅ Potato mode achieves 30+ FPS on old Chromebook
✅ All gameplay mechanics work in Potato mode
✅ Settings persist after page reload
✅ Quality presets apply correctly
✅ No JavaScript errors in console
