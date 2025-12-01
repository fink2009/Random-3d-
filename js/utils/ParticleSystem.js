/**
 * ParticleSystem.js - Visual Effects
 * Handles dust, sparks, blood, and environmental particles
 */

import * as THREE from 'three';

export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Particle pools
        this.particles = [];
        this.maxParticles = 1000;
        
        // Environmental particles
        this.environmentalParticles = null;
        this.setupEnvironmentalParticles();
    }
    
    setupEnvironmentalParticles() {
        // Floating dust/ash particles in the air
        const count = 500;
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
        // Update environmental particles
        this.updateEnvironmentalParticles(deltaTime);
        
        // Update active particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update lifetime
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                // Remove dead particle
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            
            // Update position
            particle.velocity.y -= particle.gravity * deltaTime;
            particle.mesh.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );
            
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
    
    // Spawn dust cloud (for rolling, landing, etc.)
    spawnDustCloud(position, count = 10) {
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
            
            this.particles.push(particle);
        }
    }
    
    // Spawn hit sparks (for weapon clashes)
    spawnHitSparks(position, count = 10) {
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
            
            this.particles.push(particle);
        }
    }
    
    // Spawn blood effect
    spawnBlood(position, direction, count = 15) {
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
            
            this.particles.push(particle);
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
        
        this.particles.push(particle);
    }
    
    // Spawn souls pickup effect
    spawnSoulsEffect(position, count = 20) {
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
            
            this.particles.push(particle);
        }
    }
    
    // Create a single particle
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
        
        const geometry = new THREE.SphereGeometry(size, 4, 4);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            metalness: 0.2,
            transparent: true,
            opacity: 1
        });
        
        if (emissive) {
            material.emissive = new THREE.Color(color);
            material.emissiveIntensity = 0.5;
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        this.scene.add(mesh);
        
        return {
            mesh,
            velocity: velocity.clone(),
            gravity,
            life,
            maxLife: life,
            baseScale: 1
        };
    }
    
    // Spawn fire particles
    spawnFire(position, count = 5) {
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
            
            this.particles.push(particle);
        }
    }
    
    dispose() {
        // Clean up all particles
        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            particle.mesh.material.dispose();
        });
        this.particles = [];
        
        if (this.environmentalParticles) {
            this.scene.remove(this.environmentalParticles);
            this.environmentalParticles.geometry.dispose();
            this.environmentalParticles.material.dispose();
        }
    }
}
