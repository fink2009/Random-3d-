/**
 * CombatSystem.js - Combat Management
 * Handles damage calculations, hit detection, and combat effects
 */

import * as THREE from 'three';

export class CombatSystem {
    constructor(game) {
        this.game = game;
        
        // Damage modifiers
        this.criticalMultiplier = 2.0;
        this.backstabMultiplier = 3.0;
        this.riposteMultiplier = 2.5; // Damage multiplier after successful parry
        
        // Parry timing
        this.parryWindow = 0.2; // seconds - the window for successful parry
        this.parryActive = false;
        this.parryTimer = 0;
        this.parrySuccessful = false;
        this.parryCooldown = 0;
        this.parryCooldownTime = 0.5; // Cooldown after parry attempt
        
        // Block timing for parry detection
        this.blockStartTime = 0;
        this.lastBlockState = false;
        
        // Riposte window after successful parry
        this.riposteWindowActive = false;
        this.riposteTimer = 0;
        this.riposteWindow = 2.0; // Time to perform riposte after parry
        this.staggeredEnemy = null;
        
        // Hit registration to prevent multiple hits
        this.recentHits = [];
        this.hitCooldown = 0.3;
    }
    
    update(deltaTime) {
        const player = this.game.player;
        const input = this.game.inputManager;
        
        // Detect parry attempt (right click tap at start of block)
        if (input && player && input.keys) {
            const currentBlockState = input.keys.block;
            
            // Detect block start (transition from not blocking to blocking)
            if (currentBlockState && !this.lastBlockState && this.parryCooldown <= 0) {
                this.startParry();
            }
            
            this.lastBlockState = currentBlockState;
        }
        
        // Update parry timer
        if (this.parryActive) {
            this.parryTimer -= deltaTime;
            if (this.parryTimer <= 0) {
                this.parryActive = false;
            }
        }
        
        // Update parry cooldown
        if (this.parryCooldown > 0) {
            this.parryCooldown -= deltaTime;
        }
        
        // Update riposte window
        if (this.riposteWindowActive) {
            this.riposteTimer -= deltaTime;
            if (this.riposteTimer <= 0) {
                this.riposteWindowActive = false;
                this.staggeredEnemy = null;
            }
        }
        
        // Clean up old hits
        this.recentHits = this.recentHits.filter(hit => {
            hit.time -= deltaTime;
            return hit.time > 0;
        });
    }
    
    // Calculate damage with modifiers
    calculateDamage(baseDamage, attacker, defender, isCritical = false, isBackstab = false, isRiposte = false) {
        let damage = baseDamage;
        
        // Apply critical multiplier
        if (isCritical) {
            damage *= this.criticalMultiplier;
        }
        
        // Apply backstab multiplier
        if (isBackstab) {
            damage *= this.backstabMultiplier;
        }
        
        // Apply riposte multiplier
        if (isRiposte) {
            damage *= this.riposteMultiplier;
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
        // Get direction from attacker to defender
        const toDefender = new THREE.Vector3();
        toDefender.subVectors(defender.position, attacker.position);
        toDefender.y = 0;
        toDefender.normalize();
        
        // Get defender's facing direction
        const defenderDir = new THREE.Vector3(
            Math.sin(defender.rotation),
            0,
            Math.cos(defender.rotation)
        );
        
        // Check if attacker is behind defender
        // If defender is facing away from attacker (dot product is positive when both vectors point same way)
        const dot = toDefender.dot(defenderDir);
        return dot > 0.5; // Attacker approaching from behind
    }
    
    // Start parry window
    startParry() {
        this.parryActive = true;
        this.parryTimer = this.parryWindow;
        this.parryCooldown = this.parryCooldownTime;
        this.parrySuccessful = false;
    }
    
    // Check if attack was parried - called when an attack hits the player
    attemptParry(attacker) {
        if (this.parryActive && !this.parrySuccessful) {
            // Successful parry!
            this.parrySuccessful = true;
            this.parryActive = false;
            
            // Stagger the attacker
            if (attacker && attacker.stagger) {
                attacker.stagger();
                this.staggeredEnemy = attacker;
            }
            
            // Open riposte window
            this.riposteWindowActive = true;
            this.riposteTimer = this.riposteWindow;
            
            // Visual feedback - spawn parry sparks
            if (this.game.player && this.game.particleSystem) {
                const parryPos = this.game.player.position.clone();
                parryPos.y += 1.2;
                this.game.particleSystem.spawnHitSparks(parryPos, 25);
            }
            
            // Show parry message
            if (this.game.hud && this.game.hud.showMessage) {
                this.game.hud.showMessage('PARRIED!', 1500);
            }
            
            return true;
        }
        return false;
    }
    
    // Check if we can perform a riposte on an enemy
    canRiposte(enemy) {
        return this.riposteWindowActive && this.staggeredEnemy === enemy;
    }
    
    // Perform riposte attack
    performRiposte(enemy) {
        if (!this.canRiposte(enemy)) return false;
        
        const player = this.game.player;
        if (!player) return false;
        
        // Calculate riposte damage
        const baseDamage = player.equipment.weapon.damage;
        const riposteDamage = this.calculateDamage(baseDamage, player, enemy, true, false, true);
        
        // Apply damage
        enemy.takeDamage(riposteDamage, player.position);
        
        // Visual feedback
        if (this.game.particleSystem) {
            const hitPos = enemy.position.clone();
            hitPos.y += 1.5;
            this.game.particleSystem.spawnHitSparks(hitPos, 30);
        }
        
        // Show critical damage message
        if (this.game.hud && this.game.hud.showMessage) {
            this.game.hud.showMessage('CRITICAL HIT!', 1500);
        }
        
        // End riposte window
        this.riposteWindowActive = false;
        this.staggeredEnemy = null;
        
        return true;
    }
    
    // Check if attack was parried (legacy method for compatibility)
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
