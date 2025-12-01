/**
 * CombatSystem.js - Combat Management
 * Handles damage calculations, hit detection, and combat effects
 */

export class CombatSystem {
    constructor(game) {
        this.game = game;
        
        // Damage modifiers
        this.criticalMultiplier = 2.0;
        this.backstabMultiplier = 3.0;
        
        // Parry timing
        this.parryWindow = 0.2; // seconds
        this.parryActive = false;
        this.parryTimer = 0;
        
        // Hit registration to prevent multiple hits
        this.recentHits = [];
        this.hitCooldown = 0.3;
    }
    
    update(deltaTime) {
        // Update parry timer
        if (this.parryActive) {
            this.parryTimer -= deltaTime;
            if (this.parryTimer <= 0) {
                this.parryActive = false;
            }
        }
        
        // Clean up old hits
        this.recentHits = this.recentHits.filter(hit => {
            hit.time -= deltaTime;
            return hit.time > 0;
        });
    }
    
    // Calculate damage with modifiers
    calculateDamage(baseDamage, attacker, defender, isCritical = false, isBackstab = false) {
        let damage = baseDamage;
        
        // Apply critical multiplier
        if (isCritical) {
            damage *= this.criticalMultiplier;
        }
        
        // Apply backstab multiplier
        if (isBackstab) {
            damage *= this.backstabMultiplier;
        }
        
        // Apply attacker's strength scaling
        if (attacker.stats) {
            damage += (attacker.stats.strength - 10) * 2;
        }
        
        // Apply defender's defense
        if (defender.equipment?.armor) {
            damage -= defender.equipment.armor.defense * 0.5;
        }
        
        return Math.max(1, Math.floor(damage));
    }
    
    // Check if attack is a backstab
    isBackstab(attacker, defender) {
        const attackerDir = new THREE.Vector3(
            Math.sin(attacker.rotation),
            0,
            Math.cos(attacker.rotation)
        );
        
        const defenderDir = new THREE.Vector3(
            Math.sin(defender.rotation),
            0,
            Math.cos(defender.rotation)
        );
        
        // Check if attacker is behind defender
        const dot = attackerDir.dot(defenderDir);
        return dot > 0.7; // Facing same direction = behind
    }
    
    // Start parry window
    startParry() {
        this.parryActive = true;
        this.parryTimer = this.parryWindow;
    }
    
    // Check if attack was parried
    checkParry() {
        return this.parryActive;
    }
    
    // Register a hit to prevent duplicates
    registerHit(attackerId, defenderId) {
        const hitKey = `${attackerId}-${defenderId}`;
        
        // Check if this hit was already registered recently
        const existing = this.recentHits.find(h => h.key === hitKey);
        if (existing) {
            return false; // Already hit
        }
        
        this.recentHits.push({
            key: hitKey,
            time: this.hitCooldown
        });
        
        return true;
    }
}
