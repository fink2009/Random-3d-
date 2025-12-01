# Soulsborne-Inspired Open World 3D Game

A seamless open-world 3D action RPG inspired by Elden Ring and the Soulsborne series, built with Three.js.

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
| Escape | Pause menu |
| F | Toggle debug info |

## Running the Game

1. Serve the files with any HTTP server (required for ES modules):
   ```bash
   python3 -m http.server 8080
   # or
   npx serve
   ```
2. Open `http://localhost:8080` in a modern browser
3. Click on the game to capture mouse for camera control

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
