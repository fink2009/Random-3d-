/**
 * Boss.js - Boss Enemy
 * Large boss with multiple phases and unique attack patterns
 */

import * as THREE from 'three';

export class Boss {
    constructor(game, name = 'Ancient Guardian') {
        this.game = game;
        this.scene = game.scene;
        this.name = name;
        
        // Mesh
        this.mesh = null;
        this.weaponMesh = null;
        
        // Position
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        
        // Stats
        this.maxHealth = 1000;
        this.health = 1000;
        this.damage = 50;
        this.moveSpeed = 3;
        this.attackRange = 5;
        
        // State
        this.state = 'idle'; // idle, chase, attack, special, staggered, phase_transition, dead
        this.stateTimer = 0;
        this.isAlive = true;
        this.isBoss = true;
        
        // Phases
        this.phase = 1;
        this.maxPhases = 2;
        this.phaseThresholds = [0.5]; // Health % for phase transitions
        
        // Combat
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.currentAttack = null;
        
        // Attack patterns per phase
        this.attackPatterns = {
            1: ['swing', 'slam', 'combo'],
            2: ['swing', 'slam', 'combo', 'charge', 'aoe']
        };
        
        // Detection
        this.detectionRadius = 40;
        this.hasAggro = false;
        this.arenaCenter = new THREE.Vector3();
        this.arenaRadius = 25;
        
        // Poise
        this.maxPoise = 150;
        this.poise = 150;
        this.poiseRegenTimer = 0;
        
        // Hit feedback
        this.isHit = false;
        this.hitCooldown = 0;
        
        // Death
        this.deathTimer = 5;
        
        // Souls reward
        this.soulsReward = 2000;
    }
    
    init(x, y, z) {
        this.position.set(x, y, z);
        this.arenaCenter.set(x, y, z);
        this.createMesh();
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // Large armored body
        const bodyGeometry = new THREE.CapsuleGeometry(1, 3, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a3a4a,
            roughness: 0.6,
            metalness: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 2.5;
        body.castShadow = true;
        group.add(body);
        
        // Armored shoulders
        const shoulderGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const armorMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a5a,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const leftShoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
        leftShoulder.position.set(-1.2, 3.5, 0);
        leftShoulder.castShadow = true;
        group.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
        rightShoulder.position.set(1.2, 3.5, 0);
        rightShoulder.castShadow = true;
        group.add(rightShoulder);
        
        // Helmet/head
        const helmetGeometry = new THREE.ConeGeometry(0.5, 1, 8);
        const helmet = new THREE.Mesh(helmetGeometry, armorMaterial);
        helmet.position.y = 4.5;
        helmet.rotation.x = Math.PI;
        helmet.castShadow = true;
        group.add(helmet);
        
        // Glowing eyes
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            emissive: 0xff3300,
            emissiveIntensity: 1
        });
        
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 4.3, 0.4);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 4.3, 0.4);
        group.add(rightEye);
        
        // Giant weapon
        const weaponGroup = new THREE.Group();
        
        const bladeGeometry = new THREE.BoxGeometry(0.3, 4, 0.1);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.3,
            metalness: 0.9
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 2;
        blade.castShadow = true;
        weaponGroup.add(blade);
        
        const handleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3020,
            roughness: 0.8
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.5;
        weaponGroup.add(handle);
        
        weaponGroup.position.set(1.5, 2, 0);
        weaponGroup.rotation.z = -0.3;
        group.add(weaponGroup);
        this.weaponMesh = weaponGroup;
        
        // Cape/cloak
        const capeGeometry = new THREE.PlaneGeometry(2, 3);
        const capeMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        const cape = new THREE.Mesh(capeGeometry, capeMaterial);
        cape.position.set(0, 2.5, 0.8);
        cape.rotation.x = 0.2;
        group.add(cape);
        
        // Point light for dramatic effect
        const light = new THREE.PointLight(0xff3300, 1, 10);
        light.position.y = 4;
        group.add(light);
        
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        if (!this.isAlive) {
            this.deathTimer -= deltaTime;
            return;
        }
        
        // Update timers
        this.stateTimer -= deltaTime;
        this.attackCooldown -= deltaTime;
        this.hitCooldown -= deltaTime;
        
        if (this.hitCooldown <= 0) {
            this.isHit = false;
        }
        
        // Regenerate poise
        if (this.poiseRegenTimer > 0) {
            this.poiseRegenTimer -= deltaTime;
        } else if (this.poise < this.maxPoise) {
            this.poise = Math.min(this.maxPoise, this.poise + 20 * deltaTime);
        }
        
        // Check for phase transition
        this.checkPhaseTransition();
        
        // State machine
        switch (this.state) {
            case 'idle':
                this.updateIdle(deltaTime);
                break;
            case 'chase':
                this.updateChase(deltaTime);
                break;
            case 'attack':
                this.updateAttack(deltaTime);
                break;
            case 'special':
                this.updateSpecial(deltaTime);
                break;
            case 'staggered':
                this.updateStaggered(deltaTime);
                break;
            case 'phase_transition':
                this.updatePhaseTransition(deltaTime);
                break;
        }
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Update mesh
        this.updateMesh();
        
        // Update boss health bar when in combat
        if (this.hasAggro) {
            this.updateHealthBar();
        }
    }
    
    updateIdle(deltaTime) {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        if (distance < this.detectionRadius) {
            this.hasAggro = true;
            this.state = 'chase';
            this.showBossHealthBar();
        }
    }
    
    updateChase(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        // Face player
        toPlayer.normalize();
        this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
        
        // Attack if in range
        if (distance <= this.attackRange && this.attackCooldown <= 0) {
            this.startAttack();
            return;
        }
        
        // Move towards player
        if (distance > this.attackRange * 0.7) {
            this.velocity.x = toPlayer.x * this.moveSpeed;
            this.velocity.z = toPlayer.z * this.moveSpeed;
        } else {
            this.velocity.set(0, 0, 0);
        }
    }
    
    startAttack() {
        const patterns = this.attackPatterns[this.phase];
        this.currentAttack = patterns[Math.floor(Math.random() * patterns.length)];
        
        this.state = 'attack';
        this.isAttacking = true;
        this.attackTimer = 0;
        this.velocity.set(0, 0, 0);
        
        console.log(`Boss attack: ${this.currentAttack}`);
    }
    
    updateAttack(deltaTime) {
        this.attackTimer += deltaTime;
        
        switch (this.currentAttack) {
            case 'swing':
                this.executeSwing(deltaTime);
                break;
            case 'slam':
                this.executeSlam(deltaTime);
                break;
            case 'combo':
                this.executeCombo(deltaTime);
                break;
            case 'charge':
                this.executeCharge(deltaTime);
                break;
            case 'aoe':
                this.executeAOE(deltaTime);
                break;
        }
    }
    
    executeSwing(deltaTime) {
        const windUp = 0.5;
        const execute = 0.3;
        const recovery = 0.4;
        
        if (this.attackTimer < windUp) {
            // Wind-up
            if (this.weaponMesh) {
                this.weaponMesh.rotation.z = -1.5;
            }
        } else if (this.attackTimer < windUp + execute) {
            // Execute
            if (this.weaponMesh) {
                this.weaponMesh.rotation.z = 1;
            }
            
            // Deal damage
            if (this.attackTimer < windUp + 0.1) {
                this.dealDamage(this.damage, this.attackRange);
            }
        } else if (this.attackTimer > windUp + execute + recovery) {
            this.endAttack(1.5);
        }
    }
    
    executeSlam(deltaTime) {
        const windUp = 1.0;
        const execute = 0.2;
        const recovery = 0.8;
        
        if (this.attackTimer < windUp) {
            // Raise weapon
            if (this.weaponMesh) {
                const progress = this.attackTimer / windUp;
                this.weaponMesh.rotation.z = -0.3 - progress * 2;
                this.weaponMesh.position.y = 2 + progress * 2;
            }
        } else if (this.attackTimer < windUp + execute) {
            // Slam down
            if (this.weaponMesh) {
                this.weaponMesh.rotation.z = 0.5;
                this.weaponMesh.position.y = 1;
            }
            
            // AoE damage
            if (this.attackTimer < windUp + 0.1) {
                this.dealDamage(this.damage * 1.5, this.attackRange + 2);
                
                // Spawn ground particles
                this.game.particleSystem.spawnDustCloud(
                    this.position.clone(),
                    30
                );
            }
        } else if (this.attackTimer > windUp + execute + recovery) {
            this.endAttack(2);
        }
    }
    
    executeCombo(deltaTime) {
        const hitTimes = [0.3, 0.7, 1.2];
        const totalDuration = 2;
        
        // Three hit combo
        for (let i = 0; i < hitTimes.length; i++) {
            const hitTime = hitTimes[i];
            if (this.attackTimer >= hitTime && this.attackTimer < hitTime + 0.1) {
                this.dealDamage(this.damage * 0.7, this.attackRange);
                
                // Animate weapon
                if (this.weaponMesh) {
                    this.weaponMesh.rotation.z = (i % 2 === 0) ? 1.5 : -1.5;
                }
            }
        }
        
        if (this.attackTimer > totalDuration) {
            this.endAttack(2.5);
        }
    }
    
    executeCharge(deltaTime) {
        const chargeUp = 0.8;
        const charging = 1.5;
        
        if (this.attackTimer < chargeUp) {
            // Prepare to charge
            this.velocity.set(0, 0, 0);
            
            // Visual indicator
            if (this.mesh) {
                this.mesh.position.x = this.position.x + (Math.random() - 0.5) * 0.2;
            }
        } else if (this.attackTimer < chargeUp + charging) {
            // Charge forward
            const chargeSpeed = 20;
            this.velocity.x = Math.sin(this.rotation) * chargeSpeed;
            this.velocity.z = Math.cos(this.rotation) * chargeSpeed;
            
            // Damage if player is hit
            const player = this.game.player;
            const distance = this.position.distanceTo(player.position);
            if (distance < 2) {
                player.takeDamage(this.damage * 1.2, this.position);
            }
        } else {
            this.endAttack(3);
        }
    }
    
    executeAOE(deltaTime) {
        const chargeUp = 1.5;
        const execute = 0.3;
        
        if (this.attackTimer < chargeUp) {
            // Charge up with visual effect
            if (this.mesh) {
                const scale = 1 + Math.sin(this.attackTimer * 10) * 0.1;
                this.mesh.scale.set(scale, scale, scale);
            }
            
            // Spawn warning particles
            if (Math.random() < 0.3) {
                const pos = this.position.clone();
                pos.y += 2;
                this.game.particleSystem.spawnMagicParticle(pos);
            }
        } else if (this.attackTimer < chargeUp + execute) {
            // Big AOE blast
            if (this.attackTimer < chargeUp + 0.1) {
                // Damage all around
                const aoeRadius = 10;
                const player = this.game.player;
                const distance = this.position.distanceTo(player.position);
                
                if (distance < aoeRadius) {
                    player.takeDamage(this.damage * 0.8, this.position);
                }
                
                // Big particle effect
                this.game.particleSystem.spawnDustCloud(this.position.clone(), 50);
            }
            
            this.mesh.scale.set(1, 1, 1);
        } else {
            this.endAttack(3.5);
        }
    }
    
    dealDamage(amount, range) {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        if (distance <= range) {
            // Check facing
            const toPlayer = new THREE.Vector3();
            toPlayer.subVectors(player.position, this.position);
            toPlayer.y = 0;
            toPlayer.normalize();
            
            const facingDir = new THREE.Vector3(
                Math.sin(this.rotation),
                0,
                Math.cos(this.rotation)
            );
            
            const angle = Math.acos(facingDir.dot(toPlayer));
            
            if (angle < Math.PI * 0.7) {
                player.takeDamage(amount, this.position);
            }
        }
    }
    
    endAttack(cooldown) {
        this.state = 'chase';
        this.isAttacking = false;
        this.attackCooldown = cooldown;
        this.currentAttack = null;
        
        // Reset weapon
        if (this.weaponMesh) {
            this.weaponMesh.rotation.z = -0.3;
            this.weaponMesh.position.y = 2;
        }
    }
    
    updateSpecial(deltaTime) {
        // Phase 2 special attacks
        if (this.stateTimer <= 0) {
            this.state = 'chase';
        }
    }
    
    updateStaggered(deltaTime) {
        if (this.mesh) {
            this.mesh.position.x = this.position.x + (Math.random() - 0.5) * 0.15;
            this.mesh.position.z = this.position.z + (Math.random() - 0.5) * 0.15;
        }
        
        if (this.stateTimer <= 0) {
            this.state = 'chase';
            this.poise = this.maxPoise;
        }
    }
    
    updatePhaseTransition(deltaTime) {
        // Dramatic phase transition
        if (this.stateTimer > 2) {
            // Roar/power up animation
            if (this.mesh) {
                const scale = 1 + Math.sin(this.stateTimer * 5) * 0.2;
                this.mesh.scale.set(scale, scale, scale);
            }
        }
        
        if (this.stateTimer <= 0) {
            this.state = 'chase';
            this.mesh.scale.set(1, 1, 1);
            
            // Phase 2 enhancements
            this.moveSpeed *= 1.3;
            this.damage *= 1.2;
        }
    }
    
    checkPhaseTransition() {
        const healthPercent = this.health / this.maxHealth;
        
        for (let i = 0; i < this.phaseThresholds.length; i++) {
            if (this.phase === i + 1 && healthPercent <= this.phaseThresholds[i]) {
                this.enterPhase(i + 2);
                break;
            }
        }
    }
    
    enterPhase(phase) {
        this.phase = phase;
        this.state = 'phase_transition';
        this.stateTimer = 3;
        this.velocity.set(0, 0, 0);
        
        // Heal slightly on phase transition
        this.health += this.maxHealth * 0.1;
        this.health = Math.min(this.health, this.maxHealth);
        
        console.log(`Boss entering phase ${phase}!`);
    }
    
    takeDamage(amount, source) {
        if (!this.isAlive || this.state === 'phase_transition') return;
        
        this.health -= amount;
        this.isHit = true;
        this.hitCooldown = 0.2;
        
        // Damage poise
        this.poise -= amount * 0.5;
        this.poiseRegenTimer = 3;
        
        // Show damage
        this.game.hud.showDamage(amount, this.position);
        
        // Stagger check
        if (this.poise <= 0 && this.state !== 'staggered') {
            this.stagger();
        }
        
        // Death check
        if (this.health <= 0) {
            this.die();
        }
    }
    
    stagger() {
        this.state = 'staggered';
        this.stateTimer = 2;
        this.isAttacking = false;
        this.poise = 0;
    }
    
    die() {
        this.isAlive = false;
        this.state = 'dead';
        
        // Hide health bar
        this.hideBossHealthBar();
        
        // Grant souls
        this.game.progressionSystem.addSouls(this.soulsReward);
        
        // Victory screen
        this.game.showVictory(this.soulsReward);
        
        // Death animation
        if (this.mesh) {
            const fadeOut = () => {
                if (!this.mesh) return;
                
                let allFaded = true;
                this.mesh.traverse((child) => {
                    if (child.material) {
                        child.material.transparent = true;
                        if (child.material.opacity > 0) {
                            child.material.opacity -= 0.01;
                            allFaded = false;
                        }
                    }
                });
                
                this.mesh.rotation.x = Math.min(this.mesh.rotation.x + 0.02, Math.PI / 4);
                
                if (!allFaded) {
                    requestAnimationFrame(fadeOut);
                }
            };
            
            fadeOut();
        }
    }
    
    showBossHealthBar() {
        const container = document.getElementById('boss-health-container');
        container.classList.remove('hidden');
        document.getElementById('boss-name').textContent = this.name;
    }
    
    hideBossHealthBar() {
        document.getElementById('boss-health-container').classList.add('hidden');
    }
    
    updateHealthBar() {
        const fill = document.getElementById('boss-health-fill');
        fill.style.width = `${(this.health / this.maxHealth) * 100}%`;
    }
    
    applyPhysics(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Keep in arena
        const toCenter = new THREE.Vector3();
        toCenter.subVectors(this.arenaCenter, this.position);
        toCenter.y = 0;
        
        if (toCenter.length() > this.arenaRadius) {
            toCenter.normalize().multiplyScalar(this.arenaRadius);
            this.position.x = this.arenaCenter.x - toCenter.x;
            this.position.z = this.arenaCenter.z - toCenter.z;
        }
        
        // Ground height
        this.position.y = this.game.world.getHeightAt(this.position.x, this.position.z) + 0.1;
        
        // Friction
        this.velocity.x *= 0.95;
        this.velocity.z *= 0.95;
    }
    
    updateMesh() {
        if (!this.mesh) return;
        
        if (this.state !== 'staggered') {
            this.mesh.position.copy(this.position);
        }
        this.mesh.rotation.y = this.rotation;
    }
    
    respawn() {
        // Bosses don't respawn in the same way
        // Could implement for NG+
    }
    
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}
