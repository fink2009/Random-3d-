/**
 * DragonBoss.js - Ancient Dragon Boss
 * Flying dragon with multiple attack phases
 */

import * as THREE from 'three';

export class DragonBoss {
    constructor(game, name = 'Ancient Dragon') {
        this.game = game;
        this.scene = game.scene;
        this.name = name;
        
        // Mesh
        this.mesh = null;
        this.wingMeshes = [];
        
        // Position
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        
        // Flying
        this.isFlying = false;
        this.flightHeight = 15;
        this.baseHeight = 0;
        this.targetHeight = 0;
        
        // Stats
        this.maxHealth = 800;
        this.health = 800;
        this.damage = 60;
        this.moveSpeed = 4;
        this.flySpeed = 12;
        this.attackRange = 8;
        
        // State
        this.state = 'idle';
        this.stateTimer = 0;
        this.isAlive = true;
        this.isBoss = true;
        
        // Phases
        this.phase = 1;
        this.phaseThresholds = [0.5];
        
        // Combat
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.currentAttack = null;
        
        // Attack patterns
        this.attackPatterns = {
            1: ['fireBreath', 'tailSwipe', 'clawSwipe', 'landing'],
            2: ['fireBreath', 'tailSwipe', 'clawSwipe', 'diveBomb', 'fireStorm', 'landing']
        };
        
        // Fire breath
        this.fireBreathActive = false;
        this.fireBreathTimer = 0;
        this.fireBreathCone = null;
        
        // Detection
        this.detectionRadius = 50;
        this.hasAggro = false;
        this.arenaCenter = new THREE.Vector3();
        this.arenaRadius = 35;
        
        // Poise
        this.maxPoise = 200;
        this.poise = 200;
        
        // Hit feedback
        this.isHit = false;
        this.hitCooldown = 0;
        
        // Death
        this.deathTimer = 8;
        
        // Souls
        this.soulsReward = 3000;
        
        // Wing animation
        this.wingAngle = 0;
        this.wingSpeed = 3;
    }
    
    init(x, y, z) {
        this.position.set(x, y + 5, z);
        this.baseHeight = y;
        this.arenaCenter.set(x, y, z);
        this.createMesh();
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        const dragonMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const scaleMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a4a5a,
            roughness: 0.6,
            metalness: 0.4
        });
        
        // Body (large serpentine shape)
        const bodyGeometry = new THREE.CapsuleGeometry(1.5, 5, 8, 16);
        const body = new THREE.Mesh(bodyGeometry, dragonMaterial);
        body.rotation.z = Math.PI / 2;
        body.position.y = 2;
        body.castShadow = true;
        group.add(body);
        
        // Neck
        const neckGeometry = new THREE.CapsuleGeometry(0.8, 3, 8, 16);
        const neck = new THREE.Mesh(neckGeometry, dragonMaterial);
        neck.position.set(4, 3.5, 0);
        neck.rotation.z = -Math.PI / 4;
        neck.castShadow = true;
        group.add(neck);
        
        // Head
        const headGeometry = new THREE.BoxGeometry(2.5, 1.2, 1.5);
        const head = new THREE.Mesh(headGeometry, dragonMaterial);
        head.position.set(6.5, 5, 0);
        head.castShadow = true;
        group.add(head);
        this.headMesh = head;
        
        // Snout
        const snoutGeometry = new THREE.ConeGeometry(0.6, 2, 8);
        const snout = new THREE.Mesh(snoutGeometry, dragonMaterial);
        snout.position.set(8, 5, 0);
        snout.rotation.z = -Math.PI / 2;
        group.add(snout);
        
        // Horns
        const hornGeometry = new THREE.ConeGeometry(0.2, 1.5, 6);
        const hornMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.5
        });
        
        const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        leftHorn.position.set(6, 6, 0.6);
        leftHorn.rotation.z = -Math.PI / 6;
        leftHorn.rotation.x = -0.2;
        group.add(leftHorn);
        
        const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        rightHorn.position.set(6, 6, -0.6);
        rightHorn.rotation.z = -Math.PI / 6;
        rightHorn.rotation.x = 0.2;
        group.add(rightHorn);
        
        // Eyes (glowing)
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4400,
            emissive: 0xff4400,
            emissiveIntensity: 1
        });
        
        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            eyeMaterial
        );
        leftEye.position.set(7.2, 5.3, 0.5);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 8),
            eyeMaterial
        );
        rightEye.position.set(7.2, 5.3, -0.5);
        group.add(rightEye);
        
        // Wings
        this.createWings(group, dragonMaterial);
        
        // Tail
        const tailSegments = 5;
        let prevTailPos = new THREE.Vector3(-3, 2, 0);
        
        for (let i = 0; i < tailSegments; i++) {
            const segmentSize = 1.2 - i * 0.15;
            const tailGeometry = new THREE.CapsuleGeometry(segmentSize * 0.4, segmentSize, 4, 8);
            const tailSegment = new THREE.Mesh(tailGeometry, dragonMaterial);
            
            tailSegment.rotation.z = Math.PI / 2 + i * 0.15;
            tailSegment.position.set(
                prevTailPos.x - segmentSize,
                prevTailPos.y - i * 0.3,
                0
            );
            tailSegment.castShadow = true;
            group.add(tailSegment);
            
            prevTailPos.set(
                tailSegment.position.x - segmentSize * 0.5,
                tailSegment.position.y,
                0
            );
        }
        
        // Tail spike
        const spikeGeometry = new THREE.ConeGeometry(0.3, 1.5, 4);
        const spike = new THREE.Mesh(spikeGeometry, hornMaterial);
        spike.position.set(prevTailPos.x - 0.5, prevTailPos.y, 0);
        spike.rotation.z = Math.PI / 2;
        group.add(spike);
        
        // Legs
        this.createLegs(group, dragonMaterial);
        
        // Spines along back
        for (let i = 0; i < 8; i++) {
            const spineGeometry = new THREE.ConeGeometry(0.15, 0.8 - i * 0.05, 4);
            const spine = new THREE.Mesh(spineGeometry, hornMaterial);
            spine.position.set(2 - i * 0.8, 3.5 - i * 0.1, 0);
            group.add(spine);
        }
        
        // Dragon aura light
        const auraLight = new THREE.PointLight(0xff4400, 2, 20);
        auraLight.position.y = 2;
        group.add(auraLight);
        
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    createWings(group, material) {
        const wingMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            roughness: 0.8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });
        
        // Left wing
        const leftWingGroup = new THREE.Group();
        
        // Wing arm
        const wingArmGeometry = new THREE.CylinderGeometry(0.2, 0.15, 4, 6);
        const wingArm = new THREE.Mesh(wingArmGeometry, material);
        wingArm.rotation.z = Math.PI / 2.5;
        wingArm.position.set(1, 1.5, 0);
        leftWingGroup.add(wingArm);
        
        // Wing membrane
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(5, 2);
        wingShape.lineTo(6, 0);
        wingShape.lineTo(4, -2);
        wingShape.lineTo(0, 0);
        
        const wingGeometry = new THREE.ShapeGeometry(wingShape);
        const wingMembrane = new THREE.Mesh(wingGeometry, wingMaterial);
        wingMembrane.rotation.x = Math.PI / 2;
        wingMembrane.position.set(0, 0, 0);
        leftWingGroup.add(wingMembrane);
        
        leftWingGroup.position.set(0, 3.5, 2);
        group.add(leftWingGroup);
        this.wingMeshes.push(leftWingGroup);
        
        // Right wing (mirrored)
        const rightWingGroup = leftWingGroup.clone();
        rightWingGroup.scale.z = -1;
        rightWingGroup.position.set(0, 3.5, -2);
        group.add(rightWingGroup);
        this.wingMeshes.push(rightWingGroup);
    }
    
    createLegs(group, material) {
        const legMaterial = material;
        
        // Front legs
        const frontLegGeometry = new THREE.CapsuleGeometry(0.4, 1.5, 4, 8);
        
        const frontLeftLeg = new THREE.Mesh(frontLegGeometry, legMaterial);
        frontLeftLeg.position.set(2, 0.5, 1.5);
        frontLeftLeg.rotation.z = 0.3;
        frontLeftLeg.castShadow = true;
        group.add(frontLeftLeg);
        
        const frontRightLeg = new THREE.Mesh(frontLegGeometry, legMaterial);
        frontRightLeg.position.set(2, 0.5, -1.5);
        frontRightLeg.rotation.z = 0.3;
        frontRightLeg.castShadow = true;
        group.add(frontRightLeg);
        
        // Back legs
        const backLegGeometry = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
        
        const backLeftLeg = new THREE.Mesh(backLegGeometry, legMaterial);
        backLeftLeg.position.set(-2, 0.5, 1.8);
        backLeftLeg.rotation.z = -0.2;
        backLeftLeg.castShadow = true;
        group.add(backLeftLeg);
        
        const backRightLeg = new THREE.Mesh(backLegGeometry, legMaterial);
        backRightLeg.position.set(-2, 0.5, -1.8);
        backRightLeg.rotation.z = -0.2;
        backRightLeg.castShadow = true;
        group.add(backRightLeg);
        
        // Claws
        const clawGeometry = new THREE.ConeGeometry(0.1, 0.4, 4);
        const clawMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5
        });
        
        const clawPositions = [
            { x: 2.3, y: -0.3, z: 1.5 },
            { x: 2.3, y: -0.3, z: -1.5 },
            { x: -2.3, y: -0.5, z: 1.8 },
            { x: -2.3, y: -0.5, z: -1.8 }
        ];
        
        clawPositions.forEach(pos => {
            for (let i = -1; i <= 1; i++) {
                const claw = new THREE.Mesh(clawGeometry, clawMaterial);
                claw.position.set(pos.x, pos.y, pos.z + i * 0.2);
                claw.rotation.x = Math.PI;
                group.add(claw);
            }
        });
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
        
        // Update wing animation
        this.updateWings(deltaTime);
        
        // Check phase transition
        this.checkPhaseTransition();
        
        // State machine
        switch (this.state) {
            case 'idle':
                this.updateIdle(deltaTime);
                break;
            case 'flying':
                this.updateFlying(deltaTime);
                break;
            case 'attacking':
                this.updateAttack(deltaTime);
                break;
            case 'landing':
                this.updateLanding(deltaTime);
                break;
            case 'grounded':
                this.updateGrounded(deltaTime);
                break;
            case 'phase_transition':
                this.updatePhaseTransition(deltaTime);
                break;
        }
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Update mesh
        this.updateMesh();
        
        // Update health bar
        if (this.hasAggro) {
            this.updateHealthBar();
        }
    }
    
    updateWings(deltaTime) {
        if (this.isFlying || this.state === 'flying') {
            this.wingAngle += this.wingSpeed * deltaTime;
            const wingFlap = Math.sin(this.wingAngle) * 0.5;
            
            this.wingMeshes.forEach((wing, index) => {
                wing.rotation.x = wingFlap * (index === 0 ? 1 : -1);
            });
        }
    }
    
    updateIdle(deltaTime) {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        if (distance < this.detectionRadius) {
            this.hasAggro = true;
            this.state = 'flying';
            this.isFlying = true;
            this.targetHeight = this.baseHeight + this.flightHeight;
            this.showBossHealthBar();
        }
    }
    
    updateFlying(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const horizontalDistance = toPlayer.length();
        
        // Face player
        toPlayer.normalize();
        this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
        
        // Fly toward target height
        const heightDiff = this.targetHeight - this.position.y;
        if (Math.abs(heightDiff) > 0.5) {
            this.velocity.y = Math.sign(heightDiff) * this.flySpeed * 0.5;
        } else {
            this.velocity.y = 0;
        }
        
        // Circle around player at distance
        if (horizontalDistance > this.attackRange * 2) {
            this.velocity.x = toPlayer.x * this.flySpeed;
            this.velocity.z = toPlayer.z * this.flySpeed;
        } else {
            // Slow down when in range
            this.velocity.x *= 0.95;
            this.velocity.z *= 0.95;
        }
        
        // Attack patterns
        if (this.attackCooldown <= 0) {
            const attacks = this.attackPatterns[this.phase];
            const attack = attacks[Math.floor(Math.random() * attacks.length)];
            this.startAttack(attack);
        }
    }
    
    updateGrounded(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        // Face player
        toPlayer.normalize();
        this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
        
        // Ground attacks
        if (this.attackCooldown <= 0) {
            if (distance < this.attackRange) {
                const groundAttacks = ['clawSwipe', 'tailSwipe'];
                this.startAttack(groundAttacks[Math.floor(Math.random() * groundAttacks.length)]);
            } else {
                // Take off
                this.state = 'flying';
                this.isFlying = true;
                this.targetHeight = this.baseHeight + this.flightHeight;
            }
        }
        
        // Slow movement on ground
        this.velocity.x = toPlayer.x * this.moveSpeed * 0.5;
        this.velocity.z = toPlayer.z * this.moveSpeed * 0.5;
    }
    
    startAttack(attackType) {
        this.state = 'attacking';
        this.isAttacking = true;
        this.attackTimer = 0;
        this.currentAttack = attackType;
        this.velocity.set(0, 0, 0);
    }
    
    updateAttack(deltaTime) {
        this.attackTimer += deltaTime;
        
        switch (this.currentAttack) {
            case 'fireBreath':
                this.executeFireBreath(deltaTime);
                break;
            case 'tailSwipe':
                this.executeTailSwipe(deltaTime);
                break;
            case 'clawSwipe':
                this.executeClawSwipe(deltaTime);
                break;
            case 'diveBomb':
                this.executeDiveBomb(deltaTime);
                break;
            case 'fireStorm':
                this.executeFireStorm(deltaTime);
                break;
            case 'landing':
                this.executeLanding(deltaTime);
                break;
        }
    }
    
    executeFireBreath(deltaTime) {
        const windUp = 1.0;
        const breathDuration = 3.0;
        const recovery = 1.0;
        
        if (this.attackTimer < windUp) {
            // Wind up - head raises
            if (this.headMesh) {
                this.headMesh.position.y = 5 + this.attackTimer * 0.5;
            }
        } else if (this.attackTimer < windUp + breathDuration) {
            // Fire breath cone
            this.fireBreathActive = true;
            
            // Spawn fire particles in cone
            const player = this.game.player;
            const toPlayer = new THREE.Vector3();
            toPlayer.subVectors(player.position, this.position);
            toPlayer.y = 0;
            toPlayer.normalize();
            
            // Track player slowly
            this.rotation = THREE.MathUtils.lerp(
                this.rotation,
                Math.atan2(toPlayer.x, toPlayer.z),
                deltaTime * 0.5
            );
            
            // Spawn fire particles
            const breathProgress = (this.attackTimer - windUp) / breathDuration;
            const firePos = this.position.clone();
            firePos.x += Math.sin(this.rotation) * 8;
            firePos.z += Math.cos(this.rotation) * 8;
            firePos.y = this.position.y - 3;
            
            this.game.particleSystem.spawnFire(firePos, 10);
            
            // Damage in cone
            this.dealFireBreathDamage();
            
        } else if (this.attackTimer > windUp + breathDuration + recovery) {
            this.fireBreathActive = false;
            this.endAttack(4);
        }
    }
    
    dealFireBreathDamage() {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        
        const distance = toPlayer.length();
        toPlayer.normalize();
        
        // Check if player is in fire cone
        const facingDir = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        const angle = Math.acos(facingDir.dot(new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize()));
        
        // Cone is 45 degrees, range 15
        if (angle < Math.PI / 4 && distance < 15) {
            player.takeDamage(this.damage * 0.3, this.position, this);
        }
    }
    
    executeTailSwipe(deltaTime) {
        const windUp = 0.5;
        const execute = 0.3;
        const recovery = 0.5;
        
        if (this.attackTimer < windUp) {
            // Wind up
        } else if (this.attackTimer < windUp + execute) {
            // Swipe
            if (this.attackTimer < windUp + 0.1) {
                this.dealTailDamage();
            }
        } else if (this.attackTimer > windUp + execute + recovery) {
            this.endAttack(2);
        }
    }
    
    dealTailDamage() {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        // Tail swipe hits behind
        const facingDir = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        const angle = Math.acos(facingDir.dot(toPlayer.normalize()));
        
        // Hit area behind dragon
        if (angle > Math.PI / 2 && distance < 10) {
            player.takeDamage(this.damage, this.position, this);
            this.game.particleSystem.spawnDustCloud(player.position.clone(), 15);
        }
    }
    
    executeClawSwipe(deltaTime) {
        const windUp = 0.4;
        const execute = 0.2;
        const recovery = 0.5;
        
        if (this.attackTimer < windUp) {
            // Raise claw
        } else if (this.attackTimer < windUp + execute) {
            if (this.attackTimer < windUp + 0.1) {
                this.dealClawDamage();
            }
        } else if (this.attackTimer > windUp + execute + recovery) {
            this.endAttack(1.5);
        }
    }
    
    dealClawDamage() {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        if (distance < this.attackRange) {
            player.takeDamage(this.damage * 0.8, this.position, this);
            this.game.particleSystem.spawnHitSparks(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 15);
        }
    }
    
    executeDiveBomb(deltaTime) {
        const ascend = 2.0;
        const dive = 1.0;
        const recovery = 2.0;
        
        if (this.attackTimer < ascend) {
            // Fly up high
            this.velocity.y = this.flySpeed;
            this.targetHeight = this.baseHeight + this.flightHeight * 2;
        } else if (this.attackTimer < ascend + dive) {
            // Dive at player
            const player = this.game.player;
            const toPlayer = new THREE.Vector3();
            toPlayer.subVectors(player.position, this.position);
            toPlayer.normalize();
            
            this.velocity.x = toPlayer.x * this.flySpeed * 2;
            this.velocity.y = -this.flySpeed * 2;
            this.velocity.z = toPlayer.z * this.flySpeed * 2;
            
            // Check impact
            if (this.position.y < this.baseHeight + 3) {
                this.dealDiveDamage();
                this.attackTimer = ascend + dive; // Force to recovery
            }
        } else if (this.attackTimer < ascend + dive + recovery) {
            // Recovery - land briefly
            this.isFlying = false;
            this.targetHeight = this.baseHeight;
            this.velocity.y = 0;
        } else {
            this.isFlying = true;
            this.targetHeight = this.baseHeight + this.flightHeight;
            this.endAttack(5);
        }
    }
    
    dealDiveDamage() {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        // Large AOE on impact
        const aoeRadius = 8;
        if (distance < aoeRadius) {
            const falloff = 1 - (distance / aoeRadius);
            player.takeDamage(this.damage * 1.5 * falloff, this.position, this);
        }
        
        // Impact particles
        this.game.particleSystem.spawnDustCloud(this.position.clone(), 50);
    }
    
    executeFireStorm(deltaTime) {
        const chargeUp = 2.0;
        const storm = 4.0;
        const recovery = 1.0;
        
        if (this.attackTimer < chargeUp) {
            // Charge up - hover and glow
            this.velocity.set(0, 0, 0);
            
            // Spawn warning particles
            if (Math.random() < 0.3) {
                const pos = this.position.clone();
                pos.y -= 3;
                this.game.particleSystem.spawnFire(pos, 5);
            }
        } else if (this.attackTimer < chargeUp + storm) {
            // Rain fire from above
            const stormProgress = (this.attackTimer - chargeUp) / storm;
            
            // Spawn fire pillars
            if (Math.random() < 0.2) {
                const player = this.game.player;
                const pillarPos = player.position.clone();
                pillarPos.x += (Math.random() - 0.5) * 15;
                pillarPos.z += (Math.random() - 0.5) * 15;
                pillarPos.y = this.game.world.getHeightAt(pillarPos.x, pillarPos.z);
                
                this.spawnFirePillar(pillarPos);
            }
        } else if (this.attackTimer > chargeUp + storm + recovery) {
            this.endAttack(6);
        }
    }
    
    spawnFirePillar(position) {
        // Visual effect
        for (let i = 0; i < 15; i++) {
            const pos = position.clone();
            pos.y += i * 0.5;
            this.game.particleSystem.spawnFire(pos, 3);
        }
        
        // Damage check
        const player = this.game.player;
        const dist = new THREE.Vector2(
            player.position.x - position.x,
            player.position.z - position.z
        ).length();
        
        if (dist < 2) {
            player.takeDamage(this.damage * 0.5, position, this);
        }
    }
    
    executeLanding(deltaTime) {
        const descend = 2.0;
        const landTime = 3.0;
        
        if (this.attackTimer < descend) {
            // Descend
            this.targetHeight = this.baseHeight + 2;
            this.isFlying = false;
        } else if (this.attackTimer < descend + landTime) {
            // Grounded combat
            this.state = 'grounded';
            this.stateTimer = landTime;
        } else {
            this.isFlying = true;
            this.targetHeight = this.baseHeight + this.flightHeight;
            this.endAttack(2);
        }
    }
    
    updateLanding(deltaTime) {
        // Transition to grounded
        const heightDiff = this.targetHeight - this.position.y;
        this.velocity.y = Math.sign(heightDiff) * this.flySpeed * 0.5;
        
        if (Math.abs(heightDiff) < 0.5) {
            this.state = 'grounded';
        }
    }
    
    endAttack(cooldown) {
        if (this.isFlying) {
            this.state = 'flying';
        } else {
            this.state = 'grounded';
        }
        this.isAttacking = false;
        this.attackCooldown = cooldown;
        this.currentAttack = null;
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
        this.stateTimer = 4;
        this.velocity.set(0, 0, 0);
        
        // Phase 2: Dragon becomes more aggressive
        this.damage *= 1.2;
        this.flySpeed *= 1.3;
    }
    
    updatePhaseTransition(deltaTime) {
        // Roar and power up
        if (this.mesh) {
            const scale = 1 + Math.sin(this.stateTimer * 5) * 0.1;
            this.mesh.scale.setScalar(scale);
        }
        
        // Spawn fire around
        if (Math.random() < 0.3) {
            const pos = this.position.clone();
            pos.x += (Math.random() - 0.5) * 10;
            pos.z += (Math.random() - 0.5) * 10;
            pos.y = this.game.world.getHeightAt(pos.x, pos.z);
            this.game.particleSystem.spawnFire(pos, 5);
        }
        
        if (this.stateTimer <= 0) {
            this.state = 'flying';
            this.mesh.scale.setScalar(1);
        }
    }
    
    takeDamage(amount, source) {
        if (!this.isAlive || this.state === 'phase_transition') return;
        
        this.health -= amount;
        this.isHit = true;
        this.hitCooldown = 0.2;
        
        // Show damage
        this.game.hud.showDamage(amount, this.position);
        
        // Death check
        if (this.health <= 0) {
            this.die();
        }
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
        
        // Death animation - crash to ground
        if (this.mesh) {
            const meshRef = this.mesh;
            let animationId = null;
            
            const fallAndFade = () => {
                if (!meshRef || !meshRef.parent) {
                    if (animationId) cancelAnimationFrame(animationId);
                    return;
                }
                
                // Fall
                if (meshRef.position.y > this.baseHeight) {
                    meshRef.position.y -= 0.5;
                    meshRef.rotation.z += 0.01;
                }
                
                // Fade
                let allFaded = true;
                meshRef.traverse((child) => {
                    if (child.material) {
                        child.material.transparent = true;
                        if (child.material.opacity > 0) {
                            child.material.opacity -= 0.005;
                            allFaded = false;
                        }
                    }
                });
                
                if (!allFaded) {
                    animationId = requestAnimationFrame(fallAndFade);
                }
            };
            
            fallAndFade();
        }
    }
    
    applyPhysics(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
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
        
        // Height bounds
        const groundHeight = this.game.world.getHeightAt(this.position.x, this.position.z);
        if (!this.isFlying && this.position.y < groundHeight + 2) {
            this.position.y = groundHeight + 2;
        }
        
        // Friction
        this.velocity.x *= 0.95;
        this.velocity.z *= 0.95;
    }
    
    updateMesh() {
        if (!this.mesh) return;
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
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
        if (fill) {
            fill.style.width = `${(this.health / this.maxHealth) * 100}%`;
        }
    }
    
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
    }
}
