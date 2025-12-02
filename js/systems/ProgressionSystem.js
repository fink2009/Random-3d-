/**
 * ProgressionSystem.js - Souls, Leveling, and Character Progression
 * Handles souls currency, stats, and leveling up
 */

import * as THREE from 'three';

export class ProgressionSystem {
    constructor(game) {
        this.game = game;
        
        // Souls currency
        this.souls = 0;
        
        // Level
        this.level = 1;
        
        // Souls required for next level
        this.soulsForNextLevel = 100;
        this.levelScaling = 1.2; // Multiplier for each level
        
        // Dropped souls on death
        this.droppedSouls = 0;
        this.droppedSoulsPosition = null;
        this.droppedSoulsMesh = null;
        
        // Stats available to allocate
        this.pendingStats = {
            vigor: 0,
            endurance: 0,
            strength: 0,
            dexterity: 0,
            intelligence: 0,
            faith: 0
        };
        
        this.setupUI();
    }
    
    setupUI() {
        // Level up button handlers
        document.querySelectorAll('.stat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stat = e.target.dataset.stat;
                this.allocateStat(stat);
            });
        });
        
        document.getElementById('confirm-level-btn')?.addEventListener('click', () => {
            this.confirmLevelUp();
        });
        
        document.getElementById('cancel-level-btn')?.addEventListener('click', () => {
            this.cancelLevelUp();
        });
    }
    
    addSouls(amount) {
        this.souls += amount;
        
        // Visual feedback
        const soulsCounter = document.getElementById('souls-counter');
        soulsCounter.classList.add('pulse');
        setTimeout(() => soulsCounter.classList.remove('pulse'), 300);
    }
    
    spendSouls(amount) {
        if (this.souls >= amount) {
            this.souls -= amount;
            return true;
        }
        return false;
    }
    
    dropSouls(position) {
        if (this.souls > 0) {
            // Add to existing dropped souls or create new
            this.droppedSouls = this.souls;
            this.droppedSoulsPosition = position.clone();
            this.souls = 0;
            
            // Create visual indicator
            this.createDroppedSoulsMarker();
        }
    }
    
    createDroppedSoulsMarker() {
        if (this.droppedSoulsMesh) {
            this.game.scene.remove(this.droppedSoulsMesh);
        }
        
        // Glowing orb to show dropped souls
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            emissive: 0xd4af37,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        this.droppedSoulsMesh = new THREE.Mesh(geometry, material);
        this.droppedSoulsMesh.position.copy(this.droppedSoulsPosition);
        this.droppedSoulsMesh.position.y += 1;
        
        // Add point light
        const light = new THREE.PointLight(0xd4af37, 1, 10);
        this.droppedSoulsMesh.add(light);
        
        this.game.scene.add(this.droppedSoulsMesh);
    }
    
    checkSoulsPickup(playerPosition) {
        if (!this.droppedSoulsPosition) return;
        
        const distance = playerPosition.distanceTo(this.droppedSoulsPosition);
        
        if (distance < 2) {
            // Pick up dropped souls
            this.addSouls(this.droppedSouls);
            
            // Spawn pickup effect
            this.game.particleSystem.spawnSoulsEffect(this.droppedSoulsPosition);
            
            // Show "Souls Retrieved" message
            const soulsRetrieved = this.droppedSouls;
            if (this.game.hud && this.game.hud.showMessage) {
                this.game.hud.showMessage(`Souls Retrieved: ${soulsRetrieved.toLocaleString()}`);
            }
            
            // Clean up
            this.droppedSouls = 0;
            this.droppedSoulsPosition = null;
            
            if (this.droppedSoulsMesh) {
                this.game.scene.remove(this.droppedSoulsMesh);
                this.droppedSoulsMesh = null;
            }
        }
    }
    
    losePermanentSouls() {
        // Called when player dies again before retrieving souls
        if (this.droppedSoulsMesh) {
            this.game.scene.remove(this.droppedSoulsMesh);
            this.droppedSoulsMesh = null;
        }
        
        this.droppedSouls = 0;
        this.droppedSoulsPosition = null;
    }
    
    calculateSoulsRequired() {
        return Math.floor(this.soulsForNextLevel * Math.pow(this.levelScaling, this.level - 1));
    }
    
    canLevelUp() {
        return this.souls >= this.calculateSoulsRequired();
    }
    
    openLevelUpMenu() {
        const menu = document.getElementById('level-up-menu');
        menu.classList.remove('hidden');
        
        // Update display
        this.updateLevelUpUI();
    }
    
    closeLevelUpMenu() {
        document.getElementById('level-up-menu').classList.add('hidden');
    }
    
    updateLevelUpUI() {
        const player = this.game.player;
        
        document.getElementById('level-value').textContent = this.level;
        document.getElementById('souls-for-level').textContent = this.souls.toLocaleString();
        document.getElementById('level-cost').textContent = this.calculateSoulsRequired().toLocaleString();
        
        // Update stat values
        document.getElementById('vigor-value').textContent = 
            player.stats.vigor + this.pendingStats.vigor;
        document.getElementById('endurance-value').textContent = 
            player.stats.endurance + this.pendingStats.endurance;
        document.getElementById('strength-value').textContent = 
            player.stats.strength + this.pendingStats.strength;
        document.getElementById('dexterity-value').textContent = 
            player.stats.dexterity + this.pendingStats.dexterity;
        document.getElementById('intelligence-value').textContent = 
            player.stats.intelligence + this.pendingStats.intelligence;
        document.getElementById('faith-value').textContent = 
            player.stats.faith + this.pendingStats.faith;
    }
    
    allocateStat(stat) {
        const cost = this.calculateSoulsRequired();
        
        if (this.souls >= cost) {
            this.souls -= cost;
            this.level++;
            this.pendingStats[stat]++;
            this.updateLevelUpUI();
        }
    }
    
    confirmLevelUp() {
        const player = this.game.player;
        
        // Apply pending stats
        for (const stat in this.pendingStats) {
            player.stats[stat] += this.pendingStats[stat];
            this.pendingStats[stat] = 0;
        }
        
        // Recalculate derived stats
        player.updateDerivedStats();
        
        // Restore health/stamina on level up
        player.health = player.maxHealth;
        player.stamina = player.maxStamina;
        player.mana = player.maxMana;
        
        this.closeLevelUpMenu();
    }
    
    cancelLevelUp() {
        // Refund pending souls
        const totalPending = Object.values(this.pendingStats).reduce((a, b) => a + b, 0);
        
        for (let i = 0; i < totalPending; i++) {
            this.level--;
            this.souls += Math.floor(this.soulsForNextLevel * Math.pow(this.levelScaling, this.level - 1));
        }
        
        // Reset pending stats
        for (const stat in this.pendingStats) {
            this.pendingStats[stat] = 0;
        }
        
        this.closeLevelUpMenu();
    }
    
    update(deltaTime) {
        // Check for souls pickup
        if (this.droppedSoulsPosition && this.game.player) {
            this.checkSoulsPickup(this.game.player.position);
        }
        
        // Animate dropped souls marker
        if (this.droppedSoulsMesh) {
            this.droppedSoulsMesh.rotation.y += deltaTime * 2;
            this.droppedSoulsMesh.position.y = 
                this.droppedSoulsPosition.y + 1 + Math.sin(Date.now() * 0.003) * 0.3;
        }
    }
}
