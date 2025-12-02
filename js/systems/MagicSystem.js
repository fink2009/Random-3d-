/**
 * MagicSystem.js - Magic/Spell System
 * Handles FP, spells, and magical effects
 */

import * as THREE from 'three';

export class MagicSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Active spells
        this.activeSpells = [];
        this.projectiles = [];
        
        // Spell definitions
        this.spells = {
            fireball: {
                name: 'Fireball',
                fpCost: 30,
                damage: 60,
                castTime: 0.5,
                cooldown: 1.5,
                projectileSpeed: 25,
                aoeRadius: 4,
                color: 0xff4400,
                description: 'Hurls a ball of fire that explodes on impact'
            },
            heal: {
                name: 'Heal',
                fpCost: 40,
                healAmount: 50,
                castTime: 1.0,
                cooldown: 3.0,
                duration: 2.0,
                color: 0xffdd44,
                description: 'Restore health over time'
            },
            soulArrow: {
                name: 'Soul Arrow',
                fpCost: 15,
                damage: 35,
                castTime: 0.3,
                cooldown: 0.8,
                projectileSpeed: 40,
                color: 0x4488ff,
                description: 'A fast magic projectile'
            },
            lightningSpear: {
                name: 'Lightning Spear',
                fpCost: 45,
                damage: 80,
                castTime: 0.8,
                cooldown: 2.0,
                projectileSpeed: 60,
                color: 0xffffaa,
                description: 'A devastating bolt of lightning'
            }
        };
        
        // Player spell state
        this.currentSpell = 'fireball';
        this.spellCooldowns = {};
        this.isCasting = false;
        this.castTimer = 0;
        this.pendingSpell = null;
        
        // Heal over time tracking
        this.healingActive = false;
        this.healingTimer = 0;
        this.healingAmount = 0;
        
        // Setup input
        this.setupInput();
    }
    
    setupInput() {
        // Q - Cast current offensive spell
        // F - Cast heal
        // 1,2,3,4 - Select spell
        document.addEventListener('keydown', (e) => {
            if (this.game.isPaused) return;
            
            switch (e.code) {
                case 'KeyQ':
                    this.castSpell(this.currentSpell);
                    break;
                case 'KeyF':
                    this.castSpell('heal');
                    break;
                case 'Digit1':
                    this.selectSpell('fireball');
                    break;
                case 'Digit2':
                    this.selectSpell('soulArrow');
                    break;
                case 'Digit3':
                    this.selectSpell('lightningSpear');
                    break;
            }
        });
    }
    
    selectSpell(spellName) {
        if (this.spells[spellName]) {
            this.currentSpell = spellName;
            this.showSpellNotification(this.spells[spellName].name);
        }
    }
    
    showSpellNotification(spellName) {
        if (this.game.hud && this.game.hud.showMessage) {
            this.game.hud.showMessage(`Spell: ${spellName}`, 1500);
        }
    }
    
    canCast(spellName) {
        const player = this.game.player;
        const spell = this.spells[spellName];
        
        if (!spell || !player) return false;
        if (this.isCasting) return false;
        if (player.state === 'dead' || player.state === 'staggered' || player.state === 'rolling') return false;
        if (player.mana < spell.fpCost) return false;
        if (this.spellCooldowns[spellName] > 0) return false;
        
        return true;
    }
    
    castSpell(spellName) {
        if (!this.canCast(spellName)) return;
        
        const player = this.game.player;
        const spell = this.spells[spellName];
        
        // Consume FP
        player.mana -= spell.fpCost;
        
        // Start casting
        this.isCasting = true;
        this.castTimer = spell.castTime;
        this.pendingSpell = spellName;
        
        // Set cooldown
        this.spellCooldowns[spellName] = spell.cooldown;
        
        // Casting visual effect
        this.spawnCastingEffect(player.position, spell.color);
    }
    
    update(deltaTime) {
        // Update cooldowns
        for (const spell in this.spellCooldowns) {
            if (this.spellCooldowns[spell] > 0) {
                this.spellCooldowns[spell] -= deltaTime;
            }
        }
        
        // Update casting
        if (this.isCasting) {
            this.castTimer -= deltaTime;
            
            if (this.castTimer <= 0) {
                this.executeSpell(this.pendingSpell);
                this.isCasting = false;
                this.pendingSpell = null;
            }
        }
        
        // Update heal over time
        if (this.healingActive) {
            this.updateHealing(deltaTime);
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
    }
    
    executeSpell(spellName) {
        const player = this.game.player;
        const spell = this.spells[spellName];
        
        switch (spellName) {
            case 'fireball':
                this.spawnFireball(player);
                break;
            case 'heal':
                this.activateHeal(player, spell);
                break;
            case 'soulArrow':
                this.spawnSoulArrow(player);
                break;
            case 'lightningSpear':
                this.spawnLightningSpear(player);
                break;
        }
    }
    
    // ==========================================
    // FIREBALL
    // ==========================================
    
    spawnFireball(player) {
        const spell = this.spells.fireball;
        
        // Get direction player is facing
        const direction = new THREE.Vector3(
            Math.sin(player.rotation),
            0,
            Math.cos(player.rotation)
        );
        
        // If locked on, aim at target
        if (player.lockedTarget) {
            direction.subVectors(player.lockedTarget.position, player.position);
            direction.y += 1; // Aim at center mass
            direction.normalize();
        }
        
        // Create fireball mesh
        const geometry = new THREE.SphereGeometry(0.4, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: spell.color,
            emissive: spell.color,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.9
        });
        
        const fireball = new THREE.Mesh(geometry, material);
        
        // Start position
        const startPos = player.position.clone();
        startPos.y += 1.2;
        startPos.add(direction.clone().multiplyScalar(1));
        fireball.position.copy(startPos);
        
        // Add point light
        const light = new THREE.PointLight(spell.color, 2, 10);
        fireball.add(light);
        
        this.scene.add(fireball);
        
        // Add to projectiles
        this.projectiles.push({
            mesh: fireball,
            type: 'fireball',
            direction: direction.clone(),
            speed: spell.projectileSpeed,
            damage: spell.damage,
            aoeRadius: spell.aoeRadius,
            owner: 'player',
            life: 5,
            color: spell.color
        });
    }
    
    // ==========================================
    // SOUL ARROW
    // ==========================================
    
    spawnSoulArrow(player) {
        const spell = this.spells.soulArrow;
        
        // Get direction
        const direction = new THREE.Vector3(
            Math.sin(player.rotation),
            0,
            Math.cos(player.rotation)
        );
        
        if (player.lockedTarget) {
            direction.subVectors(player.lockedTarget.position, player.position);
            direction.y += 1;
            direction.normalize();
        }
        
        // Create arrow mesh
        const geometry = new THREE.ConeGeometry(0.15, 1, 8);
        const material = new THREE.MeshStandardMaterial({
            color: spell.color,
            emissive: spell.color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        
        const arrow = new THREE.Mesh(geometry, material);
        
        // Rotate to point forward
        arrow.rotation.x = Math.PI / 2;
        
        const startPos = player.position.clone();
        startPos.y += 1.2;
        startPos.add(direction.clone().multiplyScalar(1));
        arrow.position.copy(startPos);
        
        // Make arrow face the direction of travel
        arrow.lookAt(arrow.position.clone().add(direction));
        arrow.rotateX(Math.PI / 2);
        
        // Add glow
        const light = new THREE.PointLight(spell.color, 1, 5);
        arrow.add(light);
        
        this.scene.add(arrow);
        
        this.projectiles.push({
            mesh: arrow,
            type: 'soulArrow',
            direction: direction.clone(),
            speed: spell.projectileSpeed,
            damage: spell.damage,
            owner: 'player',
            life: 3,
            color: spell.color
        });
    }
    
    // ==========================================
    // LIGHTNING SPEAR
    // ==========================================
    
    spawnLightningSpear(player) {
        const spell = this.spells.lightningSpear;
        
        const direction = new THREE.Vector3(
            Math.sin(player.rotation),
            0,
            Math.cos(player.rotation)
        );
        
        if (player.lockedTarget) {
            direction.subVectors(player.lockedTarget.position, player.position);
            direction.y += 1;
            direction.normalize();
        }
        
        // Create lightning bolt mesh
        const geometry = new THREE.CylinderGeometry(0.05, 0.15, 2, 6);
        const material = new THREE.MeshStandardMaterial({
            color: spell.color,
            emissive: 0xffffcc,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.95
        });
        
        const spear = new THREE.Mesh(geometry, material);
        
        const startPos = player.position.clone();
        startPos.y += 1.2;
        startPos.add(direction.clone().multiplyScalar(1));
        spear.position.copy(startPos);
        
        // Rotate to point in direction
        spear.lookAt(spear.position.clone().add(direction));
        spear.rotateX(Math.PI / 2);
        
        // Bright light
        const light = new THREE.PointLight(0xffffaa, 3, 15);
        spear.add(light);
        
        this.scene.add(spear);
        
        this.projectiles.push({
            mesh: spear,
            type: 'lightningSpear',
            direction: direction.clone(),
            speed: spell.projectileSpeed,
            damage: spell.damage,
            owner: 'player',
            life: 2,
            color: spell.color
        });
    }
    
    // ==========================================
    // HEAL
    // ==========================================
    
    activateHeal(player, spell) {
        this.healingActive = true;
        this.healingTimer = spell.duration;
        this.healingAmount = spell.healAmount;
        this.healingPerSecond = spell.healAmount / spell.duration;
        
        // Visual effect on player
        this.spawnHealEffect(player.position);
        
        if (this.game.hud && this.game.hud.showMessage) {
            this.game.hud.showMessage('Healing...', 2000);
        }
    }
    
    updateHealing(deltaTime) {
        const player = this.game.player;
        if (!player) return;
        
        // Heal over time
        const healThisFrame = this.healingPerSecond * deltaTime;
        player.health = Math.min(player.maxHealth, player.health + healThisFrame);
        
        // Spawn occasional heal particles
        if (Math.random() < 0.3) {
            this.spawnHealParticle(player.position);
        }
        
        this.healingTimer -= deltaTime;
        if (this.healingTimer <= 0) {
            this.healingActive = false;
        }
    }
    
    // ==========================================
    // PROJECTILE MANAGEMENT
    // ==========================================
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Move projectile
            proj.mesh.position.add(
                proj.direction.clone().multiplyScalar(proj.speed * deltaTime)
            );
            
            // Update lifetime
            proj.life -= deltaTime;
            
            // Check for collisions
            const hit = this.checkProjectileCollision(proj);
            
            if (hit || proj.life <= 0) {
                // Explode fireball
                if (proj.type === 'fireball' && hit) {
                    this.explodeFireball(proj);
                } else if (hit) {
                    // Impact particles for other spells
                    this.game.particleSystem.spawnHitSparks(proj.mesh.position.clone(), 15);
                }
                
                // Remove projectile
                this.scene.remove(proj.mesh);
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
                this.projectiles.splice(i, 1);
            } else {
                // Spawn trail particles
                if (Math.random() < 0.5) {
                    this.spawnTrailParticle(proj);
                }
            }
        }
    }
    
    checkProjectileCollision(proj) {
        const pos = proj.mesh.position;
        
        // Check ground collision
        const groundHeight = this.game.world.getHeightAt(pos.x, pos.z);
        if (pos.y < groundHeight + 0.5) {
            return { type: 'ground', position: pos.clone() };
        }
        
        // Check enemy collision
        for (const enemy of this.game.enemies) {
            if (!enemy.isAlive) continue;
            
            const dist = pos.distanceTo(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)));
            if (dist < 1.5) {
                // Deal damage
                enemy.takeDamage(proj.damage, pos);
                return { type: 'enemy', target: enemy, position: pos.clone() };
            }
        }
        
        // Check boss collision
        for (const boss of this.game.bosses) {
            if (!boss.isAlive) continue;
            
            const dist = pos.distanceTo(boss.position.clone().add(new THREE.Vector3(0, 2, 0)));
            if (dist < 3) {
                boss.takeDamage(proj.damage, pos);
                return { type: 'boss', target: boss, position: pos.clone() };
            }
        }
        
        return null;
    }
    
    explodeFireball(proj) {
        const spell = this.spells.fireball;
        const pos = proj.mesh.position;
        
        // Spawn explosion particles
        this.game.particleSystem.spawnFire(pos.clone(), 30);
        this.game.particleSystem.spawnDustCloud(pos.clone(), 20);
        
        // AOE damage
        const aoeRadius = proj.aoeRadius;
        
        // Damage enemies in radius
        for (const enemy of this.game.enemies) {
            if (!enemy.isAlive) continue;
            
            const dist = pos.distanceTo(enemy.position);
            if (dist < aoeRadius) {
                const falloff = 1 - (dist / aoeRadius);
                const aoeDamage = Math.floor(proj.damage * 0.5 * falloff);
                enemy.takeDamage(aoeDamage, pos);
            }
        }
        
        // Damage bosses
        for (const boss of this.game.bosses) {
            if (!boss.isAlive) continue;
            
            const dist = pos.distanceTo(boss.position);
            if (dist < aoeRadius + 2) {
                const falloff = 1 - (dist / (aoeRadius + 2));
                const aoeDamage = Math.floor(proj.damage * 0.5 * falloff);
                boss.takeDamage(aoeDamage, pos);
            }
        }
    }
    
    // ==========================================
    // VISUAL EFFECTS
    // ==========================================
    
    spawnCastingEffect(position, color) {
        const pos = position.clone();
        pos.y += 1.5;
        
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const particlePos = pos.clone();
            particlePos.x += Math.cos(angle) * 0.5;
            particlePos.z += Math.sin(angle) * 0.5;
            
            this.game.particleSystem.createParticle({
                position: particlePos,
                velocity: new THREE.Vector3(0, 2, 0),
                color: color,
                size: 0.15,
                life: 0.5,
                gravity: -2,
                emissive: true
            });
        }
    }
    
    spawnHealEffect(position) {
        const pos = position.clone();
        pos.y += 1;
        
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const particlePos = pos.clone();
            particlePos.x += Math.cos(angle) * 1;
            particlePos.z += Math.sin(angle) * 1;
            
            this.game.particleSystem.createParticle({
                position: particlePos,
                velocity: new THREE.Vector3(0, 3, 0),
                color: 0xffdd44,
                size: 0.2,
                life: 1,
                gravity: -1,
                emissive: true
            });
        }
    }
    
    spawnHealParticle(position) {
        const pos = position.clone();
        pos.y += 0.5 + Math.random();
        pos.x += (Math.random() - 0.5) * 1;
        pos.z += (Math.random() - 0.5) * 1;
        
        this.game.particleSystem.createParticle({
            position: pos,
            velocity: new THREE.Vector3(0, 2, 0),
            color: 0xffdd44,
            size: 0.15,
            life: 0.8,
            gravity: -2,
            emissive: true
        });
    }
    
    spawnTrailParticle(proj) {
        const pos = proj.mesh.position.clone();
        pos.x += (Math.random() - 0.5) * 0.3;
        pos.y += (Math.random() - 0.5) * 0.3;
        pos.z += (Math.random() - 0.5) * 0.3;
        
        this.game.particleSystem.createParticle({
            position: pos,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ),
            color: proj.color,
            size: 0.1,
            life: 0.3,
            gravity: 0,
            emissive: true
        });
    }
    
    // Get spell info for HUD
    getCurrentSpellInfo() {
        return this.spells[this.currentSpell];
    }
    
    getSpellCooldown(spellName) {
        return this.spellCooldowns[spellName] || 0;
    }
}
