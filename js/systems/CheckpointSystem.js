/**
 * CheckpointSystem.js - Bonfires/Sites of Grace
 * Handles rest points, respawning, and fast travel
 */

import * as THREE from 'three';

export class CheckpointSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // All checkpoints
        this.checkpoints = [];
        
        // Last used checkpoint
        this.lastCheckpoint = null;
        
        // Checkpoint being interacted with
        this.activeCheckpoint = null;
        
        // Interaction range
        this.interactionRange = 3;
        
        // Create initial checkpoints
        this.createCheckpoints();
        
        this.setupUI();
    }
    
    createCheckpoints() {
        // Spawn point checkpoint
        this.addCheckpoint('First Light', 0, 0, true);
        
        // Other checkpoints around the world
        this.addCheckpoint('Forest Edge', 30, 30);
        this.addCheckpoint('Ruined Tower', -40, 40);
        this.addCheckpoint('Mountain Pass', 60, -30);
        this.addCheckpoint('Boss Gate', 70, 70);
    }
    
    addCheckpoint(name, x, z, isDiscovered = false) {
        const y = this.game.world.getHeightAt(x, z);
        
        const checkpoint = {
            name,
            position: new THREE.Vector3(x, y, z),
            isDiscovered,
            mesh: null,
            light: null
        };
        
        this.createCheckpointMesh(checkpoint);
        this.checkpoints.push(checkpoint);
        
        // Set first checkpoint as default spawn
        if (isDiscovered && !this.lastCheckpoint) {
            this.lastCheckpoint = checkpoint;
        }
    }
    
    createCheckpointMesh(checkpoint) {
        const group = new THREE.Group();
        
        // Base/brazier
        const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.5, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.8,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        base.castShadow = true;
        group.add(base);
        
        // Center pillar
        const pillarGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
        const pillar = new THREE.Mesh(pillarGeometry, baseMaterial);
        pillar.position.y = 1.5;
        pillar.castShadow = true;
        group.add(pillar);
        
        // Fire bowl
        const bowlGeometry = new THREE.CylinderGeometry(0.5, 0.3, 0.4, 8);
        const bowl = new THREE.Mesh(bowlGeometry, baseMaterial);
        bowl.position.y = 2.7;
        bowl.castShadow = true;
        group.add(bowl);
        
        // Flame (visible when discovered)
        const flameGeometry = new THREE.ConeGeometry(0.3, 1, 8);
        const flameMaterial = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff4400,
            emissiveIntensity: checkpoint.isDiscovered ? 1 : 0,
            transparent: true,
            opacity: checkpoint.isDiscovered ? 0.8 : 0.2
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = 3.2;
        group.add(flame);
        checkpoint.flameMesh = flame;
        
        // Point light
        const light = new THREE.PointLight(
            0xff6600,
            checkpoint.isDiscovered ? 2 : 0,
            15
        );
        light.position.y = 3;
        group.add(light);
        checkpoint.light = light;
        
        // Position group
        group.position.copy(checkpoint.position);
        
        this.scene.add(group);
        checkpoint.mesh = group;
    }
    
    setupUI() {
        // Bonfire menu buttons
        document.getElementById('rest-btn')?.addEventListener('click', () => this.rest());
        document.getElementById('level-up-btn')?.addEventListener('click', () => this.openLevelUp());
        document.getElementById('fast-travel-btn')?.addEventListener('click', () => this.openFastTravel());
        document.getElementById('leave-btn')?.addEventListener('click', () => this.leaveBonfire());
    }
    
    update(deltaTime) {
        const player = this.game.player;
        if (!player) return;
        
        // Check for nearby checkpoints
        let nearbyCheckpoint = null;
        
        for (const checkpoint of this.checkpoints) {
            const distance = player.position.distanceTo(checkpoint.position);
            
            // Animate flame
            if (checkpoint.flameMesh && checkpoint.isDiscovered) {
                checkpoint.flameMesh.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.2;
                checkpoint.flameMesh.rotation.y += deltaTime * 2;
            }
            
            // Check for interaction range
            if (distance < this.interactionRange) {
                nearbyCheckpoint = checkpoint;
                
                // Discover checkpoint if not already
                if (!checkpoint.isDiscovered) {
                    this.discoverCheckpoint(checkpoint);
                }
            }
        }
        
        // Show/hide interaction prompt
        if (nearbyCheckpoint && !this.activeCheckpoint) {
            this.game.hud.showInteractionPrompt('Rest at ' + nearbyCheckpoint.name);
            
            // Check for interact input
            if (this.game.inputManager.wasActionPressed('interact')) {
                this.activateCheckpoint(nearbyCheckpoint);
            }
        } else if (!nearbyCheckpoint && !this.activeCheckpoint) {
            this.game.hud.hideInteractionPrompt();
        }
    }
    
    discoverCheckpoint(checkpoint) {
        checkpoint.isDiscovered = true;
        
        // Activate visual effects
        checkpoint.light.intensity = 2;
        checkpoint.flameMesh.material.emissiveIntensity = 1;
        checkpoint.flameMesh.material.opacity = 0.8;
        
        // Spawn particles
        this.game.particleSystem.spawnFire(checkpoint.position.clone().add(new THREE.Vector3(0, 3, 0)), 20);
        
        // Show notification
        this.showNotification('Site of Grace Discovered: ' + checkpoint.name);
    }
    
    activateCheckpoint(checkpoint) {
        this.activeCheckpoint = checkpoint;
        this.lastCheckpoint = checkpoint;
        
        // Discover this Site of Grace for fast travel
        if (this.game.fastTravelSystem) {
            this.game.fastTravelSystem.discoverGrace(checkpoint.name);
        }
        
        // Open bonfire menu
        document.getElementById('bonfire-menu').classList.remove('hidden');
        
        // Update menu title
        const title = document.querySelector('#bonfire-menu h1');
        if (title) title.textContent = checkpoint.name;
        
        // Release pointer lock
        document.exitPointerLock();
        
        // Pause enemy updates
        this.game.isPaused = true;
    }
    
    rest() {
        const player = this.game.player;
        
        // Restore health, stamina, mana
        player.health = player.maxHealth;
        player.stamina = player.maxStamina;
        player.mana = player.maxMana;
        
        // Respawn enemies
        this.game.enemies.forEach(enemy => {
            enemy.respawn();
        });
        
        // Visual feedback
        this.game.particleSystem.spawnMagicParticle(player.position.clone().add(new THREE.Vector3(0, 1, 0)));
        
        this.showNotification('Rested and Restored');
    }
    
    openLevelUp() {
        this.game.progressionSystem.openLevelUpMenu();
    }
    
    openFastTravel() {
        // Close bonfire menu
        this.leaveBonfire();
        
        // Open fast travel map
        if (this.game.fastTravelSystem) {
            this.game.fastTravelSystem.open();
        } else {
            // Fallback if fast travel system not available
            const discovered = this.checkpoints.filter(c => c.isDiscovered);
            
            if (discovered.length <= 1) {
                this.showNotification('No other sites discovered');
                return;
            }
            
            // Simple fast travel - teleport to first different checkpoint
            const other = discovered.find(c => c !== this.activeCheckpoint);
            if (other) {
                const player = this.game.player;
                player.position.copy(other.position);
            player.position.y += 1;
            
            this.lastCheckpoint = other;
            this.leaveBonfire();
            
            this.showNotification('Traveled to ' + other.name);
            }
        }
    }
    
    leaveBonfire() {
        this.activeCheckpoint = null;
        document.getElementById('bonfire-menu').classList.add('hidden');
        this.game.isPaused = false;
        this.game.hud.hideInteractionPrompt();
    }
    
    getLastCheckpoint() {
        return this.lastCheckpoint;
    }
    
    showNotification(text) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.className = 'game-notification';
        notification.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translateX(-50%);
            color: #d4af37;
            font-size: 24px;
            letter-spacing: 4px;
            text-shadow: 2px 2px 4px #000;
            animation: fadeInOut 3s forwards;
            z-index: 1000;
        `;
        notification.textContent = text;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
}

// Add notification animation to document
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        20% { opacity: 1; transform: translateX(-50%) translateY(0); }
        80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);
