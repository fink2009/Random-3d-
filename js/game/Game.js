/**
 * Game.js - Core Game Class
 * Manages the game loop, rendering, and all game systems
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { InputManager } from './InputManager.js';
import { World } from './World.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Wolf, StoneGolem, DarkKnight, CrystalLizard } from '../entities/EnemyTypes.js';
import { DragonBoss } from '../entities/DragonBoss.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { HUD } from '../ui/HUD.js';
import { ParticleSystem } from '../utils/ParticleSystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { CheckpointSystem } from '../systems/CheckpointSystem.js';
import { MagicSystem } from '../systems/MagicSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { VisualEffects } from '../systems/VisualEffects.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.elapsedTime = 0;
        
        this.isPaused = false;
        this.isGameOver = false;
        
        // Game systems
        this.inputManager = null;
        this.world = null;
        this.player = null;
        this.combatSystem = null;
        this.hud = null;
        this.particleSystem = null;
        this.progressionSystem = null;
        this.checkpointSystem = null;
        this.magicSystem = null;
        this.weaponSystem = null;
        this.inventorySystem = null;
        this.visualEffects = null;
        this.npcSystem = null;
        this.saveSystem = null;
        
        // Entities
        this.enemies = [];
        this.bosses = [];
        this.projectiles = [];
        
        // Day/night cycle
        this.dayTime = 0.3; // 0 = midnight, 0.5 = noon
        this.dayDuration = 600; // seconds for full day
        
        // Performance
        this.frameCount = 0;
        this.fps = 0;
        this.lastFpsUpdate = 0;
        
        // Quality settings for performance optimization
        this.qualitySettings = {
            low: {
                shadowMapSize: 512,
                shadowsEnabled: false,
                particleCount: 50,
                drawDistance: 100,
                postProcessing: false,
                terrainDetail: 64,
                pixelRatio: 1,
                environmentParticles: 100,
                maxFireflies: 20
            },
            medium: {
                shadowMapSize: 1024,
                shadowsEnabled: true,
                particleCount: 100,
                drawDistance: 200,
                postProcessing: true,
                terrainDetail: 128,
                pixelRatio: 1.5,
                environmentParticles: 250,
                maxFireflies: 50
            },
            high: {
                shadowMapSize: 2048,
                shadowsEnabled: true,
                particleCount: 200,
                drawDistance: 400,
                postProcessing: true,
                terrainDetail: 128,
                pixelRatio: 2,
                environmentParticles: 500,
                maxFireflies: 100
            }
        };
        
        // Current quality level
        this.currentQuality = 'medium';
        this.settings = this.qualitySettings[this.currentQuality];
    }
    
    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupLighting();
        this.setupPostProcessing();
        this.setupSystems();
        this.setupEventListeners();
        this.spawnEnemies();
        
        // Start the game loop
        this.animate();
        
        // Lock pointer for first-person camera control
        this.canvas.addEventListener('click', () => {
            if (!this.isPaused) {
                this.canvas.requestPointerLock();
            }
        });
    }
    
    setupRenderer() {
        // Disable antialias in WebGL for performance (use post-process AA instead)
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Cap pixel ratio based on quality settings for performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.pixelRatio));
        
        // Shadow settings based on quality
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
        if (this.settings.shadowsEnabled) {
            // Use cheaper shadow map type for better performance
            this.renderer.shadowMap.type = THREE.PCFShadowMap;
        }
        
        // Use simpler tone mapping for performance
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Disable auto clear for manual render pass control
        this.renderer.autoClear = true;
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
    }
    
    setupLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(this.ambientLight);
        
        // Directional light (sun/moon) with optimized shadow settings
        this.directionalLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        this.directionalLight.position.set(50, 100, 50);
        
        // Only set up shadows if enabled in settings
        if (this.settings.shadowsEnabled) {
            this.directionalLight.castShadow = true;
            // Use quality-based shadow map size
            this.directionalLight.shadow.mapSize.width = this.settings.shadowMapSize;
            this.directionalLight.shadow.mapSize.height = this.settings.shadowMapSize;
            // Tighten shadow camera frustum for better shadow quality at lower resolution
            this.directionalLight.shadow.camera.near = 1;
            this.directionalLight.shadow.camera.far = 150;
            this.directionalLight.shadow.camera.left = -60;
            this.directionalLight.shadow.camera.right = 60;
            this.directionalLight.shadow.camera.top = 60;
            this.directionalLight.shadow.camera.bottom = -60;
            // Reduce shadow bias for less artifacts
            this.directionalLight.shadow.bias = -0.001;
        } else {
            this.directionalLight.castShadow = false;
        }
        
        this.scene.add(this.directionalLight);
        
        // Hemisphere light for natural sky lighting
        this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362312, 0.5);
        this.scene.add(this.hemisphereLight);
    }
    
    setupPostProcessing() {
        // Only set up post-processing if enabled in settings
        if (!this.settings.postProcessing) {
            this.composer = null;
            return;
        }
        
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom effect for light sources - reduced settings for performance
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.3,  // strength (reduced from 0.5)
            0.3,  // radius (reduced from 0.4)
            0.9   // threshold (increased from 0.85 - less bloom)
        );
        this.composer.addPass(bloomPass);
    }
    
    setupSystems() {
        // Input management
        this.inputManager = new InputManager(this);
        
        // World/terrain
        this.world = new World(this);
        this.world.generate();
        
        // Particle system
        this.particleSystem = new ParticleSystem(this);
        
        // Player
        this.player = new Player(this);
        this.player.init();
        
        // Combat system
        this.combatSystem = new CombatSystem(this);
        
        // Progression system
        this.progressionSystem = new ProgressionSystem(this);
        
        // Checkpoint system
        this.checkpointSystem = new CheckpointSystem(this);
        
        // Magic system
        this.magicSystem = new MagicSystem(this);
        
        // Weapon system
        this.weaponSystem = new WeaponSystem(this);
        this.weaponSystem.updatePlayerWeaponMesh();
        
        // Inventory system
        this.inventorySystem = new InventorySystem(this);
        this.inventorySystem.initializeDefaultItems();
        
        // Visual effects (enhanced lighting, weather, etc.)
        this.visualEffects = new VisualEffects(this);
        
        // NPC system
        this.npcSystem = new NPCSystem(this);
        
        // Save system
        this.saveSystem = new SaveSystem(this);
        
        // Try to load saved game
        if (this.saveSystem.hasSaveData()) {
            this.saveSystem.loadGame();
        }
        
        // HUD
        this.hud = new HUD(this);
    }
    
    spawnEnemies() {
        // Spawn basic enemies around the world
        const spawnPoints = [
            { x: 20, z: 20, type: 'melee' },
            { x: -25, z: 15, type: 'melee' },
            { x: 30, z: -10, type: 'ranged' },
            { x: -20, z: -30, type: 'melee' },
            { x: 40, z: 40, type: 'heavy' },
            { x: -35, z: 25, type: 'melee' },
            { x: 15, z: -40, type: 'ranged' },
            { x: -40, z: -20, type: 'heavy' },
        ];
        
        spawnPoints.forEach(spawn => {
            const enemy = new Enemy(this, spawn.type);
            const y = this.world.getHeightAt(spawn.x, spawn.z);
            enemy.init(spawn.x, y, spawn.z);
            this.enemies.push(enemy);
        });
        
        // Spawn wolves (pack creatures)
        const wolfSpawns = [
            { x: 45, z: 25 },
            { x: 48, z: 28 },
            { x: 42, z: 30 },
            { x: -50, z: -40 },
            { x: -53, z: -38 },
        ];
        
        wolfSpawns.forEach(spawn => {
            const wolf = new Wolf(this);
            const y = this.world.getHeightAt(spawn.x, spawn.z);
            wolf.init(spawn.x, y, spawn.z);
            this.enemies.push(wolf);
        });
        
        // Spawn Stone Golems
        const golemSpawns = [
            { x: 60, z: -50 },
            { x: -70, z: 60 },
        ];
        
        golemSpawns.forEach(spawn => {
            const golem = new StoneGolem(this);
            const y = this.world.getHeightAt(spawn.x, spawn.z);
            golem.init(spawn.x, y, spawn.z);
            this.enemies.push(golem);
        });
        
        // Spawn Dark Knights (elite enemies)
        const knightSpawns = [
            { x: 65, z: 65 },
            { x: -60, z: -55 },
        ];
        
        knightSpawns.forEach(spawn => {
            const knight = new DarkKnight(this);
            const y = this.world.getHeightAt(spawn.x, spawn.z);
            knight.init(spawn.x, y, spawn.z);
            this.enemies.push(knight);
        });
        
        // Spawn Crystal Lizards (rare material drops)
        const lizardSpawns = [
            { x: 35, z: -45 },
            { x: -30, z: 50 },
        ];
        
        lizardSpawns.forEach(spawn => {
            const lizard = new CrystalLizard(this);
            const y = this.world.getHeightAt(spawn.x, spawn.z);
            lizard.init(spawn.x, y, spawn.z);
            this.enemies.push(lizard);
        });
        
        // Spawn Boss 1: Corrupted Knight
        const boss = new Boss(this, 'Corrupted Knight');
        const bossY = this.world.getHeightAt(80, 80);
        boss.init(80, bossY, 80);
        this.bosses.push(boss);
        
        // Spawn Boss 2: Ancient Dragon (in a different area)
        const dragon = new DragonBoss(this, 'Ancient Dragon');
        const dragonY = this.world.getHeightAt(-80, -80);
        dragon.init(-80, dragonY, -80);
        this.bosses.push(dragon);
    }
    
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onResize());
        
        // Pause menu buttons
        document.getElementById('resume-btn')?.addEventListener('click', () => this.resume());
        document.getElementById('quit-btn')?.addEventListener('click', () => this.quit());
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.deltaTime = Math.min(this.clock.getDelta(), 0.1); // Cap delta time
        this.elapsedTime = this.clock.getElapsedTime();
        
        // FPS counter
        this.frameCount++;
        if (this.elapsedTime - this.lastFpsUpdate >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = this.elapsedTime;
        }
        
        if (!this.isPaused && !this.isGameOver) {
            this.update();
        }
        
        this.render();
    }
    
    update() {
        // Staggered updates for performance optimization
        const frame = this.frameCount;
        
        // Update player every frame (critical)
        if (this.player) {
            this.player.update(this.deltaTime);
        }
        
        // Update combat system every frame (critical for responsiveness)
        this.combatSystem.update(this.deltaTime);
        
        // Update enemies with distance-based staggering
        this.updateEnemies(this.deltaTime);
        
        // Update bosses every frame (important for boss fights)
        this.bosses.forEach(boss => {
            if (boss.isAlive) {
                boss.update(this.deltaTime);
            }
        });
        
        // Update particles every frame
        this.particleSystem.update(this.deltaTime);
        
        // Update visual effects every 2nd frame
        if (frame % 2 === 0 && this.visualEffects) {
            this.visualEffects.update(this.deltaTime * 2);
        }
        
        // Update magic system every 2nd frame
        if (frame % 2 === 1 && this.magicSystem) {
            this.magicSystem.update(this.deltaTime * 2);
        }
        
        // Update inventory system every 5th frame
        if (frame % 5 === 0 && this.inventorySystem) {
            this.inventorySystem.update(this.deltaTime * 5);
        }
        
        // Update NPC system every 3rd frame
        if (frame % 3 === 0 && this.npcSystem) {
            this.npcSystem.update(this.deltaTime * 3);
        }
        
        // Update save system every 10th frame
        if (frame % 10 === 0 && this.saveSystem) {
            this.saveSystem.update(this.deltaTime * 10);
        }
        
        // Update HUD every 3rd frame
        if (frame % 3 === 0) {
            this.hud.update();
        }
        
        // Update checkpoints every 5th frame
        if (frame % 5 === 0) {
            this.checkpointSystem.update(this.deltaTime * 5);
        }
        
        // Update progression system every 2nd frame
        if (frame % 2 === 0) {
            this.progressionSystem.update(this.deltaTime * 2);
        }
        
        // Clean up dead entities every 10th frame
        if (frame % 10 === 0) {
            this.cleanupEntities();
        }
    }
    
    updateEnemies(deltaTime) {
        const playerPos = this.player ? this.player.position : null;
        if (!playerPos) return;
        
        const nearDistance = 30;
        const farDistance = 60;
        
        this.enemies.forEach((enemy, index) => {
            if (!enemy.isAlive) return;
            
            const distance = enemy.position.distanceTo(playerPos);
            
            if (distance < nearDistance) {
                // Update nearby enemies every frame
                enemy.update(deltaTime);
            } else if (distance < farDistance) {
                // Update mid-range enemies every 2nd frame
                // Use regular deltaTime to avoid choppy movement
                if ((this.frameCount + index) % 2 === 0) {
                    enemy.update(deltaTime);
                }
            } else {
                // Update distant enemies every 4th frame
                // Distant enemies don't need smooth updates
                if ((this.frameCount + index) % 4 === 0) {
                    enemy.update(deltaTime);
                }
            }
        });
    }
    
    updateDayNightCycle() {
        // Progress time
        this.dayTime += this.deltaTime / this.dayDuration;
        if (this.dayTime >= 1) this.dayTime -= 1;
        
        // Calculate sun position
        const sunAngle = this.dayTime * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        const sunX = Math.cos(sunAngle) * 100;
        
        this.directionalLight.position.set(sunX, sunHeight * 100 + 20, 50);
        
        // Adjust lighting based on time of day
        const dayIntensity = Math.max(0.1, sunHeight);
        this.directionalLight.intensity = dayIntensity;
        
        // Adjust colors for sunrise/sunset
        if (this.dayTime > 0.2 && this.dayTime < 0.3) {
            // Sunrise
            this.directionalLight.color.setHSL(0.08, 0.8, 0.6);
            this.scene.fog.color.setHSL(0.08, 0.5, 0.3);
        } else if (this.dayTime > 0.7 && this.dayTime < 0.8) {
            // Sunset
            this.directionalLight.color.setHSL(0.05, 0.9, 0.5);
            this.scene.fog.color.setHSL(0.05, 0.5, 0.25);
        } else if (this.dayTime > 0.8 || this.dayTime < 0.2) {
            // Night
            this.directionalLight.color.setHSL(0.6, 0.3, 0.3);
            this.scene.fog.color.setHSL(0.65, 0.3, 0.1);
            this.ambientLight.intensity = 0.2;
        } else {
            // Day
            this.directionalLight.color.setHSL(0.1, 0.3, 0.9);
            this.scene.fog.color.setHSL(0.58, 0.3, 0.4);
            this.ambientLight.intensity = 0.4;
        }
    }
    
    cleanupEntities() {
        // Remove dead enemies after death animation
        this.enemies = this.enemies.filter(enemy => {
            if (!enemy.isAlive && enemy.deathTimer <= 0) {
                enemy.dispose();
                return false;
            }
            return true;
        });
    }
    
    render() {
        // Use composer if post-processing is enabled, otherwise direct render
        if (this.composer && this.settings.postProcessing) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    pause() {
        this.isPaused = true;
        document.getElementById('pause-menu').classList.remove('hidden');
        document.exitPointerLock();
    }
    
    resume() {
        this.isPaused = false;
        document.getElementById('pause-menu').classList.add('hidden');
    }
    
    quit() {
        // Reset game state
        location.reload();
    }
    
    playerDied() {
        this.isGameOver = true;
        
        // Show death screen
        document.getElementById('death-screen').classList.remove('hidden');
        document.exitPointerLock();
        
        // Respawn after delay
        setTimeout(() => {
            this.respawnPlayer();
        }, 4000);
    }
    
    respawnPlayer() {
        this.isGameOver = false;
        document.getElementById('death-screen').classList.add('hidden');
        
        // Respawn at last checkpoint
        const checkpoint = this.checkpointSystem.getLastCheckpoint();
        this.player.respawn(checkpoint);
        
        // Respawn all enemies
        this.enemies.forEach(enemy => {
            if (!enemy.isBoss) {
                enemy.respawn();
            }
        });
    }
    
    showVictory(soulsGained) {
        document.getElementById('victory-screen').classList.remove('hidden');
        document.getElementById('souls-gained').textContent = `+${soulsGained} Souls`;
        
        setTimeout(() => {
            document.getElementById('victory-screen').classList.add('hidden');
        }, 3000);
    }
    
    // Utility method to get height at world position
    getHeightAt(x, z) {
        return this.world.getHeightAt(x, z);
    }
    
    /**
     * Apply quality settings for performance optimization
     * @param {string} level - 'low', 'medium', or 'high'
     */
    applyQualitySettings(level) {
        if (!this.qualitySettings[level]) {
            console.warn(`Unknown quality level: ${level}`);
            return;
        }
        
        this.currentQuality = level;
        this.settings = this.qualitySettings[level];
        
        // Apply renderer settings
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.pixelRatio));
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
        
        // Apply shadow settings
        if (this.directionalLight) {
            this.directionalLight.castShadow = this.settings.shadowsEnabled;
            if (this.settings.shadowsEnabled) {
                this.directionalLight.shadow.mapSize.width = this.settings.shadowMapSize;
                this.directionalLight.shadow.mapSize.height = this.settings.shadowMapSize;
            }
        }
        
        // Update particle system settings
        if (this.particleSystem) {
            this.particleSystem.maxParticles = this.settings.particleCount;
        }
        
        // Update visual effects settings
        if (this.visualEffects) {
            this.visualEffects.applyQualitySettings(this.settings);
        }
        
        console.log(`Quality settings applied: ${level}`);
    }
}
