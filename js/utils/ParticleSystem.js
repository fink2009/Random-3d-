/**
 * ParticleSystem.js - Visual Effects
 * Handles dust, sparks, blood, and environmental particles
 * PERFORMANCE OPTIMIZED: Uses particle pooling and Points for efficiency
 */

import * as THREE from 'three';

export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Get particle count from quality settings
        const settings = game.settings || {};
        this.maxParticles = settings.particleCount || 100;
        this.environmentalParticleCount = settings.environmentParticles || 250;
        
        // Particle pools for object reuse
        this.particles = [];
        this.particlePool = [];
        
        // Pre-create particle pool
        this.initParticlePool();
        
        // Environmental particles
        this.environmentalParticles = null;
        this.setupEnvironmentalParticles();
    }
    
    /**
     * PERFORMANCE: Pre-create particle objects for pooling
     */
    initParticlePool() {
        // Use a shared geometry and material for pooled particles
        this.sharedParticleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        this.sharedParticleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        
        // Pre-create some particles for the pool
        const poolSize = Math.min(50, this.maxParticles);
        for (let i = 0; i < poolSize; i++) {
            const mesh = new THREE.Mesh(
                this.sharedParticleGeometry,
                this.sharedParticleMaterial.clone()
            );
            mesh.visible = false;
            this.scene.add(mesh);
            this.particlePool.push({
                mesh,
                velocity: new THREE.Vector3(),
                gravity: 10,
                life: 0,
                maxLife: 1,
                baseScale: 1,
                inUse: false
            });
        }
    }
    
    /**
     * Get a particle from the pool or create a new one
     */
    getParticleFromPool() {
        // First try to find an unused particle in the pool
        for (const particle of this.particlePool) {
            if (!particle.inUse) {
                particle.inUse = true;
                particle.mesh.visible = true;
                return particle;
            }
        }
        
        // If pool is exhausted and we haven't hit max, create new one
        if (this.particles.length < this.maxParticles) {
            const mesh = new THREE.Mesh(
                this.sharedParticleGeometry,
                this.sharedParticleMaterial.clone()
            );
            this.scene.add(mesh);
            const particle = {
                mesh,
                velocity: new THREE.Vector3(),
                gravity: 10,
                life: 0,
                maxLife: 1,
                baseScale: 1,
                inUse: true
            };
            this.particlePool.push(particle);
            return particle;
        }
        
        return null; // Pool exhausted
    }
    
    /**
     * Return a particle to the pool
     */
    returnToPool(particle) {
        particle.inUse = false;
        particle.mesh.visible = false;
        particle.life = 0;
    }
    
    setupEnvironmentalParticles() {
        // Floating dust/ash particles in the air - use quality settings
        const count = this.environmentalParticleCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.5,
                y: Math.random() * 0.2,
                z: (Math.random() - 0.5) * 0.5
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.3,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });
        
        this.environmentalParticles = new THREE.Points(geometry, material);
        this.environmentalParticles.velocities = velocities;
        this.scene.add(this.environmentalParticles);
    }
    
    update(deltaTime) {
        // Update environmental particles every other frame for performance
        this.updateEnvironmentalParticles(deltaTime);
        
        // Update active particles using pool system
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update lifetime
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                // Return particle to pool instead of destroying
                this.returnToPool(particle);
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.velocity.y -= particle.gravity * deltaTime;
            particle.mesh.position.x += particle.velocity.x * deltaTime;
            particle.mesh.position.y += particle.velocity.y * deltaTime;
            particle.mesh.position.z += particle.velocity.z * deltaTime;
            
            // Update scale (shrink over time)
            const lifeRatio = particle.life / particle.maxLife;
            particle.mesh.scale.setScalar(particle.baseScale * lifeRatio);
            
            // Update opacity
            if (particle.mesh.material.opacity !== undefined) {
                particle.mesh.material.opacity = lifeRatio;
            }
        }
    }
    
    updateEnvironmentalParticles(deltaTime) {
        if (!this.environmentalParticles) return;
        
        const positions = this.environmentalParticles.geometry.attributes.position.array;
        const velocities = this.environmentalParticles.velocities;
        const player = this.game.player;
        
        for (let i = 0; i < velocities.length; i++) {
            positions[i * 3] += velocities[i].x * deltaTime;
            positions[i * 3 + 1] += velocities[i].y * deltaTime;
            positions[i * 3 + 2] += velocities[i].z * deltaTime;
            
            // Keep particles near player
            if (player) {
                const dx = positions[i * 3] - player.position.x;
                const dz = positions[i * 3 + 2] - player.position.z;
                
                if (Math.abs(dx) > 100) {
                    positions[i * 3] = player.position.x + (Math.random() - 0.5) * 100;
                }
                if (Math.abs(dz) > 100) {
                    positions[i * 3 + 2] = player.position.z + (Math.random() - 0.5) * 100;
                }
                if (positions[i * 3 + 1] > 50) {
                    positions[i * 3 + 1] = 0;
                }
            }
        }
        
        this.environmentalParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // Spawn dust cloud (for rolling, landing, etc.) - reduced count
    spawnDustCloud(position, count = 5) { // Reduced from 10
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle({
                position: position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 0.5,
                    (Math.random() - 0.5) * 1
                )),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 2,
                    (Math.random() - 0.5) * 3
                ),
                color: 0x888888,
                size: 0.2 + Math.random() * 0.3,
                life: 0.5 + Math.random() * 0.5,
                gravity: 5
            });
            
            if (particle) {
                this.particles.push(particle);
            }
        }
    }
    
    // Spawn hit sparks (for weapon clashes) - reduced count
    spawnHitSparks(position, count = 5) { // Reduced from 10
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle({
                position: position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 8
                ),
                color: 0xffaa00,
                size: 0.1 + Math.random() * 0.1,
                life: 0.2 + Math.random() * 0.2,
                gravity: 15,
                emissive: true
            });
            
            if (particle) {
                this.particles.push(particle);
            }
        }
    }
    
    // Spawn blood effect - reduced count
    spawnBlood(position, direction, count = 8) { // Reduced from 15
        for (let i = 0; i < count; i++) {
            const velocity = direction.clone().multiplyScalar(3);
            velocity.x += (Math.random() - 0.5) * 4;
            velocity.y += Math.random() * 3;
            velocity.z += (Math.random() - 0.5) * 4;
            
            const particle = this.createParticle({
                position: position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * 0.5,
                    (Math.random() - 0.5) * 0.5
                )),
                velocity: velocity,
                color: 0x880000,
                size: 0.1 + Math.random() * 0.15,
                life: 0.5 + Math.random() * 0.5,
                gravity: 20
            });
            
            if (particle) {
                this.particles.push(particle);
            }
        }
    }
    
    // Spawn magic/soul particle
    spawnMagicParticle(position) {
        const particle = this.createParticle({
            position: position.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 2
            ),
            color: 0x4488ff,
            size: 0.2 + Math.random() * 0.2,
            life: 1 + Math.random(),
            gravity: -2, // Float upward
            emissive: true
        });
        
        if (particle) {
            this.particles.push(particle);
        }
    }
    
    // Spawn souls pickup effect - reduced count
    spawnSoulsEffect(position, count = 10) { // Reduced from 20
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 1 + Math.random();
            
            const particle = this.createParticle({
                position: position.clone().add(new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.random(),
                    Math.sin(angle) * radius
                )),
                velocity: new THREE.Vector3(
                    -Math.cos(angle) * 2,
                    2 + Math.random() * 2,
                    -Math.sin(angle) * 2
                ),
                color: 0xd4af37,
                size: 0.15 + Math.random() * 0.1,
                life: 1.5,
                gravity: -1,
                emissive: true
            });
            
            if (particle) {
                this.particles.push(particle);
            }
        }
    }
    
    // Create a single particle using the pool system
    createParticle(options) {
        const {
            position,
            velocity,
            color = 0xffffff,
            size = 0.2,
            life = 1,
            gravity = 10,
            emissive = false
        } = options;
        
        // Try to get a particle from the pool
        const particle = this.getParticleFromPool();
        
        if (!particle) {
            return null; // Pool exhausted
        }
        
        // Configure the pooled particle
        particle.mesh.position.copy(position);
        particle.mesh.scale.setScalar(size);
        particle.mesh.material.color.setHex(color);
        particle.mesh.material.opacity = 1;
        
        if (emissive) {
            particle.mesh.material.emissive = new THREE.Color(color);
            particle.mesh.material.emissiveIntensity = 0.5;
        } else {
            particle.mesh.material.emissive = new THREE.Color(0x000000);
            particle.mesh.material.emissiveIntensity = 0;
        }
        
        particle.velocity.copy(velocity);
        particle.gravity = gravity;
        particle.life = life;
        particle.maxLife = life;
        particle.baseScale = size;
        
        return particle;
    }
    
    // Spawn fire particles
    spawnFire(position, count = 3) { // Reduced from 5
        for (let i = 0; i < count; i++) {
            const particle = this.createParticle({
                position: position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * 0.3,
                    (Math.random() - 0.5) * 0.5
                )),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    2 + Math.random() * 2,
                    (Math.random() - 0.5) * 0.5
                ),
                color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00,
                size: 0.1 + Math.random() * 0.1,
                life: 0.3 + Math.random() * 0.3,
                gravity: -3,
                emissive: true
            });
            
            if (particle) {
                this.particles.push(particle);
            }
        }
    }
    
    dispose() {
        // Clean up all particles in pool
        this.particlePool.forEach(particle => {
            this.scene.remove(particle.mesh);
            if (particle.mesh.material !== this.sharedParticleMaterial) {
                particle.mesh.material.dispose();
            }
        });
        this.particlePool = [];
        this.particles = [];
        
        // Dispose shared resources
        if (this.sharedParticleGeometry) {
            this.sharedParticleGeometry.dispose();
        }
        if (this.sharedParticleMaterial) {
            this.sharedParticleMaterial.dispose();
        }
        
        if (this.environmentalParticles) {
            this.scene.remove(this.environmentalParticles);
            this.environmentalParticles.geometry.dispose();
            this.environmentalParticles.material.dispose();
        }
    }
}
