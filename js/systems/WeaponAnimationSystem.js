/**
 * Enhanced Weapon Animation System
 * Handles attack animations, combo chains, and visual feedback
 */

class WeaponAnimationSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Combo system
        this.comboState = {
            count: 0,
            multiplier: 1,
            lastHitTime: 0,
            comboWindow: 2000, // ms
            maxCombo: 5
        };
        
        // Animation states
        this.animationStates = new Map();
        this.activeAttacks = new Set();
        this.weaponAnimations = new Map();
        
        // Visual feedback
        this.hitEffects = [];
        this.damageNumbers = [];
        this.screenShakeIntensity = 0;
        
        // Weapon configurations
        this.weaponConfigs = this.initializeWeaponConfigs();
        
        // Performance tracking
        this.lastFrameTime = Date.now();
    }

    /**
     * Initialize weapon-specific animation configurations
     */
    initializeWeaponConfigs() {
        return {
            sword: {
                attackSpeed: 0.8,
                animationDuration: 500,
                range: 4,
                damage: 15,
                comboMoves: [
                    { name: 'slash1', duration: 400, angle: Math.PI / 4 },
                    { name: 'slash2', duration: 400, angle: Math.PI / 3 },
                    { name: 'slash3', duration: 450, angle: Math.PI / 2 },
                    { name: 'spinAttack', duration: 600, angle: Math.PI * 2 }
                ],
                hitEffect: 'spark',
                sound: 'slash'
            },
            axe: {
                attackSpeed: 0.6,
                animationDuration: 700,
                range: 5,
                damage: 25,
                comboMoves: [
                    { name: 'heavyChop', duration: 600, angle: Math.PI / 3 },
                    { name: 'doubleChop', duration: 700, angle: Math.PI / 4 },
                    { name: 'whirlwind', duration: 800, angle: Math.PI * 2.5 }
                ],
                hitEffect: 'impact',
                sound: 'chop'
            },
            dagger: {
                attackSpeed: 1.2,
                animationDuration: 300,
                range: 2,
                damage: 8,
                comboMoves: [
                    { name: 'stab1', duration: 250, angle: Math.PI / 6 },
                    { name: 'stab2', duration: 250, angle: Math.PI / 6 },
                    { name: 'stab3', duration: 250, angle: Math.PI / 6 },
                    { name: 'backstab', duration: 400, angle: Math.PI / 8 },
                    { name: 'flurry', duration: 600, angle: Math.PI / 3 }
                ],
                hitEffect: 'blood',
                sound: 'stab'
            },
            bow: {
                attackSpeed: 0.9,
                animationDuration: 600,
                range: 50,
                damage: 18,
                comboMoves: [
                    { name: 'singleShot', duration: 500, angle: 0 },
                    { name: 'doubleShot', duration: 600, angle: Math.PI / 12 },
                    { name: 'powerShot', duration: 800, angle: 0 },
                    { name: 'spreadShot', duration: 700, angle: Math.PI / 3 }
                ],
                hitEffect: 'pierce',
                sound: 'bowShot'
            }
        };
    }

    /**
     * Start a weapon attack with animation
     */
    startAttack(attacker, weapon = 'sword', targetPosition = null) {
        const weaponConfig = this.weaponConfigs[weapon] || this.weaponConfigs.sword;
        const comboIndex = Math.min(this.comboState.count, weaponConfig.comboMoves.length - 1);
        const move = weaponConfig.comboMoves[comboIndex];
        
        const attackId = `${attacker.id}-${Date.now()}`;
        
        // Create animation state
        const animState = {
            id: attackId,
            attacker,
            weapon,
            weaponConfig,
            move,
            startTime: Date.now(),
            duration: move.duration,
            progress: 0,
            isActive: true,
            hasHit: false,
            targetPosition
        };
        
        this.animationStates.set(attackId, animState);
        this.activeAttacks.add(attackId);
        
        // Play animation
        this.playWeaponAnimation(attacker, move, weaponConfig);
        
        return attackId;
    }

    /**
     * Play weapon animation with three.js
     */
    playWeaponAnimation(attacker, move, config) {
        if (!attacker.mesh) return;
        
        const duration = move.duration / 1000; // Convert to seconds
        const originalRotation = {
            x: attacker.mesh.rotation.x,
            y: attacker.mesh.rotation.y,
            z: attacker.mesh.rotation.z
        };
        
        // Store animation for tracking
        const animation = {
            startTime: Date.now(),
            duration: move.duration,
            originalRotation,
            angle: move.angle,
            name: move.name
        };
        
        this.weaponAnimations.set(attacker.id, animation);
    }

    /**
     * Register a hit during attack
     */
    registerHit(attackId, target, damage = null) {
        const animState = this.animationStates.get(attackId);
        if (!animState || animState.hasHit) return false;
        
        animState.hasHit = true;
        
        const weaponConfig = animState.weaponConfig;
        const baseDamage = damage || weaponConfig.damage;
        const finalDamage = this.calculateDamageWithCombo(baseDamage);
        
        // Update combo state
        this.updateCombo();
        
        // Create visual feedback
        this.createHitEffect(target, animState, finalDamage);
        
        return {
            damage: finalDamage,
            comboMultiplier: this.comboState.multiplier,
            comboCount: this.comboState.count
        };
    }

    /**
     * Calculate damage with combo multiplier
     */
    calculateDamageWithCombo(baseDamage) {
        const multiplier = 1 + (this.comboState.count * 0.15); // 15% per combo
        return Math.floor(baseDamage * multiplier);
    }

    /**
     * Update combo state
     */
    updateCombo() {
        const now = Date.now();
        
        // Reset combo if window expired
        if (now - this.comboState.lastHitTime > this.comboState.comboWindow) {
            this.comboState.count = 0;
            this.comboState.multiplier = 1;
        }
        
        // Increment combo
        if (this.comboState.count < this.comboState.maxCombo) {
            this.comboState.count++;
            this.comboState.multiplier = 1 + (this.comboState.count * 0.15);
        }
        
        this.comboState.lastHitTime = now;
    }

    /**
     * Reset combo state
     */
    resetCombo() {
        this.comboState.count = 0;
        this.comboState.multiplier = 1;
        this.comboState.lastHitTime = Date.now();
    }

    /**
     * Create visual hit effects
     */
    createHitEffect(target, animState, damage) {
        const hitPosition = target.mesh ? target.mesh.position.clone() : animState.targetPosition;
        
        // Create hit effect mesh
        const effectType = animState.weaponConfig.hitEffect;
        const effect = this.createEffectMesh(effectType, hitPosition);
        
        if (effect) {
            this.scene.add(effect);
            this.hitEffects.push({
                mesh: effect,
                startTime: Date.now(),
                duration: 400,
                type: effectType
            });
        }
        
        // Create damage number
        this.displayDamageNumber(hitPosition, damage, this.comboState.count);
        
        // Screen shake based on damage
        this.screenShakeIntensity = Math.min(damage / 10, 0.5);
    }

    /**
     * Create effect mesh based on type
     */
    createEffectMesh(effectType, position) {
        let geometry, material, mesh;
        
        switch (effectType) {
            case 'spark':
                geometry = new THREE.BufferGeometry();
                const sparkCount = 12;
                const positions = [];
                for (let i = 0; i < sparkCount; i++) {
                    const angle = (i / sparkCount) * Math.PI * 2;
                    const radius = 0.5;
                    positions.push(
                        Math.cos(angle) * radius,
                        (Math.random() - 0.5) * 0.5,
                        Math.sin(angle) * radius
                    );
                }
                geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
                material = new THREE.PointsMaterial({ color: 0xFFAA00, size: 0.2, sizeAttenuation: true });
                mesh = new THREE.Points(geometry, material);
                break;
                
            case 'impact':
                geometry = new THREE.IcosahedronGeometry(0.3, 1);
                material = new THREE.MeshBasicMaterial({ color: 0xFF4400 });
                mesh = new THREE.Mesh(geometry, material);
                break;
                
            case 'blood':
                geometry = new THREE.TetrahedronGeometry(0.2, 0);
                material = new THREE.MeshBasicMaterial({ color: 0xCC0000 });
                mesh = new THREE.Mesh(geometry, material);
                break;
                
            case 'pierce':
                geometry = new THREE.SphereGeometry(0.15, 4, 4);
                material = new THREE.MeshBasicMaterial({ color: 0x00CCFF });
                mesh = new THREE.Mesh(geometry, material);
                break;
                
            default:
                return null;
        }
        
        mesh.position.copy(position);
        mesh.position.y += 1;
        return mesh;
    }

    /**
     * Display damage numbers floating above target
     */
    displayDamageNumber(position, damage, comboCount) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = comboCount > 2 ? '#FFD700' : '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const displayText = comboCount > 0 ? `${damage}x${comboCount}` : damage.toString();
        ctx.fillText(displayText, 128, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(2, 1);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(position);
        mesh.position.y += 2;
        mesh.position.z = 0.1;
        
        this.scene.add(mesh);
        this.damageNumbers.push({
            mesh,
            startTime: Date.now(),
            duration: 1000,
            material
        });
    }

    /**
     * Update animations each frame
     */
    update(deltaTime) {
        const now = Date.now();
        
        // Update active attacks
        this.updateAttackAnimations(now);
        
        // Update hit effects
        this.updateHitEffects(now);
        
        // Update damage numbers
        this.updateDamageNumbers(now);
        
        // Update combo timeout
        this.checkComboTimeout();
        
        // Apply screen shake
        this.applyScreenShake();
    }

    /**
     * Update attack animations
     */
    updateAttackAnimations(now) {
        const expiredAttacks = [];
        
        this.animationStates.forEach((state, id) => {
            state.progress = (now - state.startTime) / state.duration;
            
            if (state.progress >= 1) {
                state.isActive = false;
                expiredAttacks.push(id);
            }
        });
        
        // Clean up expired attacks
        expiredAttacks.forEach(id => {
            this.animationStates.delete(id);
            this.activeAttacks.delete(id);
        });
    }

    /**
     * Update hit effects
     */
    updateHitEffects(now) {
        this.hitEffects = this.hitEffects.filter(effect => {
            const elapsed = now - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1) {
                this.scene.remove(effect.mesh);
                return false;
            }
            
            // Fade out effect
            if (effect.mesh.material) {
                effect.mesh.material.opacity = 1 - progress;
            } else if (effect.mesh.material instanceof THREE.PointsMaterial) {
                effect.mesh.material.opacity = 1 - progress;
            }
            
            // Move effect upward
            effect.mesh.position.y += 0.02;
            
            return true;
        });
    }

    /**
     * Update floating damage numbers
     */
    updateDamageNumbers(now) {
        this.damageNumbers = this.damageNumbers.filter(item => {
            const elapsed = now - item.startTime;
            const progress = elapsed / item.duration;
            
            if (progress >= 1) {
                this.scene.remove(item.mesh);
                return false;
            }
            
            // Float upward and fade out
            item.mesh.position.y += 0.02;
            item.material.opacity = 1 - progress;
            
            return true;
        });
    }

    /**
     * Check if combo window has expired
     */
    checkComboTimeout() {
        const now = Date.now();
        if (now - this.comboState.lastHitTime > this.comboState.comboWindow) {
            // Optionally reset combo (or let it persist until next action)
            // this.resetCombo();
        }
    }

    /**
     * Apply screen shake effect
     */
    applyScreenShake() {
        if (this.screenShakeIntensity > 0.01) {
            const shakeAmount = this.screenShakeIntensity;
            this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
            this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
            this.camera.position.z += (Math.random() - 0.5) * shakeAmount;
            
            this.screenShakeIntensity *= 0.95; // Decay
        }
    }

    /**
     * Get current combo state
     */
    getComboState() {
        return {
            count: this.comboState.count,
            multiplier: this.comboState.multiplier,
            timeRemaining: Math.max(0, this.comboState.comboWindow - (Date.now() - this.comboState.lastHitTime))
        };
    }

    /**
     * Get weapon configuration
     */
    getWeaponConfig(weapon) {
        return this.weaponConfigs[weapon] || this.weaponConfigs.sword;
    }

    /**
     * Add custom weapon configuration
     */
    addWeaponConfig(weapon, config) {
        this.weaponConfigs[weapon] = config;
    }

    /**
     * Check if attack is currently active
     */
    isAttacking(attackerId) {
        for (let attackId of this.activeAttacks) {
            const state = this.animationStates.get(attackId);
            if (state && state.attacker.id === attackerId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get active attack count for an attacker
     */
    getActiveAttackCount(attackerId) {
        let count = 0;
        for (let attackId of this.activeAttacks) {
            const state = this.animationStates.get(attackId);
            if (state && state.attacker.id === attackerId) {
                count++;
            }
        }
        return count;
    }

    /**
     * Interrupt attack (for stun, knockback, etc)
     */
    interruptAttack(attackId) {
        const state = this.animationStates.get(attackId);
        if (state) {
            state.isActive = false;
            this.animationStates.delete(attackId);
            this.activeAttacks.delete(attackId);
            return true;
        }
        return false;
    }

    /**
     * Clear all animations and effects
     */
    clearAll() {
        // Remove all hit effects
        this.hitEffects.forEach(effect => {
            this.scene.remove(effect.mesh);
        });
        this.hitEffects = [];
        
        // Remove all damage numbers
        this.damageNumbers.forEach(item => {
            this.scene.remove(item.mesh);
        });
        this.damageNumbers = [];
        
        // Clear animations
        this.animationStates.clear();
        this.activeAttacks.clear();
        this.weaponAnimations.clear();
        
        // Reset combo
        this.resetCombo();
        
        this.screenShakeIntensity = 0;
    }

    /**
     * Dispose resources
     */
    dispose() {
        this.clearAll();
        this.animationStates.clear();
        this.weaponAnimations.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeaponAnimationSystem;
}
