/**
 * Enhanced Particle Effects System
 * Features: Quality-based limiting, resource cleanup, performance optimization
 */

class EnhancedParticleSystem {
  constructor(options = {}) {
    // Configuration
    this.maxParticles = options.maxParticles || 5000;
    this.qualityLevel = options.qualityLevel || 'high'; // 'low', 'medium', 'high', 'ultra'
    this.enableAutoCleanup = options.enableAutoCleanup !== false;
    this.cleanupInterval = options.cleanupInterval || 5000; // ms
    this.usePooling = options.usePooling !== false;
    this.enableLOD = options.enableLOD !== false; // Level of Detail
    
    // Particle data
    this.particles = [];
    this.particlePool = [];
    this.emitters = [];
    this.forces = [];
    
    // Statistics
    this.stats = {
      activeParticles: 0,
      pooledParticles: 0,
      totalEmitters: 0,
      memoryUsage: 0,
      lastCleanupTime: Date.now(),
      particlesCreated: 0,
      particlesDestroyed: 0
    };
    
    // Quality settings based on level
    this.qualitySettings = this._getQualitySettings(this.qualityLevel);
    
    // Performance tracking
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fps = 60;
    
    // Cleanup
    if (this.enableAutoCleanup) {
      this.cleanupTimer = setInterval(() => this._cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Get quality-based settings
   */
  _getQualitySettings(level) {
    const settings = {
      low: {
        renderDistance: 100,
        maxParticlesPerEmitter: 50,
        updateFrequency: 2, // Update every 2 frames
        particleLODThreshold: 50,
        enableTrails: false,
        enableShadows: false,
        enableCollisions: false,
        particleDetailLevel: 0.5
      },
      medium: {
        renderDistance: 250,
        maxParticlesPerEmitter: 150,
        updateFrequency: 1,
        particleLODThreshold: 100,
        enableTrails: false,
        enableShadows: false,
        enableCollisions: false,
        particleDetailLevel: 0.75
      },
      high: {
        renderDistance: 500,
        maxParticlesPerEmitter: 300,
        updateFrequency: 1,
        particleLODThreshold: 200,
        enableTrails: true,
        enableShadows: false,
        enableCollisions: true,
        particleDetailLevel: 1.0
      },
      ultra: {
        renderDistance: 1000,
        maxParticlesPerEmitter: 500,
        updateFrequency: 1,
        particleLODThreshold: 500,
        enableTrails: true,
        enableShadows: true,
        enableCollisions: true,
        particleDetailLevel: 1.2
      }
    };

    return settings[level] || settings.high;
  }

  /**
   * Create an emitter
   */
  createEmitter(config = {}) {
    const emitter = {
      id: `emitter_${Date.now()}_${Math.random()}`,
      position: config.position || { x: 0, y: 0, z: 0 },
      velocity: config.velocity || { x: 0, y: 0, z: 0 },
      acceleration: config.acceleration || { x: 0, y: -0.1, z: 0 },
      emissionRate: config.emissionRate || 10, // particles per frame
      particleLifetime: config.particleLifetime || 2000, // ms
      particleVelocity: config.particleVelocity || { x: 0, y: 0.5, z: 0 },
      particleVelocityVariance: config.particleVelocityVariance || { x: 2, y: 1, z: 2 },
      particleSize: config.particleSize || 5,
      particleSizeVariance: config.particleSizeVariance || 2,
      particleColor: config.particleColor || { r: 1, g: 1, b: 1, a: 1 },
      colorVariance: config.colorVariance || { r: 0.2, g: 0.2, b: 0.2, a: 0 },
      isActive: config.isActive !== false,
      emissionDuration: config.emissionDuration || Infinity,
      emissionStartTime: Date.now(),
      enableTrail: config.enableTrail && this.qualitySettings.enableTrails,
      trailLength: config.trailLength || 5,
      shape: config.shape || 'sphere', // 'sphere', 'box', 'cone', 'point'
      shapeSize: config.shapeSize || 1
    };

    this.emitters.push(emitter);
    this.stats.totalEmitters = this.emitters.length;
    return emitter.id;
  }

  /**
   * Emit particles from an emitter
   */
  _emitParticles(emitter, deltaTime) {
    if (!emitter.isActive) return;

    // Check if emission duration has passed
    const emissionElapsed = Date.now() - emitter.emissionStartTime;
    if (emissionElapsed > emitter.emissionDuration) {
      emitter.isActive = false;
      return;
    }

    // Check quality-based limits
    const emitterParticleCount = this.particles.filter(p => p.emitterId === emitter.id).length;
    if (emitterParticleCount >= this.qualitySettings.maxParticlesPerEmitter) {
      return;
    }

    // Check global particle limit
    if (this.particles.length >= this.maxParticles) {
      return;
    }

    const particlesPerFrame = Math.ceil(emitter.emissionRate * deltaTime / 1000);
    for (let i = 0; i < particlesPerFrame; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const particle = this._createParticle(emitter);
      if (particle) {
        this.particles.push(particle);
      }
    }
  }

  /**
   * Create a single particle
   */
  _createParticle(emitter) {
    // Try to reuse from pool
    let particle = this.usePooling && this.particlePool.length > 0 
      ? this.particlePool.pop() 
      : null;

    if (!particle) {
      particle = {};
      this.stats.particlesCreated++;
    }

    // Set particle properties
    const emissionPos = this._getEmissionPoint(emitter);
    particle.position = { ...emissionPos };
    particle.velocity = this._getVariedVelocity(
      emitter.particleVelocity,
      emitter.particleVelocityVariance
    );
    particle.acceleration = { ...emitter.acceleration };
    particle.lifetime = emitter.particleLifetime;
    particle.startTime = Date.now();
    particle.size = emitter.particleSize + (Math.random() - 0.5) * emitter.particleSizeVariance * 2;
    particle.color = this._getVariedColor(emitter.particleColor, emitter.colorVariance);
    particle.emitterId = emitter.id;
    particle.alpha = particle.color.a;
    particle.trail = emitter.enableTrail ? [] : null;
    particle.collisionEnabled = this.qualitySettings.enableCollisions;

    return particle;
  }

  /**
   * Get emission point based on shape
   */
  _getEmissionPoint(emitter) {
    const base = { ...emitter.position };
    const size = emitter.shapeSize;

    switch (emitter.shape) {
      case 'sphere': {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = Math.random() * size;
        base.x += r * Math.sin(phi) * Math.cos(theta);
        base.y += r * Math.sin(phi) * Math.sin(theta);
        base.z += r * Math.cos(phi);
        break;
      }
      case 'box': {
        base.x += (Math.random() - 0.5) * size * 2;
        base.y += (Math.random() - 0.5) * size * 2;
        base.z += (Math.random() - 0.5) * size * 2;
        break;
      }
      case 'cone': {
        const theta = Math.random() * Math.PI * 2;
        const height = Math.random() * size;
        const radius = (height / size) * size;
        base.x += radius * Math.cos(theta);
        base.z += radius * Math.sin(theta);
        base.y += height;
        break;
      }
      default: // 'point'
        break;
    }

    return base;
  }

  /**
   * Get velocity with variation
   */
  _getVariedVelocity(baseVelocity, variance) {
    return {
      x: baseVelocity.x + (Math.random() - 0.5) * variance.x * 2,
      y: baseVelocity.y + (Math.random() - 0.5) * variance.y * 2,
      z: baseVelocity.z + (Math.random() - 0.5) * variance.z * 2
    };
  }

  /**
   * Get color with variation
   */
  _getVariedColor(baseColor, variance) {
    return {
      r: Math.max(0, Math.min(1, baseColor.r + (Math.random() - 0.5) * variance.r * 2)),
      g: Math.max(0, Math.min(1, baseColor.g + (Math.random() - 0.5) * variance.g * 2)),
      b: Math.max(0, Math.min(1, baseColor.b + (Math.random() - 0.5) * variance.b * 2)),
      a: baseColor.a
    };
  }

  /**
   * Add a global force (gravity, wind, etc.)
   */
  addForce(force) {
    this.forces.push({
      id: `force_${Date.now()}_${Math.random()}`,
      type: force.type || 'constant', // 'constant', 'turbulence', 'attraction'
      direction: force.direction || { x: 0, y: -1, z: 0 },
      magnitude: force.magnitude || 0.1,
      radius: force.radius || Infinity,
      origin: force.origin || { x: 0, y: 0, z: 0 }
    });
  }

  /**
   * Update all particles
   */
  update(deltaTime = 16.67) {
    this.frameCount++;

    // Update emitters and emit new particles
    for (const emitter of this.emitters) {
      this._emitParticles(emitter, deltaTime);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const elapsed = Date.now() - particle.startTime;

      // Check lifetime
      if (elapsed > particle.lifetime) {
        this._returnParticleToPool(particle);
        this.particles.splice(i, 1);
        this.stats.particlesDestroyed++;
        continue;
      }

      // Update physics
      this._updateParticlePhysics(particle, deltaTime);

      // Update trail
      if (particle.trail) {
        this._updateParticleTrail(particle);
      }

      // Update alpha fade
      const progress = elapsed / particle.lifetime;
      particle.alpha = particle.color.a * (1 - Math.pow(progress, 2)); // Quadratic fade
    }

    // Apply LOD
    if (this.enableLOD) {
      this._applyLOD();
    }

    // Update stats
    this.stats.activeParticles = this.particles.length;
    this.stats.pooledParticles = this.particlePool.length;
    this._updateMemoryUsage();
    this._updateFPS();
  }

  /**
   * Update particle physics
   */
  _updateParticlePhysics(particle, deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds

    // Apply acceleration
    particle.velocity.x += particle.acceleration.x * dt;
    particle.velocity.y += particle.acceleration.y * dt;
    particle.velocity.z += particle.acceleration.z * dt;

    // Apply forces
    for (const force of this.forces) {
      this._applyForce(particle, force, dt);
    }

    // Update position
    particle.position.x += particle.velocity.x * dt;
    particle.position.y += particle.velocity.y * dt;
    particle.position.z += particle.velocity.z * dt;

    // Apply damping
    const damping = 0.98;
    particle.velocity.x *= damping;
    particle.velocity.y *= damping;
    particle.velocity.z *= damping;
  }

  /**
   * Apply force to particle
   */
  _applyForce(particle, force, deltaTime) {
    switch (force.type) {
      case 'constant': {
        particle.velocity.x += force.direction.x * force.magnitude * deltaTime;
        particle.velocity.y += force.direction.y * force.magnitude * deltaTime;
        particle.velocity.z += force.direction.z * force.magnitude * deltaTime;
        break;
      }
      case 'turbulence': {
        const noise = this._perlinNoise(particle.position, Date.now());
        particle.velocity.x += (noise.x - 0.5) * force.magnitude * 2 * deltaTime;
        particle.velocity.y += (noise.y - 0.5) * force.magnitude * 2 * deltaTime;
        particle.velocity.z += (noise.z - 0.5) * force.magnitude * 2 * deltaTime;
        break;
      }
      case 'attraction': {
        const dx = force.origin.x - particle.position.x;
        const dy = force.origin.y - particle.position.y;
        const dz = force.origin.z - particle.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < force.radius * force.radius && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const forceFactor = force.magnitude / dist;
          particle.velocity.x += (dx / dist) * forceFactor * deltaTime;
          particle.velocity.y += (dy / dist) * forceFactor * deltaTime;
          particle.velocity.z += (dz / dist) * forceFactor * deltaTime;
        }
        break;
      }
    }
  }

  /**
   * Simple pseudo-random noise (can be replaced with proper Perlin noise)
   */
  _perlinNoise(position, time) {
    const hash = Math.sin(position.x * 12.9898 + position.y * 78.233 + position.z * 45.164 + time * 0.001) * 43758.5453;
    const frac = hash - Math.floor(hash);
    return {
      x: frac,
      y: Math.sin(frac * Math.PI) * 0.5 + 0.5,
      z: Math.cos(frac * Math.PI) * 0.5 + 0.5
    };
  }

  /**
   * Update particle trail
   */
  _updateParticleTrail(particle) {
    particle.trail.push({
      x: particle.position.x,
      y: particle.position.y,
      z: particle.position.z,
      time: Date.now()
    });

    if (particle.trail.length > particle.trailLength || true) {
      particle.trail.shift();
    }
  }

  /**
   * Apply Level of Detail
   */
  _applyLOD() {
    if (this.particles.length > this.qualitySettings.particleLODThreshold) {
      // Skip rendering distant particles
      for (const particle of this.particles) {
        const distSq = particle.position.x * particle.position.x + 
                      particle.position.y * particle.position.y + 
                      particle.position.z * particle.position.z;
        particle.renderDistance = Math.sqrt(distSq);
        particle.shouldRender = particle.renderDistance < this.qualitySettings.renderDistance;
      }
    }
  }

  /**
   * Return particle to pool
   */
  _returnParticleToPool(particle) {
    if (this.usePooling && this.particlePool.length < this.maxParticles * 0.5) {
      // Reset particle for reuse
      particle.trail = null;
      particle.position = { x: 0, y: 0, z: 0 };
      particle.velocity = { x: 0, y: 0, z: 0 };
      this.particlePool.push(particle);
    }
  }

  /**
   * Update memory usage estimate
   */
  _updateMemoryUsage() {
    const particleSize = 32 * this.particles.length; // Approximate bytes per particle
    const poolSize = 32 * this.particlePool.length;
    const emitterSize = 256 * this.emitters.length;
    this.stats.memoryUsage = (particleSize + poolSize + emitterSize) / 1024; // KB
  }

  /**
   * Update FPS counter
   */
  _updateFPS() {
    const now = Date.now();
    const delta = now - this.lastFrameTime;
    if (delta > 0) {
      this.fps = 1000 / delta;
    }
    this.lastFrameTime = now;
  }

  /**
   * Cleanup inactive particles and emitters
   */
  _cleanup() {
    const now = Date.now();

    // Remove inactive emitters
    this.emitters = this.emitters.filter(e => {
      if (!e.isActive && this.particles.every(p => p.emitterId !== e.id)) {
        return false;
      }
      return true;
    });

    // Trim pool if too large
    if (this.particlePool.length > this.maxParticles * 0.3) {
      this.particlePool.splice(0, Math.floor(this.particlePool.length * 0.2));
    }

    this.stats.lastCleanupTime = now;
  }

  /**
   * Stop an emitter
   */
  stopEmitter(emitterId) {
    const emitter = this.emitters.find(e => e.id === emitterId);
    if (emitter) {
      emitter.isActive = false;
    }
  }

  /**
   * Stop all emitters
   */
  stopAllEmitters() {
    this.emitters.forEach(e => e.isActive = false);
  }

  /**
   * Clear all particles
   */
  clearParticles() {
    this.particles = [];
    this.particlePool = [];
    this.stats.particlesDestroyed += this.stats.activeParticles;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      fps: Math.round(this.fps),
      emitterCount: this.emitters.length,
      forceCount: this.forces.length
    };
  }

  /**
   * Set quality level
   */
  setQualityLevel(level) {
    this.qualityLevel = level;
    this.qualitySettings = this._getQualitySettings(level);

    // Enforce new limits
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(this.maxParticles);
    }
  }

  /**
   * Destroy system and cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.particles = [];
    this.particlePool = [];
    this.emitters = [];
    this.forces = [];
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedParticleSystem;
}
