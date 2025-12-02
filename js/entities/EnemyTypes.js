/**
 * EnemyTypes.js - Additional Enemy Types
 * Wolf, Stone Golem, Dark Knight, Archer
 */

import * as THREE from 'three';
import { Enemy } from './Enemy.js';

// ==========================================
// WOLF ENEMY - Pack creature, fast attacks
// ==========================================
export class Wolf extends Enemy {
    constructor(game) {
        super(game, 'wolf');
        this.type = 'wolf';
        
        // Wolf stats
        this.maxHealth = 40;
        this.health = 40;
        this.damage = 15;
        this.moveSpeed = 8;
        this.attackRange = 2;
        this.attackCooldownTime = 1.0;
        this.maxPoise = 15;
        this.soulsReward = 30;
        
        // Pack behavior
        this.packMembers = [];
        this.isPackLeader = false;
        this.circlingAngle = Math.random() * Math.PI * 2;
        this.circlingSpeed = 2;
        
        // Detection
        this.detectionRadius = 20;
        this.loseAggroRange = 35;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        // Body (elongated for wolf shape)
        const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0.6, 0.7, 0);
        head.scale.set(1.2, 1, 0.8);
        head.castShadow = true;
        group.add(head);
        
        // Snout
        const snoutGeometry = new THREE.ConeGeometry(0.15, 0.3, 8);
        const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
        snout.position.set(0.9, 0.65, 0);
        snout.rotation.z = -Math.PI / 2;
        group.add(snout);
        
        // Ears
        const earGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(0.5, 1, 0.15);
        group.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(0.5, 1, -0.15);
        group.add(rightEar);
        
        // Eyes (glowing red)
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.8
        });
        
        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            eyeMaterial
        );
        leftEye.position.set(0.75, 0.8, 0.12);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            eyeMaterial
        );
        rightEye.position.set(0.75, 0.8, -0.12);
        group.add(rightEye);
        
        // Legs (4 legs)
        const legGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.4, 6);
        const legPositions = [
            { x: 0.4, z: 0.2 },
            { x: 0.4, z: -0.2 },
            { x: -0.4, z: 0.2 },
            { x: -0.4, z: -0.2 }
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, bodyMaterial);
            leg.position.set(pos.x, 0.2, pos.z);
            leg.castShadow = true;
            group.add(leg);
        });
        
        // Tail
        const tailGeometry = new THREE.CylinderGeometry(0.04, 0.08, 0.5, 6);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(-0.7, 0.8, 0);
        tail.rotation.z = Math.PI / 4;
        group.add(tail);
        
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    updateChase(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        if (distance > this.loseAggroRange) {
            this.hasAggro = false;
            this.state = 'idle';
            return;
        }
        
        // Wolves circle before attacking
        if (distance > this.attackRange && distance < this.attackRange * 3) {
            // Circle around player
            this.circlingAngle += this.circlingSpeed * deltaTime;
            const circleRadius = this.attackRange * 2;
            
            const targetX = player.position.x + Math.cos(this.circlingAngle) * circleRadius;
            const targetZ = player.position.z + Math.sin(this.circlingAngle) * circleRadius;
            
            const toTarget = new THREE.Vector3(targetX - this.position.x, 0, targetZ - this.position.z);
            toTarget.normalize();
            
            this.velocity.x = toTarget.x * this.moveSpeed;
            this.velocity.z = toTarget.z * this.moveSpeed;
            
            // Face player
            this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
            
            // Occasionally lunge attack
            if (Math.random() < 0.01 && this.attackCooldown <= 0) {
                this.startLungeAttack();
            }
        } else if (distance <= this.attackRange && this.attackCooldown <= 0) {
            this.startAttack();
        } else if (distance > this.attackRange * 3) {
            // Chase directly
            toPlayer.normalize();
            this.velocity.x = toPlayer.x * this.moveSpeed;
            this.velocity.z = toPlayer.z * this.moveSpeed;
            this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
        }
    }
    
    startLungeAttack() {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        toPlayer.normalize();
        
        // Lunge forward
        this.velocity.x = toPlayer.x * this.moveSpeed * 3;
        this.velocity.z = toPlayer.z * this.moveSpeed * 3;
        
        this.startAttack();
    }
}

// ==========================================
// STONE GOLEM - Heavy, slow, high damage
// ==========================================
export class StoneGolem extends Enemy {
    constructor(game) {
        super(game, 'heavy');
        this.type = 'golem';
        
        // Golem stats
        this.maxHealth = 300;
        this.health = 300;
        this.damage = 60;
        this.moveSpeed = 2;
        this.attackRange = 3.5;
        this.attackCooldownTime = 3;
        this.maxPoise = 150;
        this.soulsReward = 150;
        
        // Golem specific
        this.size = 2;
        this.groundPoundCooldown = 0;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a6a6a,
            roughness: 0.95,
            metalness: 0.1
        });
        
        const mossMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5a3a,
            roughness: 0.9
        });
        
        // Large body
        const bodyGeometry = new THREE.BoxGeometry(1.5, 2.5, 1.2);
        const body = new THREE.Mesh(bodyGeometry, stoneMaterial);
        body.position.y = 2;
        body.castShadow = true;
        group.add(body);
        
        // Head (boulder-like)
        const headGeometry = new THREE.DodecahedronGeometry(0.6, 0);
        const head = new THREE.Mesh(headGeometry, stoneMaterial);
        head.position.y = 3.8;
        head.castShadow = true;
        group.add(head);
        
        // Glowing eyes
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa00,
            emissive: 0xffaa00,
            emissiveIntensity: 1
        });
        
        const leftEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            eyeMaterial
        );
        leftEye.position.set(-0.2, 3.9, 0.5);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 8, 8),
            eyeMaterial
        );
        rightEye.position.set(0.2, 3.9, 0.5);
        group.add(rightEye);
        
        // Arms (massive)
        const armGeometry = new THREE.BoxGeometry(0.5, 2, 0.5);
        
        const leftArm = new THREE.Mesh(armGeometry, stoneMaterial);
        leftArm.position.set(-1.2, 2, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, stoneMaterial);
        rightArm.position.set(1.2, 2, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        
        // Fists
        const fistGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        
        const leftFist = new THREE.Mesh(fistGeometry, stoneMaterial);
        leftFist.position.set(-1.2, 0.7, 0);
        leftFist.castShadow = true;
        group.add(leftFist);
        this.leftFist = leftFist;
        
        const rightFist = new THREE.Mesh(fistGeometry, stoneMaterial);
        rightFist.position.set(1.2, 0.7, 0);
        rightFist.castShadow = true;
        group.add(rightFist);
        this.rightFist = rightFist;
        
        // Legs
        const legGeometry = new THREE.BoxGeometry(0.6, 1.5, 0.6);
        
        const leftLeg = new THREE.Mesh(legGeometry, stoneMaterial);
        leftLeg.position.set(-0.5, 0.5, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, stoneMaterial);
        rightLeg.position.set(0.5, 0.5, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);
        
        // Moss patches
        const mossPositions = [
            { x: 0.3, y: 2.5, z: 0.6 },
            { x: -0.4, y: 1.8, z: 0.6 },
            { x: 0, y: 3.2, z: 0.5 }
        ];
        
        mossPositions.forEach(pos => {
            const moss = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 8, 8),
                mossMaterial
            );
            moss.position.set(pos.x, pos.y, pos.z);
            moss.scale.set(1, 0.5, 1);
            group.add(moss);
        });
        
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    startAttack() {
        // Choose attack type
        if (Math.random() < 0.3 && this.groundPoundCooldown <= 0) {
            this.startGroundPound();
        } else {
            super.startAttack();
        }
    }
    
    startGroundPound() {
        this.state = 'attack';
        this.isAttacking = true;
        this.attackTimer = 0;
        this.velocity.set(0, 0, 0);
        this.currentAttack = 'groundPound';
        this.groundPoundCooldown = 8;
    }
    
    updateAttack(deltaTime) {
        if (this.currentAttack === 'groundPound') {
            this.updateGroundPound(deltaTime);
        } else {
            super.updateAttack(deltaTime);
        }
    }
    
    updateGroundPound(deltaTime) {
        this.attackTimer += deltaTime;
        
        const windUp = 1.5;
        const execute = 0.3;
        
        if (this.attackTimer < windUp) {
            // Raise arms
            if (this.mesh) {
                this.mesh.position.y = this.position.y + Math.sin(this.attackTimer * 3) * 0.1;
            }
        } else if (this.attackTimer < windUp + execute) {
            // Ground pound!
            if (this.attackTimer < windUp + 0.1) {
                this.executeGroundPound();
            }
        } else {
            this.endAttack();
            this.currentAttack = null;
        }
    }
    
    executeGroundPound() {
        const player = this.game.player;
        const distance = this.position.distanceTo(player.position);
        
        // AOE damage
        const aoeRadius = 6;
        if (distance < aoeRadius) {
            const dmg = this.damage * 1.5 * (1 - distance / aoeRadius);
            player.takeDamage(dmg, this.position, this);
        }
        
        // Spawn ground crack particles
        this.game.particleSystem.spawnDustCloud(this.position.clone(), 40);
        
        // Screen shake effect would go here
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.groundPoundCooldown > 0) {
            this.groundPoundCooldown -= deltaTime;
        }
    }
}

// ==========================================
// DARK KNIGHT - Elite enemy, complex patterns
// ==========================================
export class DarkKnight extends Enemy {
    constructor(game) {
        super(game, 'melee');
        this.type = 'darkKnight';
        
        // Knight stats
        this.maxHealth = 200;
        this.health = 200;
        this.damage = 35;
        this.moveSpeed = 4;
        this.attackRange = 3;
        this.attackCooldownTime = 2;
        this.maxPoise = 80;
        this.soulsReward = 200;
        
        // Knight specific
        this.canBlock = true;
        this.isBlocking = false;
        this.blockCooldown = 0;
        this.comboCount = 0;
        this.maxCombo = 3;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        const armorMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const cloakMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        
        // Body (armored)
        const bodyGeometry = new THREE.CapsuleGeometry(0.45, 1.3, 8, 16);
        const body = new THREE.Mesh(bodyGeometry, armorMaterial);
        body.position.y = 1.2;
        body.castShadow = true;
        group.add(body);
        
        // Helmet
        const helmetGeometry = new THREE.ConeGeometry(0.35, 0.5, 8);
        const helmet = new THREE.Mesh(helmetGeometry, armorMaterial);
        helmet.position.y = 2.2;
        helmet.rotation.x = Math.PI;
        helmet.castShadow = true;
        group.add(helmet);
        
        // Visor (dark slit)
        const visorGeometry = new THREE.BoxGeometry(0.4, 0.08, 0.1);
        const visorMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x330011,
            emissiveIntensity: 0.5
        });
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.position.set(0, 2, 0.25);
        group.add(visor);
        
        // Shoulders (pauldrons)
        const shoulderGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        
        const leftShoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
        leftShoulder.position.set(-0.55, 1.6, 0);
        leftShoulder.scale.set(1.2, 0.8, 1);
        leftShoulder.castShadow = true;
        group.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, armorMaterial);
        rightShoulder.position.set(0.55, 1.6, 0);
        rightShoulder.scale.set(1.2, 0.8, 1);
        rightShoulder.castShadow = true;
        group.add(rightShoulder);
        
        // Arms
        const armGeometry = new THREE.CapsuleGeometry(0.12, 0.5, 4, 8);
        
        const leftArm = new THREE.Mesh(armGeometry, armorMaterial);
        leftArm.position.set(-0.55, 1, 0);
        leftArm.castShadow = true;
        group.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armorMaterial);
        rightArm.position.set(0.55, 1, 0);
        rightArm.castShadow = true;
        group.add(rightArm);
        
        // Cloak/cape
        const cloakGeometry = new THREE.PlaneGeometry(1, 1.5);
        const cloak = new THREE.Mesh(cloakGeometry, cloakMaterial);
        cloak.position.set(0, 1.2, 0.4);
        cloak.rotation.x = 0.2;
        group.add(cloak);
        
        // Weapon (dark sword)
        const swordGroup = new THREE.Group();
        
        const bladeGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.03);
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0x333344,
            roughness: 0.3,
            metalness: 0.9
        });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.75;
        blade.castShadow = true;
        swordGroup.add(blade);
        
        const handleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.1;
        swordGroup.add(handle);
        
        swordGroup.position.set(0.7, 0.8, 0);
        swordGroup.rotation.z = -0.5;
        group.add(swordGroup);
        this.weaponMesh = swordGroup;
        
        // Shield (for blocking)
        const shieldGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.1);
        const shieldMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.6,
            metalness: 0.5
        });
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.position.set(-0.6, 0.9, 0.2);
        shield.castShadow = true;
        group.add(shield);
        this.shieldMesh = shield;
        
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    updateChase(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        if (distance > this.loseAggroRange) {
            this.hasAggro = false;
            this.state = 'idle';
            return;
        }
        
        // Face player
        toPlayer.normalize();
        this.rotation = Math.atan2(toPlayer.x, toPlayer.z);
        
        // Sometimes block when player is attacking
        if (player.isAttacking && distance < 5 && !this.isBlocking && this.blockCooldown <= 0) {
            if (Math.random() < 0.5) {
                this.startBlock();
                return;
            }
        }
        
        // Attack patterns
        if (distance <= this.attackRange && this.attackCooldown <= 0) {
            this.startComboAttack();
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
    
    startBlock() {
        this.isBlocking = true;
        this.velocity.set(0, 0, 0);
        
        // Block animation
        if (this.shieldMesh) {
            this.shieldMesh.position.z = 0.5;
        }
        
        // End block after a short time
        setTimeout(() => {
            this.isBlocking = false;
            this.blockCooldown = 3;
            if (this.shieldMesh) {
                this.shieldMesh.position.z = 0.2;
            }
        }, 1000);
    }
    
    startComboAttack() {
        this.comboCount = 0;
        this.startAttack();
    }
    
    executeAttack() {
        super.executeAttack();
        
        this.comboCount++;
        
        // Continue combo
        if (this.comboCount < this.maxCombo && Math.random() < 0.7) {
            this.attackTimer = this.windUpTime * 0.5; // Faster follow-up
        }
    }
    
    takeDamage(amount, source) {
        // Block reduces damage
        if (this.isBlocking) {
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
                amount *= 0.3; // 70% damage reduction
                
                // Spawn block sparks
                this.game.particleSystem.spawnHitSparks(
                    this.position.clone().add(new THREE.Vector3(0, 1, 0)),
                    10
                );
            }
        }
        
        super.takeDamage(amount, source);
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (this.blockCooldown > 0) {
            this.blockCooldown -= deltaTime;
        }
    }
}

// ==========================================
// CRYSTAL LIZARD - Runs away, drops materials
// ==========================================
export class CrystalLizard extends Enemy {
    constructor(game) {
        super(game, 'melee');
        this.type = 'crystalLizard';
        
        // Crystal Lizard stats
        this.maxHealth = 15;
        this.health = 15;
        this.damage = 0;
        this.moveSpeed = 12;
        this.attackRange = 0;
        this.maxPoise = 5;
        this.soulsReward = 0;
        
        // Drop table
        this.drops = ['titaniteShard', 'largeTitanite', 'twinkling'];
        
        // Behavior
        this.fleeDistance = 15;
        this.despawnTimer = 15;
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        const crystalMaterial = new THREE.MeshStandardMaterial({
            color: 0x44aaff,
            emissive: 0x2288ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8,
            roughness: 0.2,
            metalness: 0.8
        });
        
        // Body
        const bodyGeometry = new THREE.DodecahedronGeometry(0.4, 1);
        const body = new THREE.Mesh(bodyGeometry, crystalMaterial);
        body.position.y = 0.4;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.OctahedronGeometry(0.2, 0);
        const head = new THREE.Mesh(headGeometry, crystalMaterial);
        head.position.set(0.4, 0.35, 0);
        group.add(head);
        
        // Legs (4 small crystals)
        const legGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);
        const legPositions = [
            { x: 0.2, z: 0.15 },
            { x: 0.2, z: -0.15 },
            { x: -0.2, z: 0.15 },
            { x: -0.2, z: -0.15 }
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, crystalMaterial);
            leg.position.set(pos.x, 0.1, pos.z);
            leg.rotation.x = Math.PI;
            group.add(leg);
        });
        
        // Tail (crystal shard)
        const tailGeometry = new THREE.ConeGeometry(0.1, 0.4, 4);
        const tail = new THREE.Mesh(tailGeometry, crystalMaterial);
        tail.position.set(-0.5, 0.35, 0);
        tail.rotation.z = Math.PI / 2;
        group.add(tail);
        
        // Glow
        const glowLight = new THREE.PointLight(0x44aaff, 0.5, 5);
        glowLight.position.y = 0.4;
        group.add(glowLight);
        
        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }
    
    updateIdle(deltaTime) {
        // Check for player - flee if detected
        if (this.detectPlayer()) {
            this.state = 'flee';
        }
        
        this.despawnTimer -= deltaTime;
        if (this.despawnTimer <= 0) {
            this.despawn();
        }
    }
    
    updateChase(deltaTime) {
        // Crystal lizards don't chase - they flee
        this.state = 'flee';
    }
    
    update(deltaTime) {
        if (!this.isAlive) {
            this.deathTimer -= deltaTime;
            return;
        }
        
        this.hitCooldown -= deltaTime;
        if (this.hitCooldown <= 0) {
            this.isHit = false;
        }
        
        // State machine
        switch (this.state) {
            case 'idle':
                this.updateIdle(deltaTime);
                break;
            case 'flee':
                this.updateFlee(deltaTime);
                break;
        }
        
        this.applyPhysics(deltaTime);
        this.updateMesh();
        
        // Sparkle effect
        if (Math.random() < 0.1) {
            const pos = this.position.clone();
            pos.y += 0.5;
            this.game.particleSystem.spawnMagicParticle(pos);
        }
    }
    
    updateFlee(deltaTime) {
        const player = this.game.player;
        const toPlayer = new THREE.Vector3();
        toPlayer.subVectors(player.position, this.position);
        toPlayer.y = 0;
        
        const distance = toPlayer.length();
        
        if (distance > this.fleeDistance) {
            this.state = 'idle';
            return;
        }
        
        // Run away from player
        toPlayer.normalize();
        this.velocity.x = -toPlayer.x * this.moveSpeed;
        this.velocity.z = -toPlayer.z * this.moveSpeed;
        
        // Face movement direction
        this.rotation = Math.atan2(-toPlayer.x, -toPlayer.z);
        
        this.despawnTimer -= deltaTime;
        if (this.despawnTimer <= 0) {
            this.despawn();
        }
    }
    
    despawn() {
        // Disappear with sparkle effect
        this.game.particleSystem.spawnMagicParticle(this.position.clone());
        this.isAlive = false;
        this.dispose();
    }
    
    die() {
        this.isAlive = false;
        this.state = 'dead';
        
        // Drop materials instead of souls
        const drop = this.drops[Math.floor(Math.random() * this.drops.length)];
        
        // Add to player inventory if system exists
        if (this.game.inventorySystem) {
            this.game.inventorySystem.addItem(drop, 1 + Math.floor(Math.random() * 2));
        }
        
        // Show drop message
        if (this.game.hud) {
            const itemNames = {
                titaniteShard: 'Titanite Shard',
                largeTitanite: 'Large Titanite Shard',
                twinkling: 'Twinkling Titanite'
            };
            this.game.hud.showItemPickup(itemNames[drop] || drop);
        }
        
        // Death effect
        if (this.mesh) {
            for (let i = 0; i < 15; i++) {
                const pos = this.position.clone();
                pos.y += 0.5;
                this.game.particleSystem.spawnMagicParticle(pos);
            }
        }
        
        this.dispose();
    }
}
