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
import { PerformanceSettings } from '../utils/PerformanceSettings.js';
import { SettingsMenu } from '../ui/SettingsMenu.js';

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
        
        // Performance settings system
        this.performanceSettings = new PerformanceSettings();
        this.settingsMenu = null;
        
        // Legacy quality settings (kept for compatibility, but use performanceSettings instead)
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
    
    initializePerformanceSettings() {
        // Try to load saved settings first
        if (!this.performanceSettings.loadFromLocalStorage()) {
            // If no saved settings, auto-detect and apply recommended preset
            const recommendedPreset = PerformanceSettings.getRecommendedPreset();
            console.log(`Auto-detected recommended preset: ${recommendedPreset}`);
            this.performanceSettings.applyPreset(recommendedPreset);
        }
        
        // Update legacy settings object for compatibility
        this.settings = this.performanceSettings.getSettings();
        this.currentQuality = this.performanceSettings.getCurrentPreset();
    }
    
    init() {
        // Initialize performance settings FIRST
        this.initializePerformanceSettings();
        this.setupRenderer();
        this.setupScene();
        this.setupLighting();
        this.setupPostProcessing();
        this.setupSystems();
        this.setupSettingsMenu();
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
    
    setupSettingsMenu() {
        this.settingsMenu = new SettingsMenu(this);
    }
    
    setupRenderer() {
        // Use performance settings for renderer configuration
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: this.settings.antialias,
            powerPreference: this.settings.powerPreference || 'low-power'
        });
        
        // Apply render scale for lower resolution rendering
        const width = window.innerWidth * this.settings.renderScale;
        const height = window.innerHeight * this.settings.renderScale;
        this.renderer.setSize(width, height, false);
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        // CRITICAL: Cap pixel ratio at 1 for low-end devices
        this.renderer.setPixelRatio(Math.min(1, this.settings.pixelRatio));
        
        // Shadow settings based on quality
        this.renderer.shadowMap.enabled = this.settings.shadowsEnabled;
        if (this.settings.shadowsEnabled) {
            // Use cheaper shadow map type for better performance
            this.renderer.shadowMap.type = THREE.PCFShadowMap;
        }
        
        // Use simplest tone mapping for potato mode
        this.renderer.toneMapping = this.settings.postProcessing ? THREE.LinearToneMapping : THREE.NoToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Disable auto clear for manual render pass control
        this.renderer.autoClear = true;
        
        console.log(`Renderer initialized with ${this.currentQuality} settings`);
        console.log(`Render scale: ${this.settings.renderScale}, Pixel ratio: ${this.settings.pixelRatio}`);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        // Use simple background color (cheaper than skybox for potato mode)
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Apply fog based on performance settings (helps hide pop-in)
        const fogColor = 0x87CEEB;
        this.scene.fog = new THREE.Fog(
            fogColor, 
            this.settings.fogNear || 30, 
            this.settings.fogFar || 80
        );
        
        // Camera with configurable far plane
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            this.settings.cameraFar || 100
        );
        this.camera.position.set(0, 5, 10);
    }
    
    setupLighting() {
        // For potato mode: Use ONLY ambient light (no directional light calculations)
        if (this.settings.maxLights === 1 || this.settings.lightingSimplified) {
            // Single ambient light - brightest and cheapest
            this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            this.scene.add(this.ambientLight);
            
            // Optional: very weak directional for minimal shading
            if (this.settings.maxLights > 1 && !this.settings.useLambertMaterial) {
                this.directionalLight = new THREE.DirectionalLight(0xffeedd, 0.3);
                this.directionalLight.position.set(50, 100, 50);
                this.directionalLight.castShadow = false;
                this.scene.add(this.directionalLight);
            }
            return;
        }
        
        // Standard lighting for medium/high quality
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
        
        // Hemisphere light for natural sky lighting (only if not simplified)
        if (!this.settings.lightingSimplified) {
            this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362312, 0.5);
            this.scene.add(this.hemisphereLight);
        }
        
        console.log(`Lighting setup: ${this.settings.maxLights} lights, shadows: ${this.settings.shadows}`);
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
        // Respect maxEnemies setting for potato mode
        const maxEnemies = this.settings.maxEnemies || 3;
        
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
        
        // Limit basic enemies based on settings
        const limitedSpawns = spawnPoints.slice(0, Math.min(maxEnemies, spawnPoints.length));
        
        limitedSpawns.forEach(spawn => {
            const enemy = new Enemy(this, spawn.type);
            const y = this.world.getHeightAt(spawn.x, spawn.z);
            enemy.init(spawn.x, y, spawn.z);
            this.enemies.push(enemy);
        });
        
        console.log(`Spawned ${limitedSpawns.length} basic enemies (max: ${maxEnemies})`);
        
        // Only spawn additional enemy types if we have room in maxEnemies budget
        const remainingSlots = maxEnemies - this.enemies.length;
        
        if (remainingSlots > 0) {
            // Spawn wolves (pack creatures) - only if maxEnemies > 3
            const wolfSpawns = [
                { x: 45, z: 25 },
                { x: 48, z: 28 },
            ].slice(0, Math.min(remainingSlots, 2));
            
            wolfSpawns.forEach(spawn => {
                const wolf = new Wolf(this);
                const y = this.world.getHeightAt(spawn.x, spawn.z);
                wolf.init(spawn.x, y, spawn.z);
                this.enemies.push(wolf);
            });
        }
        
        // Skip other enemy types for potato mode (maxEnemies <= 5)
        if (maxEnemies > 5) {
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
        }
        
        if (maxEnemies > 8) {
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
        }
        
        if (maxEnemies > 10) {
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
        }
        
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
            
            // Update FPS display
            if (this.settingsMenu) {
                this.settingsMenu.updateFPS(this.fps);
            }
        }
        
        if (!this.isPaused && !this.isGameOver) {
            this.update();
        }
        
        this.render();
    }
    
    update() {
        // Staggered updates for performance optimization using configured rates
        const frame = this.frameCount;
        const settings = this.settings;
        
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
        
        // Update particles at configured rate (or skip if disabled)
        const particleRate = settings.particleUpdateRate || 1;
        if (settings.particlesEnabled && frame % particleRate === 0 && this.particleSystem) {
            this.particleSystem.update(this.deltaTime * particleRate);
        }
        
        // Update visual effects at configured rate
        const envRate = settings.environmentUpdateRate || 2;
        if (frame % envRate === 0 && this.visualEffects) {
            this.visualEffects.update(this.deltaTime * envRate);
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
        
        // Update HUD at configured rate
        const hudRate = settings.hudUpdateRate || 3;
        if (frame % hudRate === 0) {
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
        
        const settings = this.settings;
        const renderDistance = settings.renderDistance || 40;
        const nearDistance = renderDistance * 0.5;
        const farDistance = renderDistance;
        const enemyUpdateRate = settings.enemyUpdateRate || 1;
        
        this.enemies.forEach((enemy, index) => {
            if (!enemy.isAlive || !enemy.mesh) return;
            
            const distance = enemy.position.distanceTo(playerPos);
            
            // Cull enemies beyond render distance
            if (distance > renderDistance * 1.2) {
                enemy.mesh.visible = false;
                return;
            }
            
            enemy.mesh.visible = true;
            
            if (distance < nearDistance) {
                // Update nearby enemies every frame (or at configured rate)
                if ((this.frameCount + index) % enemyUpdateRate === 0) {
                    enemy.update(deltaTime);
                }
            } else if (distance < farDistance) {
                // Update mid-range enemies less frequently
                if ((this.frameCount + index) % (enemyUpdateRate * 2) === 0) {
                    enemy.update(deltaTime);
                }
            } else {
                // Update distant enemies even less frequently
                if ((this.frameCount + index) % (enemyUpdateRate * 4) === 0) {
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
    
    /**
     * Apply a quality preset from PerformanceSettings
     * @param {string} presetName - 'potato', 'low', 'medium', or 'high'
     */
    applyQualityPreset(presetName) {
        console.log(`Applying quality preset: ${presetName}`);
        
        // Apply the preset
        this.performanceSettings.applyPreset(presetName);
        this.settings = this.performanceSettings.getSettings();
        this.currentQuality = presetName;
        
        // Update renderer settings
        this.renderer.setPixelRatio(Math.min(1, this.settings.pixelRatio));
        this.renderer.shadowMap.enabled = this.settings.shadows;
        this.renderer.toneMapping = this.settings.postProcessing ? THREE.LinearToneMapping : THREE.NoToneMapping;
        
        // Update camera far plane and fog
        this.camera.far = this.settings.cameraFar || 100;
        this.camera.updateProjectionMatrix();
        
        const fogColor = 0x87CEEB;
        this.scene.fog = new THREE.Fog(fogColor, this.settings.fogNear || 30, this.settings.fogFar || 80);
        
        // Update lighting
        if (this.ambientLight) {
            this.ambientLight.intensity = this.settings.maxLights === 1 ? 0.8 : 0.4;
        }
        
        // Update shadow settings
        if (this.directionalLight) {
            this.directionalLight.castShadow = this.settings.shadows;
            if (this.settings.shadows) {
                this.directionalLight.shadow.mapSize.width = this.settings.shadowMapSize || 512;
                this.directionalLight.shadow.mapSize.height = this.settings.shadowMapSize || 512;
            }
        }
        
        // Update particle system settings
        if (this.particleSystem) {
            this.particleSystem.maxParticles = this.settings.particleCount || 10;
        }
        
        // Update visual effects
        if (this.visualEffects) {
            this.visualEffects.applyQualitySettings(this.settings);
        }
        
        // Rebuild world with new settings (optional - may cause lag)
        // Consider adding a "Apply on restart" option for terrain changes
        
        console.log(`✓ Quality preset "${presetName}" applied successfully`);
    }
    
    /**
     * Apply render scale (resolution multiplier)
     */
    applyRenderScale(scale) {
        const width = window.innerWidth * scale;
        const height = window.innerHeight * scale;
        this.renderer.setSize(width, height, false);
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        
        console.log(`Render scale applied: ${scale * 100}%`);
    }
    
    /**
     * Toggle shadows on/off
     */
    toggleShadows(enabled) {
        this.renderer.shadowMap.enabled = enabled;
        
        if (this.directionalLight) {
            this.directionalLight.castShadow = enabled;
        }
        
        // Update all scene objects
        this.scene.traverse((obj) => {
            if (obj.isMesh) {
                if (obj.castShadow !== undefined) {
                    obj.castShadow = enabled;
                }
                if (obj.receiveShadow !== undefined) {
                    obj.receiveShadow = enabled;
                }
            }
        });
        
        console.log(`Shadows ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle particles on/off
     */
    toggleParticles(enabled) {
        if (this.particleSystem) {
            this.particleSystem.enabled = enabled;
        }
        console.log(`Particles ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Toggle post-processing on/off
     */
    togglePostProcessing(enabled) {
        // This will take effect on next render
        this.settings.postProcessing = enabled;
        console.log(`Post-processing ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Apply draw distance
     */
    applyDrawDistance(distance) {
        this.settings.renderDistance = distance;
        
        // Update camera far plane
        this.camera.far = Math.max(distance * 2, 100);
        this.camera.updateProjectionMatrix();
        
        // Update fog to match
        const fogColor = 0x87CEEB;
        this.scene.fog = new THREE.Fog(
            fogColor,
            distance * 0.6,
            distance * 1.5
        );
        
        console.log(`Draw distance set to: ${distance}m`);
    }
}
