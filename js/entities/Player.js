/**
 * Player.js - Player Character
 * Handles movement, combat, and the critical dodge roll system
 */

import * as THREE from 'three';

export class Player {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Player mesh/model
        this.mesh = null;
        this.weaponMesh = null;
        
        // Position and movement
        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = 0; // Y-axis rotation
        
        // Camera
        this.cameraOffset = new THREE.Vector3(0, 3, 6);
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;
        
        // Movement stats
        this.moveSpeed = 8;
        this.sprintSpeed = 14;
        this.acceleration = 50;
        this.deceleration = 30;
        this.jumpForce = 12;
        this.gravity = 30;
        
        // Character stats
        this.stats = {
            vigor: 10,
            endurance: 10,
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            faith: 10
        };
        
        // Derived stats
        this.maxHealth = 100;
        this.health = 100;
        this.maxStamina = 100;
        this.stamina = 100;
        this.maxMana = 50;
        this.mana = 50;
        
        // Stamina regeneration
        this.staminaRegenRate = 30;
        this.staminaRegenDelay = 0.8;
        this.staminaRegenTimer = 0;
        
        // State machine
        this.state = 'idle'; // idle, running, sprinting, rolling, attacking, blocking, staggered, dead
        this.stateTimer = 0;
        
        // Rolling system (HIGH PRIORITY)
        this.isRolling = false;
        this.rollDirection = new THREE.Vector3();
        this.rollSpeed = 18;
        this.rollDuration = 0.5;
        this.rollTimer = 0;
        this.rollCooldown = 0;
        this.rollStaminaCost = 20;
        
        // I-frames during roll
        this.hasIFrames = false;
        this.iFrameStart = 0.05;  // When i-frames begin (after roll starts)
        this.iFrameDuration = 0.35; // Duration of i-frames
        
        // Combat
        this.isAttacking = false;
        this.attackType = null; // 'light', 'heavy'
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.canCombo = false;
        this.comboCount = 0;
        
        // Blocking
        this.isBlocking = false;
        this.blockStaminaDrain = 15; // Per blocked hit
        
        // Lock-on system
        this.lockedTarget = null;
        this.lockOnRange = 30;
        
        // Collision
        this.collisionRadius = 0.5;
        this.isGrounded = false;
        
        // Physics constants
        this.groundCheckTolerance = 0.01;
        this.fallThroughThreshold = -10;
        
        // Position smoothing and sanity checks
        this.lastValidPosition = new THREE.Vector3(0, 5, 0);
        this.targetGroundY = 0;  // Target Y for smooth terrain following
        this.groundYLerpSpeed = 10;  // How fast to lerp to target ground height
        this.maxMovePerFrame = 10;  // Maximum distance allowed per frame to prevent teleporting
        
        // Equipment (affects roll speed, damage, etc.)
        this.equipment = {
            weapon: { 
                name: 'Longsword',
                damage: 30,
                staminaCost: { light: 15, heavy: 30 }
            },
            armor: {
                defense: 10,
                weight: 20
            }
        };
        
        // Calculate equip load and roll type
        this.equipLoad = 0.5; // 0-1, affects roll distance/speed
    }
    
    init() {
        this.createPlayerMesh();
        this.createWeapon();
        this.updateDerivedStats();
        
        // Set initial position
        const startY = this.game.world.getHeightAt(0, 0);
        const safeStartY = Number.isFinite(startY) ? startY : 0;
        this.position.set(0, safeStartY + 1, 0);
        
        // Initialize last valid position and target ground Y
        this.lastValidPosition.copy(this.position);
        this.targetGroundY = safeStartY + 0.1;
    }
    
    createPlayerMesh() {
        // Create a simple character model
        const group = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a5a,
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a574,
            roughness: 0.8
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.85;
        head.castShadow = true;
        group.add(head);
        
        // Arms
        const armGeometry = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
        const armMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a5a,
            roughness: 0.7
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.5, 1.2, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.5, 1.2, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        group.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CapsuleGeometry(0.15, 0.5, 4, 8);
        
        const leftLeg = new THREE.Mesh(legGeometry, armMaterial);
        leftLeg.position.set(-0.2, 0.35, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, armMaterial);
        rightLeg.position.set(0.2, 0.35, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        
        // Cape/cloak for that Soulsborne aesthetic
        const capeGeometry = new THREE.PlaneGeometry(0.8, 1.2);
        const capeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        const cape = new THREE.Mesh(capeGeometry, capeMaterial);
        cape.position.set(0, 1, 0.3);
        cape.rotation.x = 0.2;
        group.add(cape);
        
        this.mesh = group;
        this.scene.add(this.mesh);
    }
    
    createWeapon() {
        // Simple sword
        const group = new THREE.Group();
        
        // Blade
        const bladeGeometry = new THREE.BoxGeometry(0.08, 1.2, 0.02);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            roughness: 0.3,
            metalness: 0.9
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.6;
        group.add(blade);
        
        // Handle
        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3020,
            roughness: 0.8
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.1;
        group.add(handle);
        
        // Crossguard
        const guardGeometry = new THREE.BoxGeometry(0.25, 0.04, 0.04);
        const guard = new THREE.Mesh(guardGeometry, bladeMaterial);
        guard.position.y = 0.02;
        group.add(guard);
        
        this.weaponMesh = group;
        this.weaponMesh.position.set(0.6, 1, 0);
        this.weaponMesh.rotation.z = -0.5;
        this.mesh.add(this.weaponMesh);
    }
    
    updateDerivedStats() {
        // Calculate stats based on level ups
        this.maxHealth = 100 + (this.stats.vigor - 10) * 25;
        this.maxStamina = 100 + (this.stats.endurance - 10) * 10;
        this.maxMana = 50 + (this.stats.intelligence - 10) * 10;
        
        // Ensure current values don't exceed max
        this.health = Math.min(this.health, this.maxHealth);
        this.stamina = Math.min(this.stamina, this.maxStamina);
        this.mana = Math.min(this.mana, this.maxMana);
    }
    
    update(deltaTime) {
        if (this.state === 'dead') return;
        
        // Update timers
        this.stateTimer -= deltaTime;
        this.rollCooldown -= deltaTime;
        this.attackCooldown -= deltaTime;
        
        // Handle current state
        switch (this.state) {
            case 'rolling':
                this.updateRoll(deltaTime);
                break;
            case 'attacking':
                this.updateAttack(deltaTime);
                break;
            case 'staggered':
                this.updateStagger(deltaTime);
                break;
            default:
                this.handleInput(deltaTime);
                break;
        }
        
        // Apply physics
        this.applyGravity(deltaTime);
        this.applyMovement(deltaTime);
        
        // Regenerate stamina
        this.regenerateStamina(deltaTime);
        
        // Update camera
        this.updateCamera(deltaTime);
        
        // Update mesh position and rotation
        this.updateMesh();
        
        // Update lock-on
        this.updateLockOn();
    }
    
    handleInput(deltaTime) {
        const input = this.game.inputManager;
        
        // Check for roll input (HIGH PRIORITY)
        if (input.wasActionPressed('roll') && this.canRoll()) {
            this.startRoll();
            return;
        }
        
        // Check for attack input
        if (input.wasActionPressed('lightAttack') && this.canAttack()) {
            this.startAttack('light');
            return;
        }
        
        if (input.wasActionPressed('heavyAttack') && this.canAttack()) {
            this.startAttack('heavy');
            return;
        }
        
        // Check for lock-on toggle
        if (input.wasActionPressed('lockOn')) {
            this.toggleLockOn();
        }
        
        // Blocking
        this.isBlocking = input.keys.block && this.stamina > 0 && !this.isRolling && !this.isAttacking;
        if (this.isBlocking) {
            this.state = 'blocking';
        }
        
        // Movement
        const moveDir = input.getMovementDirection();
        const isSprinting = input.keys.sprint && this.stamina > 0 && !this.isBlocking;
        
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            // Calculate world-space movement direction based on camera
            const cameraDirection = new THREE.Vector3();
            this.game.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const rightDirection = new THREE.Vector3();
            rightDirection.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
            
            // Combine forward and right
            const worldMoveDir = new THREE.Vector3();
            worldMoveDir.addScaledVector(cameraDirection, -moveDir.z);
            worldMoveDir.addScaledVector(rightDirection, moveDir.x);
            worldMoveDir.normalize();
            
            // Apply movement
            const speed = isSprinting ? this.sprintSpeed : this.moveSpeed;
            this.velocity.x = THREE.MathUtils.lerp(
                this.velocity.x,
                worldMoveDir.x * speed,
                this.acceleration * deltaTime
            );
            this.velocity.z = THREE.MathUtils.lerp(
                this.velocity.z,
                worldMoveDir.z * speed,
                this.acceleration * deltaTime
            );
            
            // Rotate player to face movement direction (unless locked on)
            if (!this.lockedTarget) {
                this.rotation = Math.atan2(worldMoveDir.x, worldMoveDir.z);
            }
            
            // Update state
            this.state = isSprinting ? 'sprinting' : 'running';
            
            // Drain stamina while sprinting
            if (isSprinting) {
                this.stamina -= 15 * deltaTime;
                this.staminaRegenTimer = this.staminaRegenDelay;
            }
        } else {
            // Decelerate
            this.velocity.x = THREE.MathUtils.lerp(
                this.velocity.x,
                0,
                this.deceleration * deltaTime
            );
            this.velocity.z = THREE.MathUtils.lerp(
                this.velocity.z,
                0,
                this.deceleration * deltaTime
            );
            
            if (!this.isBlocking) {
                this.state = 'idle';
            }
        }
        
        // Handle camera rotation
        const mouseDelta = input.getMouseDelta();
        this.cameraRotationY -= mouseDelta.x;
        this.cameraRotationX -= mouseDelta.y;
        this.cameraRotationX = THREE.MathUtils.clamp(this.cameraRotationX, -Math.PI / 3, Math.PI / 3);
    }
    
    // ==========================================
    // DODGE ROLL SYSTEM (HIGH PRIORITY)
    // ==========================================
    
    canRoll() {
        return (
            this.stamina >= this.rollStaminaCost &&
            this.rollCooldown <= 0 &&
            this.state !== 'rolling' &&
            this.state !== 'staggered' &&
            this.state !== 'dead'
        );
    }
    
    startRoll() {
        // Consume stamina
        this.stamina -= this.rollStaminaCost;
        this.staminaRegenTimer = this.staminaRegenDelay;
        
        // Determine roll direction
        const input = this.game.inputManager;
        const moveDir = input.getMovementDirection();
        
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            // Roll in movement direction
            const cameraDirection = new THREE.Vector3();
            this.game.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const rightDirection = new THREE.Vector3();
            rightDirection.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
            
            this.rollDirection.set(0, 0, 0);
            this.rollDirection.addScaledVector(cameraDirection, -moveDir.z);
            this.rollDirection.addScaledVector(rightDirection, moveDir.x);
            this.rollDirection.normalize();
        } else {
            // Roll backward (backstep)
            const cameraDirection = new THREE.Vector3();
            this.game.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            this.rollDirection.copy(cameraDirection);
        }
        
        // Set roll state
        this.state = 'rolling';
        this.isRolling = true;
        this.rollTimer = 0;
        this.hasIFrames = false;
        
        // Face roll direction
        this.rotation = Math.atan2(this.rollDirection.x, this.rollDirection.z);
        
        // Spawn dust particles
        this.game.particleSystem.spawnDustCloud(
            this.position.clone(),
            10
        );
    }
    
    updateRoll(deltaTime) {
        this.rollTimer += deltaTime;
        
        // Check for i-frames
        if (this.rollTimer >= this.iFrameStart && this.rollTimer <= this.iFrameStart + this.iFrameDuration) {
            if (!this.hasIFrames) {
                this.hasIFrames = true;
            }
        } else {
            this.hasIFrames = false;
        }
        
        // Roll movement with easing
        const rollProgress = this.rollTimer / this.rollDuration;
        const rollEase = Math.sin(rollProgress * Math.PI); // Smooth in/out
        
        // Apply roll velocity
        const rollVelocity = this.rollSpeed * rollEase;
        this.velocity.x = this.rollDirection.x * rollVelocity;
        this.velocity.z = this.rollDirection.z * rollVelocity;
        
        // Animate mesh (tuck and roll)
        if (this.mesh) {
            const rollAngle = rollProgress * Math.PI * 2; // Full rotation
            this.mesh.rotation.x = Math.sin(rollAngle) * 0.5;
            this.mesh.position.y = this.position.y + Math.abs(Math.sin(rollProgress * Math.PI)) * 0.3;
        }
        
        // Check if roll is complete
        if (this.rollTimer >= this.rollDuration) {
            this.endRoll();
        }
    }
    
    endRoll() {
        this.state = 'idle';
        this.isRolling = false;
        this.hasIFrames = false;
        this.rollCooldown = 0.1; // Small cooldown before next roll
        
        // Reset mesh rotation
        if (this.mesh) {
            this.mesh.rotation.x = 0;
        }
        
        // Spawn dust particles at end
        this.game.particleSystem.spawnDustCloud(
            this.position.clone(),
            5
        );
    }
    
    // ==========================================
    // COMBAT SYSTEM
    // ==========================================
    
    canAttack() {
        return (
            this.attackCooldown <= 0 &&
            this.state !== 'rolling' &&
            this.state !== 'staggered' &&
            this.state !== 'dead'
        );
    }
    
    startAttack(type) {
        const staminaCost = this.equipment.weapon.staminaCost[type];
        
        if (this.stamina < staminaCost) return;
        
        this.stamina -= staminaCost;
        this.staminaRegenTimer = this.staminaRegenDelay;
        
        this.state = 'attacking';
        this.isAttacking = true;
        this.attackType = type;
        this.attackTimer = 0;
        
        // Attack duration based on type
        const attackDuration = type === 'light' ? 0.4 : 0.8;
        this.stateTimer = attackDuration;
        
        // Face locked target or camera direction
        if (this.lockedTarget) {
            const dir = new THREE.Vector3();
            dir.subVectors(this.lockedTarget.position, this.position);
            dir.y = 0;
            this.rotation = Math.atan2(dir.x, dir.z);
        }
        
        // Animate weapon swing
        this.animateAttack(type);
    }
    
    animateAttack(type) {
        if (!this.weaponMesh) return;
        
        const duration = type === 'light' ? 0.3 : 0.6;
        const startRotation = this.weaponMesh.rotation.z;
        const targetRotation = type === 'light' ? 1.5 : 2.0;
        
        // Flag to track if hits have been checked for this attack
        let hasCheckedHits = false;
        
        // Simple animation using requestAnimationFrame
        const startTime = performance.now();
        
        const animate = () => {
            const elapsed = (performance.now() - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Swing out then back
            if (progress < 0.5) {
                this.weaponMesh.rotation.z = THREE.MathUtils.lerp(
                    startRotation,
                    targetRotation,
                    progress * 2
                );
            } else {
                this.weaponMesh.rotation.z = THREE.MathUtils.lerp(
                    targetRotation,
                    startRotation,
                    (progress - 0.5) * 2
                );
            }
            
            // Check for hits at peak of swing (only once per attack)
            if (progress > 0.3 && progress < 0.5 && this.isAttacking && !hasCheckedHits) {
                hasCheckedHits = true;
                this.checkAttackHits();
            }
            
            if (progress < 1 && this.isAttacking) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    checkAttackHits() {
        const attackRange = 2.5;
        const attackAngle = Math.PI / 3; // 60 degree cone
        
        // Calculate attack direction
        const attackDir = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        // Check against enemies
        this.game.enemies.forEach(enemy => {
            if (!enemy.isAlive || enemy.isHit) return;
            
            const toEnemy = new THREE.Vector3();
            toEnemy.subVectors(enemy.position, this.position);
            const distance = toEnemy.length();
            
            if (distance > attackRange) return;
            
            toEnemy.normalize();
            const angle = Math.acos(attackDir.dot(toEnemy));
            
            if (angle < attackAngle) {
                // Hit!
                const damage = this.calculateDamage();
                enemy.takeDamage(damage, this.position);
                
                // Spawn hit particles
                const hitPos = enemy.position.clone();
                hitPos.y += 1;
                this.game.particleSystem.spawnHitSparks(hitPos, 15);
            }
        });
        
        // Check against bosses
        this.game.bosses.forEach(boss => {
            if (!boss.isAlive || boss.isHit) return;
            
            const toBoss = new THREE.Vector3();
            toBoss.subVectors(boss.position, this.position);
            const distance = toBoss.length();
            
            if (distance > attackRange + 1) return; // Bosses are bigger
            
            toBoss.normalize();
            const angle = Math.acos(attackDir.dot(toBoss));
            
            if (angle < attackAngle) {
                const damage = this.calculateDamage();
                boss.takeDamage(damage, this.position);
                
                const hitPos = boss.position.clone();
                hitPos.y += 2;
                this.game.particleSystem.spawnHitSparks(hitPos, 20);
            }
        });
    }
    
    calculateDamage() {
        let baseDamage = this.equipment.weapon.damage;
        
        // Scaling with strength
        baseDamage += (this.stats.strength - 10) * 2;
        
        // Heavy attack bonus
        if (this.attackType === 'heavy') {
            baseDamage *= 1.8;
        }
        
        // Combo bonus
        if (this.comboCount > 0) {
            baseDamage *= 1 + (this.comboCount * 0.1);
        }
        
        return Math.floor(baseDamage);
    }
    
    updateAttack(deltaTime) {
        this.attackTimer += deltaTime;
        
        if (this.stateTimer <= 0) {
            this.endAttack();
        }
    }
    
    endAttack() {
        this.state = 'idle';
        this.isAttacking = false;
        this.attackType = null;
        this.attackCooldown = 0.15;
    }
    
    // ==========================================
    // DAMAGE AND DEATH
    // ==========================================
    
    takeDamage(amount, source) {
        // Check for i-frames during roll
        if (this.hasIFrames) {
            return;
        }
        
        // Check for blocking
        if (this.isBlocking && this.stamina > 0) {
            // Calculate direction to attacker
            const toAttacker = new THREE.Vector3();
            toAttacker.subVectors(source, this.position);
            toAttacker.y = 0;
            toAttacker.normalize();
            
            const facingDir = new THREE.Vector3(
                Math.sin(this.rotation),
                0,
                Math.cos(this.rotation)
            );
            
            const angle = Math.acos(facingDir.dot(toAttacker));
            
            if (angle < Math.PI / 2) {
                // Successfully blocked
                const staminaDrain = amount * 0.5;
                this.stamina -= staminaDrain;
                this.staminaRegenTimer = this.staminaRegenDelay;
                
                // Reduced damage through block
                amount *= 0.2;
                
                // Spawn block sparks
                this.game.particleSystem.spawnHitSparks(
                    this.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                    10
                );
            }
        }
        
        // Apply armor defense
        const defense = this.equipment.armor.defense;
        amount = Math.max(1, amount - defense * 0.5);
        
        // Apply damage
        this.health -= amount;
        
        // Visual feedback
        this.game.hud.showDamage(amount, this.position);
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        } else if (amount > 30) {
            // Stagger on heavy hits
            this.stagger();
        }
    }
    
    stagger() {
        this.state = 'staggered';
        this.stateTimer = 0.5;
        this.isAttacking = false;
        this.isRolling = false;
    }
    
    updateStagger(deltaTime) {
        // Shake effect
        if (this.mesh) {
            this.mesh.position.x = this.position.x + (Math.random() - 0.5) * 0.1;
            this.mesh.position.z = this.position.z + (Math.random() - 0.5) * 0.1;
        }
        
        if (this.stateTimer <= 0) {
            this.state = 'idle';
        }
    }
    
    die() {
        this.state = 'dead';
        this.health = 0;
        
        // Drop souls at death location
        this.game.progressionSystem.dropSouls(this.position.clone());
        
        // Notify game
        this.game.playerDied();
    }
    
    respawn(checkpoint) {
        this.state = 'idle';
        this.health = this.maxHealth;
        this.stamina = this.maxStamina;
        this.mana = this.maxMana;
        
        // Move to checkpoint
        if (checkpoint) {
            this.position.copy(checkpoint.position);
        } else {
            this.position.set(0, this.game.world.getHeightAt(0, 0) + 1, 0);
        }
        
        this.velocity.set(0, 0, 0);
    }
    
    // ==========================================
    // PHYSICS AND MOVEMENT
    // ==========================================
    
    /**
     * Helper method to get the ground level at a given position
     * Returns the safe ground height plus a small offset
     */
    getGroundLevelAt(x, z) {
        const groundHeight = this.game.world.getHeightAt(x, z);
        const safeGroundHeight = Number.isFinite(groundHeight) ? groundHeight : 0;
        return safeGroundHeight + 0.1;
    }
    
    /**
     * Helper method to snap position to ground and update grounded state
     * Returns true if player is grounded
     */
    snapToGround(groundLevel) {
        if (this.position.y <= groundLevel) {
            this.position.y = groundLevel;
            if (this.velocity.y <= 0) {
                this.velocity.y = 0;
                return true;
            }
        }
        return false;
    }
    
    applyGravity(deltaTime) {
        const groundLevel = this.getGroundLevelAt(this.position.x, this.position.z);
        
        if (this.position.y > groundLevel + this.groundCheckTolerance) {
            // In the air - apply gravity
            this.velocity.y -= this.gravity * deltaTime;
            this.isGrounded = false;
        } else {
            // On or near ground
            this.isGrounded = this.snapToGround(groundLevel);
        }
    }
    
    applyMovement(deltaTime) {
        // Calculate new position
        const newX = this.position.x + this.velocity.x * deltaTime;
        const newZ = this.position.z + this.velocity.z * deltaTime;
        
        // Sanity check: reject moves that are too large (prevents teleporting)
        const moveDistance = Math.sqrt(
            Math.pow(newX - this.position.x, 2) + 
            Math.pow(newZ - this.position.z, 2)
        );
        if (moveDistance > this.maxMovePerFrame) {
            // Move is too large, likely a glitch - revert to last valid position
            this.position.copy(this.lastValidPosition);
            this.velocity.set(0, 0, 0);
            return;
        }
        
        // Get world boundary limit from World.js
        const worldBound = this.game.world.getBoundaryLimit();
        
        // Check collision first
        const testPos = new THREE.Vector3(newX, this.position.y, newZ);
        const hasCollision = this.game.world.checkCollision(testPos, this.collisionRadius);
        
        // Apply horizontal position with boundary clamping
        if (!hasCollision) {
            this.position.x = THREE.MathUtils.clamp(newX, -worldBound, worldBound);
            this.position.z = THREE.MathUtils.clamp(newZ, -worldBound, worldBound);
        } else {
            // If collision, stop horizontal velocity
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Apply vertical velocity
        this.position.y += this.velocity.y * deltaTime;
        
        // Get ground level at the NEW horizontal position
        const groundLevel = this.getGroundLevelAt(this.position.x, this.position.z);
        
        // Smooth Y position transition when following terrain (prevents jarring height changes)
        if (this.isGrounded && this.velocity.y >= 0) {
            // Update target ground Y
            this.targetGroundY = groundLevel;
            
            // Smoothly lerp to target ground height
            const yDifference = Math.abs(this.targetGroundY - this.position.y);
            if (yDifference > 0.01) {
                // Use lerp for smooth transition, but snap if very close
                if (yDifference < 0.1) {
                    this.position.y = this.targetGroundY;
                } else {
                    this.position.y = THREE.MathUtils.lerp(
                        this.position.y,
                        this.targetGroundY,
                        this.groundYLerpSpeed * deltaTime
                    );
                }
            }
        } else {
            // If we're at or below ground level, snap to ground
            if (this.snapToGround(groundLevel)) {
                this.isGrounded = true;
                this.targetGroundY = groundLevel;
            }
        }
        
        // Prevent falling through the world using defined threshold
        if (this.position.y < this.fallThroughThreshold) {
            this.position.y = groundLevel;
            this.velocity.y = 0;
        }
        
        // Additional safety: If position is below terrain minimum, reset to spawn
        const minTerrainHeight = this.game.world.minHeight - 10;
        if (this.position.y < minTerrainHeight) {
            const spawnGroundLevel = this.getGroundLevelAt(0, 0);
            this.position.set(0, spawnGroundLevel, 0);
            this.velocity.set(0, 0, 0);
        }
        
        // Ensure position values are valid numbers
        if (!Number.isFinite(this.position.x)) this.position.x = 0;
        if (!Number.isFinite(this.position.y)) this.position.y = 1;
        if (!Number.isFinite(this.position.z)) this.position.z = 0;
        
        // Clamp Y to reasonable range to prevent extreme values
        this.position.y = THREE.MathUtils.clamp(this.position.y, -5, 500);
        
        // Store last valid position
        this.lastValidPosition.copy(this.position);
    }
    
    regenerateStamina(deltaTime) {
        if (this.staminaRegenTimer > 0) {
            this.staminaRegenTimer -= deltaTime;
            return;
        }
        
        if (this.stamina < this.maxStamina && !this.isBlocking && !this.isAttacking) {
            this.stamina = Math.min(
                this.maxStamina,
                this.stamina + this.staminaRegenRate * deltaTime
            );
        }
    }
    
    // ==========================================
    // CAMERA AND LOCK-ON
    // ==========================================
    
    updateCamera(deltaTime) {
        const camera = this.game.camera;
        
        if (this.lockedTarget && this.lockedTarget.isAlive) {
            // Camera focuses on target
            const targetPos = this.lockedTarget.position.clone();
            const playerPos = this.position.clone();
            
            // Position between player and target
            const midPoint = playerPos.clone().add(targetPos).multiplyScalar(0.5);
            midPoint.y += 2;
            
            // Camera behind player looking at midpoint
            const behindPlayer = playerPos.clone();
            behindPlayer.y += 2;
            
            const toTarget = new THREE.Vector3();
            toTarget.subVectors(targetPos, playerPos);
            toTarget.y = 0;
            toTarget.normalize();
            
            behindPlayer.addScaledVector(toTarget, -6);
            
            camera.position.lerp(behindPlayer, 5 * deltaTime);
            
            // Look at midpoint
            const lookTarget = midPoint.clone();
            lookTarget.y = targetPos.y + 1;
            camera.lookAt(lookTarget);
            
            // Face target
            this.rotation = Math.atan2(toTarget.x, toTarget.z);
        } else {
            // Third person camera following player
            const idealOffset = new THREE.Vector3(0, 3, 6);
            
            // Rotate offset by camera rotation
            const rotatedOffset = idealOffset.clone();
            rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraRotationY);
            rotatedOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.cameraRotationX * 0.3);
            
            const targetCameraPos = this.position.clone().add(rotatedOffset);
            
            // Check ground collision for camera with safety check
            const groundHeight = this.game.world.getHeightAt(targetCameraPos.x, targetCameraPos.z);
            const safeGroundHeight = Number.isFinite(groundHeight) ? groundHeight : 0;
            targetCameraPos.y = Math.max(targetCameraPos.y, safeGroundHeight + 1);
            
            // Ensure camera position is valid
            if (Number.isFinite(targetCameraPos.x) && Number.isFinite(targetCameraPos.y) && Number.isFinite(targetCameraPos.z)) {
                camera.position.lerp(targetCameraPos, 8 * deltaTime);
            }
            
            // Look at player
            const lookTarget = this.position.clone();
            lookTarget.y += 1.5;
            camera.lookAt(lookTarget);
        }
    }
    
    toggleLockOn() {
        if (this.lockedTarget) {
            // Unlock
            this.lockedTarget = null;
            document.getElementById('lock-on-indicator').classList.add('hidden');
        } else {
            // Find nearest enemy to lock onto
            let nearestEnemy = null;
            let nearestDistance = this.lockOnRange;
            
            // Check enemies
            this.game.enemies.forEach(enemy => {
                if (!enemy.isAlive) return;
                const distance = this.position.distanceTo(enemy.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            });
            
            // Check bosses
            this.game.bosses.forEach(boss => {
                if (!boss.isAlive) return;
                const distance = this.position.distanceTo(boss.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = boss;
                }
            });
            
            if (nearestEnemy) {
                this.lockedTarget = nearestEnemy;
                document.getElementById('lock-on-indicator').classList.remove('hidden');
            }
        }
    }
    
    updateLockOn() {
        if (!this.lockedTarget) return;
        
        // Check if target is still valid
        if (!this.lockedTarget.isAlive || 
            this.position.distanceTo(this.lockedTarget.position) > this.lockOnRange * 1.5) {
            this.lockedTarget = null;
            document.getElementById('lock-on-indicator').classList.add('hidden');
            return;
        }
        
        // Update lock-on indicator position
        const indicator = document.getElementById('lock-on-indicator');
        const targetPos = this.lockedTarget.position.clone();
        targetPos.y += this.lockedTarget.isBoss ? 3 : 1.5;
        
        const screenPos = targetPos.project(this.game.camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
    }
    
    updateMesh() {
        if (!this.mesh) return;
        
        // During rolling, mesh position is managed by updateRoll for animation
        if (this.state !== 'rolling') {
            this.mesh.position.copy(this.position);
        } else {
            // Only update X and Z, preserve animated Y position
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
        }
        this.mesh.rotation.y = this.rotation;
    }
    
    // For HUD updates
    getHealthPercent() {
        return this.health / this.maxHealth;
    }
    
    getStaminaPercent() {
        return this.stamina / this.maxStamina;
    }
    
    getManaPercent() {
        return this.mana / this.maxMana;
    }
}
