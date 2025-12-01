/**
 * Enemy.js - Enemy AI and behavior
 * Handles patrol, detection, combat AI
 */

import * as THREE from 'three';

export class Enemy {
    constructor(game, type = 'melee') {
        this.game = game;
        this.scene = game.scene;
        this.type = type; // 'melee', 'ranged', 'heavy'
        
        // Mesh
        this.mesh = null;
        
        // Position and movement
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        
        // Stats based on type
        this.setStatsByType(type);
        
        // State machine
        this.state = 'idle'; // idle, patrol, chase, attack, staggered, dead
        this.stateTimer = 0;
        this.isAlive = true;
        
        // AI behavior
        this.detectionRadius = 15;
        this.attackRange = 2.5;
        this.loseAggroRange = 30;
        this.hasAggro = false;
        
        // Patrol
        this.spawnPoint = new THREE.Vector3();
        this.patrolPoint = new THREE.Vector3();
        this.patrolRadius = 10;
        this.patrolWaitTime = 2;
        
        // Combat
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackDuration = 0.8;
        this.attackTimer = 0;
        this.windUpTime = 0.3; // Telegraph before attack
        
        // Hit feedback
        this.isHit = false;
        this.hitCooldown = 0;
        
        // Death
        this.deathTimer = 3;
        
        // Poise system
        this.poise = this.maxPoise;
        this.poiseRegenRate = 10;
        this.poiseRegenDelay = 2;
        this.poiseTimer = 0;
        
        // Souls reward
        this.soulsReward = 50;
        
        // Is this a boss?
        this.isBoss = false;
    }
    
    setStatsByType(type) {
        switch (type) {
            case 'melee':
                this.maxHealth = 80;
                this.health = 80;
                this.damage = 20;
                this.moveSpeed = 4;
                this.attackRange = 2.5;
                this.attackCooldownTime = 1.5;
                this.maxPoise = 30;
                this.soulsReward = 50;
                break;
            case 'ranged':
                this.maxHealth = 50;
                this.health = 50;
                this.damage = 15;
                this.moveSpeed = 3;
                this.attackRange = 15;
                this.attackCooldownTime = 2;
                this.maxPoise = 15;
                this.soulsReward = 40;
                break;
            case 'heavy':
                this.maxHealth = 150;
                this.health = 150;
                this.damage = 40;
                this.moveSpeed = 2;
                this.attackRange = 3;
                this.attackCooldownTime = 2.5;
                this.maxPoise = 60;
                this.soulsReward = 100;
                break;
        }
        
        this.poise = this.maxPoise;
    }
    
    init(x, y, z) {
        this.position.set(x, y, z);
        this.spawnPoint.set(x, y, z);
        this.patrolPoint.copy(this.spawnPoint);
        
        this.createMesh();
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // Different appearances based on type
        let bodyColor, size;
        
        switch (this.type) {
            case 'melee':
                bodyColor = 0x4a3030;
                size = 1;
                break;
            case 'ranged':
                bodyColor = 0x303a4a;
                size = 0.9;
                break;
            case 'heavy':
                bodyColor = 0x3a3a3a;
                size = 1.3;
                break;
        }
        
        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.4 * size, 1.2 * size, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: bodyColor,
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1 * size;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25 * size, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            emissive: 0x330000,
            emissiveIntensity: 0.3
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.85 * size;
        head.castShadow = true;
        group.add(head);
        
        // Eyes (glowing red)
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        
        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 * size, 8, 8),
            eyeMaterial
        );
        leftEye.position.set(-0.1 * size, 1.9 * size, 0.2 * size);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.05 * size, 8, 8),
            eyeMaterial
        );
        rightEye.position.set(0.1 * size, 1.9 * size, 0.2 * size);
        group.add(rightEye);
        
        // Weapon for melee/heavy types
        if (this.type === 'melee' || this.type === 'heavy') {
            const weaponSize = this.type === 'heavy' ? 1.5 : 1;
            const weapon = new THREE.Mesh(
                new THREE.BoxGeometry(0.1 * weaponSize, 1.5 * weaponSize, 0.05 * weaponSize),
                new THREE.MeshStandardMaterial({
                    color: 0x555555,
                    roughness: 0.4,
                    metalness: 0.8
                })
            );
            weapon.position.set(0.5 * size, 1 * size, 0);
            weapon.rotation.z = -0.5;
            weapon.castShadow = true;
            group.add(weapon);
            this.weaponMesh = weapon;
        }
        
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
        this.regeneratePoise(deltaTime);
        
        // State machine
        switch (this.state) {
            case 'idle':
                this.updateIdle(deltaTime);
                break;
            case 'patrol':
                this.updatePatrol(deltaTime);
                break;
            case 'chase':
                this.updateChase(deltaTime);
                break;
            case 'attack':
                this.updateAttack(deltaTime);
                break;
            case 'staggered':
                this.updateStaggered(deltaTime);
                break;
        }
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Update mesh
        this.updateMesh();
    }
    
    updateIdle(deltaTime) {
        // Check for player detection
        if (this.detectPlayer()) {
            this.state = 'chase';
            this.hasAggro = true;
            return;
        }
        
        // Transition to patrol after waiting
        if (this.stateTimer <= 0) {
            this.setNewPatrolPoint();
            this.state = 'patrol';
        }
    }
    
    updatePatrol(deltaTime) {
        // Check for player detection
        if (this.detectPlayer()) {
            this.state = 'chase';
            this.hasAggro = true;
            return;
        }
        
        // Move towards patrol point
        const toPatrol = new THREE.Vector3();
        toPatrol.subVectors(this.patrolPoint, this.position);
        toPatrol.y = 0;
        
        const distance = toPatrol.length();
        
        if (distance < 1) {
            // Reached patrol point
            this.state = 'idle';
            this.stateTimer = this.patrolWaitTime;
            this.velocity.set(0, 0, 0);
        } else {
            // Move towards patrol point
            toPatrol.normalize();
            this.velocity.x = toPatrol.x * this.moveSpeed * 0.5;
            this.velocity.z = toPatrol.z * this.moveSpeed * 0.5;
            this.rotation = Math.atan2(toPatrol.x, toPatrol.z);
        }
    }
    
    updateChase(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        // Check if player is out of range
        if (distance > this.loseAggroRange) {
            this.hasAggro = false;
            this.state = 'idle';
            this.stateTimer = 2;
            return;
        }
        
        // Face player
        toPlayer.normalize();
        this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
        
        // Attack if in range
        if (distance <= this.attackRange && this.attackCooldown <= 0) {
            this.startAttack();
            return;
        }
        
        // Move towards player
        if (distance > this.attackRange * 0.8) {
            this.velocity.x = toPlayer.x * this.moveSpeed;
            this.velocity.z = toPlayer.z * this.moveSpeed;
        } else {
            this.velocity.set(0, 0, 0);
        }
    }
    
    startAttack() {
        this.state = 'attack';
        this.isAttacking = true;
        this.attackTimer = 0;
        this.velocity.set(0, 0, 0);
        
        // Wind-up animation
        if (this.weaponMesh) {
            this.weaponMesh.rotation.z = -1.5;
        }
    }
    
    updateAttack(deltaTime) {
        this.attackTimer += deltaTime;
        
        // Wind-up phase (telegraph)
        if (this.attackTimer < this.windUpTime) {
            // Shake slightly to telegraph attack
            if (this.mesh) {
                this.mesh.position.x = this.position.x + (Math.random() - 0.5) * 0.05;
            }
            return;
        }
        
        // Execute attack at specific frame
        if (this.attackTimer >= this.windUpTime && this.attackTimer < this.windUpTime + 0.1) {
            this.executeAttack();
            
            // Swing animation
            if (this.weaponMesh) {
                this.weaponMesh.rotation.z = 1;
            }
        }
        
        // Recovery phase
        if (this.attackTimer >= this.attackDuration) {
            this.endAttack();
        }
    }
    
    executeAttack() {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        if (distance <= this.attackRange + 0.5) {
            // Check if player is roughly in front
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
            
            if (angle < Math.PI / 2) {
                // Hit player
                player.takeDamage(this.damage, this.position);
            }
        }
    }
    
    endAttack() {
        this.state = 'chase';
        this.isAttacking = false;
        this.attackCooldown = this.attackCooldownTime;
        
        // Reset weapon position
        if (this.weaponMesh) {
            this.weaponMesh.rotation.z = -0.5;
        }
    }
    
    updateStaggered(deltaTime) {
        // Shake effect
        if (this.mesh) {
            this.mesh.position.x = this.position.x + (Math.random() - 0.5) * 0.1;
            this.mesh.position.z = this.position.z + (Math.random() - 0.5) * 0.1;
        }
        
        if (this.stateTimer <= 0) {
            this.state = 'chase';
            this.poise = this.maxPoise;
        }
    }
    
    detectPlayer() {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        if (distance <= this.detectionRadius) {
            // Check line of sight (simplified - just distance for now)
            return true;
        }
        
        return false;
    }
    
    setNewPatrolPoint() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.patrolRadius;
        
        this.patrolPoint.set(
            this.spawnPoint.x + Math.cos(angle) * distance,
            this.spawnPoint.y,
            this.spawnPoint.z + Math.sin(angle) * distance
        );
        
        // Adjust for terrain
        this.patrolPoint.y = this.game.world.getHeightAt(
            this.patrolPoint.x,
            this.patrolPoint.z
        );
    }
    
    takeDamage(amount, source) {
        if (!this.isAlive) return;
        
        this.health -= amount;
        this.isHit = true;
        this.hitCooldown = 0.3;
        
        // Damage poise
        this.poise -= amount;
        this.poiseTimer = this.poiseRegenDelay;
        
        // Show damage number
        this.game.hud.showDamage(amount, this.position);
        
        // Aggro on hit
        if (!this.hasAggro) {
            this.hasAggro = true;
            this.state = 'chase';
        }
        
        // Check for stagger
        if (this.poise <= 0 && this.state !== 'staggered') {
            this.stagger();
        }
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
        
        // Knockback
        const knockback = new THREE.Vector3();
        knockback.subVectors(this.position, source);
        knockback.y = 0;
        knockback.normalize();
        knockback.multiplyScalar(2);
        
        this.velocity.add(knockback);
    }
    
    stagger() {
        this.state = 'staggered';
        this.stateTimer = 1;
        this.isAttacking = false;
        this.poise = 0;
    }
    
    regeneratePoise(deltaTime) {
        if (this.poiseTimer > 0) {
            this.poiseTimer -= deltaTime;
            return;
        }
        
        if (this.poise < this.maxPoise) {
            this.poise = Math.min(
                this.maxPoise,
                this.poise + this.poiseRegenRate * deltaTime
            );
        }
    }
    
    die() {
        this.isAlive = false;
        this.state = 'dead';
        
        // Grant souls to player
        this.game.progressionSystem.addSouls(this.soulsReward);
        
        // Death animation
        if (this.mesh) {
            // Fade out
            this.mesh.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true;
                }
            });
            
            const fadeOut = () => {
                if (!this.mesh) return;
                
                let allFaded = true;
                this.mesh.traverse((child) => {
                    if (child.material && child.material.opacity > 0) {
                        child.material.opacity -= 0.02;
                        allFaded = false;
                    }
                });
                
                this.mesh.rotation.x = Math.min(this.mesh.rotation.x + 0.05, Math.PI / 2);
                this.mesh.position.y -= 0.01;
                
                if (!allFaded) {
                    requestAnimationFrame(fadeOut);
                }
            };
            
            fadeOut();
        }
    }
    
    respawn() {
        this.isAlive = true;
        this.health = this.maxHealth;
        this.poise = this.maxPoise;
        this.state = 'idle';
        this.stateTimer = 2;
        this.hasAggro = false;
        this.deathTimer = 3;
        
        // Reset position
        this.position.copy(this.spawnPoint);
        this.velocity.set(0, 0, 0);
        
        // Reset mesh
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.material) {
                    child.material.opacity = 1;
                }
            });
            this.mesh.rotation.x = 0;
            this.mesh.position.copy(this.position);
        } else {
            this.createMesh();
        }
    }
    
    applyPhysics(deltaTime) {
        // Apply velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Get ground height with safety check
        const groundHeight = this.game.world.getHeightAt(this.position.x, this.position.z);
        const safeGroundHeight = Number.isFinite(groundHeight) ? groundHeight : 0;
        this.position.y = safeGroundHeight + 0.1;
        
        // Ensure position values are valid
        if (!Number.isFinite(this.position.x)) this.position.x = this.spawnPoint.x;
        if (!Number.isFinite(this.position.y)) this.position.y = this.spawnPoint.y;
        if (!Number.isFinite(this.position.z)) this.position.z = this.spawnPoint.z;
        
        // Friction
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
    }
    
    updateMesh() {
        if (!this.mesh) return;
        
        if (this.state !== 'staggered') {
            this.mesh.position.copy(this.position);
        }
        this.mesh.rotation.y = this.rotation;
    }
    
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.mesh = null;
        }
    }
}
