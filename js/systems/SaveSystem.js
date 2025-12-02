/**
 * SaveSystem.js - Save/Load System
 * Handles saving and loading game state to localStorage
 */

export class SaveSystem {
    constructor(game) {
        this.game = game;
        
        // Save key
        this.saveKey = 'soulsborne3d_save';
        this.settingsKey = 'soulsborne3d_settings';
        
        // Auto-save timer
        this.autoSaveInterval = 60; // seconds
        this.autoSaveTimer = 0;
        
        // Track what's been defeated
        this.defeatedBosses = [];
        this.discoveredCheckpoints = [];
        
        // Cache for combat check (updated less frequently)
        this.inCombat = false;
        this.combatCheckTimer = 0;
        this.combatCheckInterval = 1; // Check every 1 second
    }
    
    update(deltaTime) {
        // Update combat check timer (less frequent than every frame)
        this.combatCheckTimer += deltaTime;
        if (this.combatCheckTimer >= this.combatCheckInterval) {
            this.combatCheckTimer = 0;
            this.inCombat = this.game.enemies.some(e => e.hasAggro) ||
                           this.game.bosses.some(b => b.hasAggro);
        }
        
        // Auto-save at checkpoints is handled by CheckpointSystem
        // But we can track time-based auto-save too
        this.autoSaveTimer += deltaTime;
        
        if (this.autoSaveTimer >= this.autoSaveInterval) {
            this.autoSaveTimer = 0;
            // Don't auto-save during combat or boss fights
            if (!this.inCombat) {
                this.saveGame();
            }
        }
    }
    
    saveGame() {
        try {
            const player = this.game.player;
            const progression = this.game.progressionSystem;
            
            const saveData = {
                version: 1,
                timestamp: Date.now(),
                
                // Player stats
                player: {
                    stats: { ...player.stats },
                    maxHealth: player.maxHealth,
                    maxStamina: player.maxStamina,
                    maxMana: player.maxMana,
                    position: {
                        x: player.position.x,
                        y: player.position.y,
                        z: player.position.z
                    }
                },
                
                // Progression
                progression: {
                    souls: progression.souls,
                    level: progression.level
                },
                
                // Checkpoint
                checkpoint: this.getCheckpointData(),
                
                // Discovered areas
                discoveredCheckpoints: this.discoveredCheckpoints,
                
                // Defeated bosses
                defeatedBosses: this.defeatedBosses,
                
                // Inventory
                inventory: this.getInventoryData(),
                
                // Equipment
                equipment: this.getEquipmentData(),
                
                // World state
                world: {
                    dayTime: this.game.visualEffects ? this.game.visualEffects.dayTime : 0.35
                }
            };
            
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
            
            // Show save notification
            if (this.game.hud && this.game.hud.showMessage) {
                this.game.hud.showMessage('Game Saved', 1500);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }
    
    loadGame() {
        try {
            const saveData = localStorage.getItem(this.saveKey);
            if (!saveData) {
                return false;
            }
            
            const data = JSON.parse(saveData);
            
            // Validate version
            if (data.version !== 1) {
                console.warn('Save version mismatch');
                return false;
            }
            
            // Restore player stats
            const player = this.game.player;
            if (data.player) {
                Object.assign(player.stats, data.player.stats);
                player.maxHealth = data.player.maxHealth;
                player.maxStamina = data.player.maxStamina;
                player.maxMana = data.player.maxMana;
                player.health = player.maxHealth;
                player.stamina = player.maxStamina;
                player.mana = player.maxMana;
            }
            
            // Restore progression
            const progression = this.game.progressionSystem;
            if (data.progression) {
                progression.souls = data.progression.souls;
                progression.level = data.progression.level;
            }
            
            // Restore checkpoint and position
            if (data.checkpoint) {
                this.restoreCheckpoint(data.checkpoint);
            }
            
            // Restore discovered checkpoints
            if (data.discoveredCheckpoints) {
                this.discoveredCheckpoints = data.discoveredCheckpoints;
                this.restoreDiscoveredCheckpoints();
            }
            
            // Restore defeated bosses
            if (data.defeatedBosses) {
                this.defeatedBosses = data.defeatedBosses;
                this.removeDefeatedBosses();
            }
            
            // Restore inventory
            if (data.inventory) {
                this.restoreInventory(data.inventory);
            }
            
            // Restore equipment
            if (data.equipment) {
                this.restoreEquipment(data.equipment);
            }
            
            // Restore world state
            if (data.world && this.game.visualEffects) {
                this.game.visualEffects.dayTime = data.world.dayTime;
            }
            
            // Show load notification
            if (this.game.hud && this.game.hud.showMessage) {
                this.game.hud.showMessage('Game Loaded', 1500);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            return false;
        }
    }
    
    hasSaveData() {
        return localStorage.getItem(this.saveKey) !== null;
    }
    
    deleteSave() {
        localStorage.removeItem(this.saveKey);
    }
    
    getCheckpointData() {
        const checkpoint = this.game.checkpointSystem.getLastCheckpoint();
        if (checkpoint) {
            return {
                name: checkpoint.name,
                position: {
                    x: checkpoint.position.x,
                    y: checkpoint.position.y,
                    z: checkpoint.position.z
                }
            };
        }
        return null;
    }
    
    restoreCheckpoint(checkpointData) {
        if (!checkpointData) return;
        
        const player = this.game.player;
        player.position.set(
            checkpointData.position.x,
            checkpointData.position.y + 1,
            checkpointData.position.z
        );
    }
    
    restoreDiscoveredCheckpoints() {
        this.discoveredCheckpoints.forEach(name => {
            const checkpoint = this.game.checkpointSystem.checkpoints.find(c => c.name === name);
            if (checkpoint && !checkpoint.isDiscovered) {
                checkpoint.isDiscovered = true;
                checkpoint.light.intensity = 2;
                checkpoint.flameMesh.material.emissiveIntensity = 1;
                checkpoint.flameMesh.material.opacity = 0.8;
            }
        });
    }
    
    removeDefeatedBosses() {
        this.defeatedBosses.forEach(bossName => {
            const boss = this.game.bosses.find(b => b.name === bossName);
            if (boss) {
                boss.isAlive = false;
                if (boss.mesh) {
                    this.game.scene.remove(boss.mesh);
                    boss.mesh = null;
                }
            }
        });
    }
    
    getInventoryData() {
        if (!this.game.inventorySystem) return [];
        
        return this.game.inventorySystem.items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            charges: item.charges
        }));
    }
    
    restoreInventory(inventoryData) {
        if (!this.game.inventorySystem) return;
        
        this.game.inventorySystem.items = inventoryData.map(item => ({
            id: item.id,
            quantity: item.quantity,
            charges: item.charges
        }));
    }
    
    getEquipmentData() {
        if (!this.game.weaponSystem) return null;
        
        return {
            weapon: this.game.weaponSystem.equipped.weapon,
            shield: this.game.weaponSystem.equipped.shield,
            head: this.game.weaponSystem.equipped.head,
            chest: this.game.weaponSystem.equipped.chest,
            hands: this.game.weaponSystem.equipped.hands,
            legs: this.game.weaponSystem.equipped.legs
        };
    }
    
    restoreEquipment(equipmentData) {
        if (!this.game.weaponSystem || !equipmentData) return;
        
        Object.assign(this.game.weaponSystem.equipped, equipmentData);
        this.game.weaponSystem.updatePlayerWeaponMesh();
    }
    
    // Called when player rests at bonfire
    saveAtCheckpoint(checkpoint) {
        // Add to discovered checkpoints
        if (!this.discoveredCheckpoints.includes(checkpoint.name)) {
            this.discoveredCheckpoints.push(checkpoint.name);
        }
        
        this.saveGame();
    }
    
    // Called when boss is defeated
    registerBossDefeat(boss) {
        if (!this.defeatedBosses.includes(boss.name)) {
            this.defeatedBosses.push(boss.name);
        }
        
        this.saveGame();
    }
    
    // Settings
    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
    
    loadSettings() {
        try {
            const settings = localStorage.getItem(this.settingsKey);
            return settings ? JSON.parse(settings) : null;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return null;
        }
    }
}
