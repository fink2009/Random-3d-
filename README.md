# Soulsborne-Inspired Open World 3D Game

A seamless open-world 3D action RPG inspired by Elden Ring and the Soulsborne series, built with Three.js.

## ⚠️ IMPORTANT - First-Time Setup Required

**If you see a black screen with only UI visible, you need to run the setup first!**

The game requires Three.js which must be downloaded before running:

```bash
npm install
npm run setup
npm run build
npm run serve
```

Then open `http://localhost:8080` in your browser.

See [Running the Game](#running-the-game) for detailed instructions.

## Features

### Movement & Combat (Fully Implemented)
- **Dodge Rolling System**: Directional dodge rolls with invincibility frames (i-frames), stamina cost, and dust particle effects
- **Stamina-Based Combat**: Light attacks, heavy attacks, and blocking with stamina drain
- **Lock-on Targeting**: Tab key to lock onto enemies and bosses
- **Third-Person Camera**: Smooth camera following with mouse look

### Open World
- Procedurally generated terrain with varied elevation
- Multiple biomes with trees, rocks, and ancient ruins
- Day/night cycle with dynamic lighting
- Atmospheric fog and environmental particles

### Enemy AI
- Patrol and detection behavior
- Multiple enemy types: melee, ranged, and heavy
- Telegraphed attacks with wind-up animations
- Poise/stagger system

### Boss Encounters
- Large boss with unique attack patterns
- Multiple phases with health thresholds
- Boss arena with dramatic health bar

### Progression Systems
- Souls currency dropped on death (retrievable)
- Character stats: Vigor, Endurance, Strength, Dexterity, Intelligence, Faith
- Level up system

### Checkpoints (Sites of Grace)
- Rest to restore health and resources
- Respawn enemies (except bosses)
- Fast travel between discovered checkpoints

### Visual Effects
- Dynamic shadows
- Particle systems (dust, sparks, magic effects)
- Post-processing bloom
- Soulsborne-style HUD

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
| F | Toggle debug info |

## Running the Game

### First-Time Setup

**Required:** The game needs Three.js library which is not included in the repository.

1. Install dependencies and download Three.js:
   ```bash
   npm install
   npm run setup
   ```

### Building and Running

2. Build the game:
   ```bash
   npm run build
   ```

3. Start the development server:
   ```bash
   npm run serve
   ```

4. Open `http://localhost:8080` in a modern browser
5. Click on the game to capture mouse for camera control

### Troubleshooting

**Black screen with only UI visible?**
- This means Three.js is not installed
- Run `npm run setup` to download Three.js
- Verify `lib/three/build/three.module.js` exists after setup
- Then run `npm run build` and `npm run serve`

**404 errors in browser console?**
- Check for `/lib/three/build/three.module.js` 404 errors
- These indicate Three.js was not downloaded
- Solution: Run `npm run setup` then rebuild

### Alternative Setup (Without npm)

If you prefer not to use npm, you can:
1. Download Three.js r160 manually from [GitHub](https://github.com/mrdoob/three.js/releases/tag/r160)
2. Extract to `lib/three/` directory
3. Serve with any HTTP server:
   ```bash
   python3 -m http.server 8080
   ```

## Performance Optimizations (NEW!)

This game now includes comprehensive optimizations for **low-end hardware**, specifically targeting old Chromebooks with integrated graphics.

### Quality Presets

The game automatically detects your device capabilities and applies the appropriate quality preset:

- **Potato Mode** 🥔 - Optimized for old Chromebooks and low-end devices
  - 16x16 terrain segments
  - Only 15 trees, 3 enemies, 10 rocks
  - No shadows, no post-processing
  - MeshBasicMaterial (no lighting calculations)
  - Render scale: 75%
  - Target: 30+ FPS on integrated graphics

- **Low** - For entry-level gaming devices
  - 32x32 terrain segments
  - Minimal shadows and particles
  - MeshLambertMaterial (simple lighting)
  
- **Medium** - Balanced quality and performance
  
- **High** - Maximum visual quality

### Settings Menu

Press **G** or access via Pause Menu to adjust:
- Quality preset
- Render scale (50%/75%/100%)
- Shadows on/off
- Particles on/off
- Post-processing on/off
- Draw distance
- FPS counter display

### Auto-Detection

The game automatically detects:
- Integrated GPUs (Intel HD, Mali, Adreno)
- Low device memory (<4GB)
- Chromebooks
- Mobile devices

And applies **Potato Mode** by default for the smoothest experience.

## Technical Details

- Built with Three.js 0.160.0
- Uses ES modules
- Post-processing with EffectComposer (Bloom)
- Procedural terrain generation
- State machine for player and enemy AI

## Project Structure

```
/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # Soulsborne-style UI
├── js/
│   ├── main.js             # Entry point
│   ├── game/
│   │   ├── Game.js         # Core game loop
│   │   ├── World.js        # Terrain generation
│   │   └── InputManager.js # Input handling
│   ├── entities/
│   │   ├── Player.js       # Player with dodge roll
│   │   ├── Enemy.js        # Enemy AI
│   │   └── Boss.js         # Boss encounters
│   ├── combat/
│   │   └── CombatSystem.js # Combat calculations
│   ├── systems/
│   │   ├── ProgressionSystem.js  # Souls & leveling
│   │   └── CheckpointSystem.js   # Bonfires
│   ├── ui/
│   │   └── HUD.js          # Health bars, souls counter
│   └── utils/
│       └── ParticleSystem.js # Visual effects
└── README.md
```

## License

MIT
