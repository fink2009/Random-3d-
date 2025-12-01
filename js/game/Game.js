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
import { CombatSystem } from '../combat/CombatSystem.js';
import { HUD } from '../ui/HUD.js';
import { ParticleSystem } from '../utils/ParticleSystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { CheckpointSystem } from '../systems/CheckpointSystem.js';

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
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
        
        // Directional light (sun/moon)
        this.directionalLight = new THREE.DirectionalLight(0xffeedd, 1.0);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);
        
        // Hemisphere light for natural sky lighting
        this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362312, 0.5);
        this.scene.add(this.hemisphereLight);
    }
    
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom effect for light sources
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,  // strength
            0.4,  // radius
            0.85  // threshold
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
        
        // Spawn a boss in the distance
        const boss = new Boss(this, 'Corrupted Knight');
        const bossY = this.world.getHeightAt(80, 80);
        boss.init(80, bossY, 80);
        this.bosses.push(boss);
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
        this.composer.setSize(width, height);
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
        // Update day/night cycle
        this.updateDayNightCycle();
        
        // Update player
        if (this.player) {
            this.player.update(this.deltaTime);
        }
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (enemy.isAlive) {
                enemy.update(this.deltaTime);
            }
        });
        
        // Update bosses
        this.bosses.forEach(boss => {
            if (boss.isAlive) {
                boss.update(this.deltaTime);
            }
        });
        
        // Update combat system
        this.combatSystem.update(this.deltaTime);
        
        // Update particles
        this.particleSystem.update(this.deltaTime);
        
        // Update HUD
        this.hud.update();
        
        // Update checkpoints
        this.checkpointSystem.update(this.deltaTime);
        
        // Update progression system (souls pickup, dropped souls animation)
        this.progressionSystem.update(this.deltaTime);
        
        // Clean up dead entities
        this.cleanupEntities();
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
        this.composer.render();
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
}
