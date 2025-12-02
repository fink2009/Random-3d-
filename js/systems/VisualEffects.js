/**
 * VisualEffects.js - Enhanced Visual System
 * Day/night cycle, weather, atmosphere, and post-processing
 * PERFORMANCE OPTIMIZED: Reduced particle counts and staggered updates
 */

import * as THREE from 'three';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class VisualEffects {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Get quality settings
        const settings = game.settings || {};
        this.maxFireflies = settings.maxFireflies || 50;
        this.postProcessingEnabled = settings.postProcessing !== false;
        
        // Day/night cycle - 10 minute real-time cycle
        this.dayDuration = 600; // seconds
        this.dayTime = 0.35; // Start mid-morning
        
        // Sky elements
        this.sun = null;
        this.moon = null;
        this.stars = null;
        this.clouds = [];
        
        // Weather
        this.currentWeather = 'clear';
        this.weatherParticles = null;
        this.weatherIntensity = 0;
        
        // Atmosphere
        this.fireflies = [];
        this.motes = [];
        this.fogDensity = 0.008;
        
        // Update throttling for performance
        this.updateCounter = 0;
        
        // Post-processing already handled by Game.js, we extend it
        this.setupVisuals();
    }
    
    setupVisuals() {
        this.createSun();
        this.createMoon();
        this.createStars();
        this.createClouds();
        this.createFireflies();
        this.createAmbientMotes();
        this.enhancePostProcessing();
    }
    
    /**
     * Apply quality settings dynamically
     */
    applyQualitySettings(settings) {
        this.maxFireflies = settings.maxFireflies || 50;
        this.postProcessingEnabled = settings.postProcessing !== false;
        
        // Update firefly count if needed
        if (this.fireflies.length > this.maxFireflies) {
            // Remove excess fireflies
            const excess = this.fireflies.splice(this.maxFireflies);
            excess.forEach(firefly => {
                this.scene.remove(firefly.mesh);
            });
        }
    }
    
    createSun() {
        // Sun visual
        const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffdd,
            transparent: true,
            opacity: 0.9
        });
        
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.set(200, 100, 0);
        
        // Sun glow
        const glowGeometry = new THREE.SphereGeometry(25, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff88,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.sun.add(sunGlow);
        
        this.scene.add(this.sun);
    }
    
    createMoon() {
        // Moon visual
        const moonGeometry = new THREE.SphereGeometry(10, 32, 32);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xccccff,
            transparent: true,
            opacity: 0
        });
        
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.set(-200, 100, 0);
        
        // Moon glow
        const glowGeometry = new THREE.SphereGeometry(15, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x8888ff,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        this.moonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.moon.add(this.moonGlow);
        
        this.scene.add(this.moon);
    }
    
    createStars() {
        // Reduced star count for performance
        const starCount = 500; // Reduced from 1000
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // Distribute stars on a dome
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5; // Only upper hemisphere
            const radius = 350;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) + 50;
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            // Slight color variation
            const colorVariation = 0.8 + Math.random() * 0.2;
            colors[i * 3] = colorVariation;
            colors[i * 3 + 1] = colorVariation;
            colors[i * 3 + 2] = colorVariation + Math.random() * 0.1;
            
            sizes[i] = 0.5 + Math.random() * 1.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }
    
    createClouds() {
        // Reduced cloud count for performance
        const cloudCount = 10; // Reduced from 15
        const cloudMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group();
            
            // Each cloud is multiple spheres merged visually
            const puffCount = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < puffCount; j++) {
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(10 + Math.random() * 15, 8, 8),
                    cloudMaterial.clone()
                );
                puff.position.set(
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 20
                );
                puff.scale.y = 0.4 + Math.random() * 0.3;
                cloudGroup.add(puff);
            }
            
            // Position in sky
            cloudGroup.position.set(
                (Math.random() - 0.5) * 400,
                80 + Math.random() * 40,
                (Math.random() - 0.5) * 400
            );
            
            this.clouds.push({
                mesh: cloudGroup,
                speed: 2 + Math.random() * 3,
                startX: cloudGroup.position.x
            });
            
            this.scene.add(cloudGroup);
        }
    }
    
    createFireflies() {
        // Only visible at night - use quality settings for count
        const fireflyCount = this.maxFireflies;
        
        // Use shared geometry and material for all fireflies
        const sharedGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const sharedMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff44,
            transparent: true,
            opacity: 0
        });
        
        for (let i = 0; i < fireflyCount; i++) {
            const firefly = new THREE.Mesh(sharedGeometry, sharedMaterial.clone());
            
            // Scatter around world
            firefly.position.set(
                (Math.random() - 0.5) * 200,
                1 + Math.random() * 5,
                (Math.random() - 0.5) * 200
            );
            
            // Only add point lights to every 5th firefly for performance
            let light = null;
            if (i % 5 === 0) {
                light = new THREE.PointLight(0xffff44, 0, 3);
                firefly.add(light);
            }
            
            this.fireflies.push({
                mesh: firefly,
                light: light,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                baseY: firefly.position.y
            });
            
            this.scene.add(firefly);
        }
    }
    
    createAmbientMotes() {
        // Dust/pollen visible in sunlight - reduced count
        const moteCount = 100; // Reduced from 200
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(moteCount * 3);
        
        for (let i = 0; i < moteCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.2,
            color: 0xffffcc,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });
        
        this.moteSystem = new THREE.Points(geometry, material);
        this.scene.add(this.moteSystem);
    }
    
    enhancePostProcessing() {
        // Skip if post-processing is disabled or composer doesn't exist
        if (!this.postProcessingEnabled || !this.game.composer) {
            return;
        }
        
        // Add SMAA anti-aliasing (faster than SMAA at high quality)
        try {
            const smaaPass = new SMAAPass(
                window.innerWidth * this.game.renderer.getPixelRatio(),
                window.innerHeight * this.game.renderer.getPixelRatio()
            );
            this.game.composer.addPass(smaaPass);
        } catch (e) {
            console.log('SMAA not available, using default AA');
        }
        
        // Add vignette effect (light, low performance impact)
        this.addVignettePass();
    }
    
    addVignettePass() {
        // Skip if post-processing is disabled or composer doesn't exist
        if (!this.postProcessingEnabled || !this.game.composer) {
            return;
        }
        
        const vignetteShader = {
            uniforms: {
                tDiffuse: { value: null },
                offset: { value: 0.95 },
                darkness: { value: 0.8 } // Reduced darkness for subtlety
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float offset;
                uniform float darkness;
                varying vec2 vUv;
                
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    vec2 center = vUv - vec2(0.5);
                    float dist = length(center);
                    float vignette = smoothstep(offset, offset - 0.5, dist);
                    color.rgb *= mix(1.0 - darkness, 1.0, vignette);
                    gl_FragColor = color;
                }
            `
        };
        
        try {
            const vignettePass = new ShaderPass(vignetteShader);
            this.game.composer.addPass(vignettePass);
            this.vignettePass = vignettePass;
        } catch (e) {
            console.log('Vignette effect not applied');
        }
    }
    
    update(deltaTime) {
        // Increment update counter for staggered updates
        this.updateCounter++;
        
        // Update day/night cycle
        this.updateDayNightCycle(deltaTime);
        
        // Update clouds every 3rd frame
        if (this.updateCounter % 3 === 0) {
            this.updateClouds(deltaTime * 3);
        }
        
        // Update fireflies every 2nd frame
        if (this.updateCounter % 2 === 0) {
            this.updateFireflies(deltaTime * 2);
        }
        
        // Update motes every 2nd frame
        if (this.updateCounter % 2 === 1) {
            this.updateMotes(deltaTime * 2);
        }
        
        // Update weather
        this.updateWeather(deltaTime);
    }
    
    updateDayNightCycle(deltaTime) {
        // Progress time
        this.dayTime += deltaTime / this.dayDuration;
        if (this.dayTime >= 1) this.dayTime -= 1;
        
        // Calculate sun/moon positions
        const sunAngle = this.dayTime * Math.PI * 2 - Math.PI / 2;
        const moonAngle = sunAngle + Math.PI;
        
        // Sun position
        const sunRadius = 300;
        this.sun.position.x = Math.cos(sunAngle) * sunRadius;
        this.sun.position.y = Math.sin(sunAngle) * sunRadius;
        
        // Moon position (opposite)
        this.moon.position.x = Math.cos(moonAngle) * sunRadius * 0.8;
        this.moon.position.y = Math.sin(moonAngle) * sunRadius * 0.8;
        
        // Calculate brightness based on sun height
        const sunHeight = Math.sin(sunAngle);
        const isDaytime = sunHeight > -0.1;
        const isNighttime = sunHeight < 0.1;
        
        // Update lighting
        this.updateLighting(sunHeight);
        
        // Sun visibility
        this.sun.material.opacity = Math.max(0, sunHeight);
        this.sun.children[0].material.opacity = Math.max(0, sunHeight * 0.3);
        
        // Moon visibility (night only)
        const moonVisibility = Math.max(0, -sunHeight);
        this.moon.material.opacity = moonVisibility * 0.8;
        this.moonGlow.material.opacity = moonVisibility * 0.2;
        
        // Stars visibility (night only)
        const starOpacity = Math.max(0, -sunHeight * 0.8);
        this.stars.material.opacity = starOpacity;
        
        // Star twinkling
        if (starOpacity > 0) {
            const sizes = this.stars.geometry.attributes.size.array;
            for (let i = 0; i < sizes.length; i++) {
                sizes[i] = (0.5 + Math.random() * 1.5) * (Math.sin(Date.now() * 0.001 + i) * 0.3 + 0.7);
            }
            this.stars.geometry.attributes.size.needsUpdate = true;
        }
        
        // Update sky color
        this.updateSkyColor(sunHeight);
        
        // Update fog
        this.updateFog(sunHeight);
    }
    
    updateLighting(sunHeight) {
        const directionalLight = this.game.directionalLight;
        const ambientLight = this.game.ambientLight;
        const hemisphereLight = this.game.hemisphereLight;
        
        if (!directionalLight || !ambientLight) return;
        
        // Directional light follows sun
        directionalLight.position.copy(this.sun.position);
        
        // Time-based lighting
        if (sunHeight > 0.3) {
            // Midday - bright white/yellow
            directionalLight.color.setHSL(0.12, 0.3, 0.9);
            directionalLight.intensity = 1.2;
            ambientLight.intensity = 0.5;
            ambientLight.color.setHSL(0.6, 0.2, 0.5);
        } else if (sunHeight > 0.05) {
            // Sunrise/sunset
            const t = (sunHeight - 0.05) / 0.25;
            directionalLight.color.setHSL(0.06 + t * 0.06, 0.8 - t * 0.5, 0.5 + t * 0.4);
            directionalLight.intensity = 0.6 + t * 0.6;
            ambientLight.intensity = 0.2 + t * 0.3;
            ambientLight.color.setHSL(0.06, 0.5, 0.3);
        } else if (sunHeight > -0.1) {
            // Twilight
            const t = (sunHeight + 0.1) / 0.15;
            directionalLight.color.setHSL(0.65, 0.5, 0.3 + t * 0.2);
            directionalLight.intensity = 0.2 + t * 0.4;
            ambientLight.intensity = 0.15 + t * 0.05;
            ambientLight.color.setHSL(0.65, 0.4, 0.2);
        } else {
            // Night - moonlight
            directionalLight.position.copy(this.moon.position);
            directionalLight.color.setHSL(0.65, 0.3, 0.4);
            directionalLight.intensity = 0.15;
            ambientLight.intensity = 0.1;
            ambientLight.color.setHSL(0.65, 0.3, 0.15);
        }
        
        // Hemisphere light
        if (hemisphereLight) {
            if (sunHeight > 0) {
                hemisphereLight.color.setHSL(0.6, 0.5, 0.5 + sunHeight * 0.3);
                hemisphereLight.groundColor.setHSL(0.1, 0.3, 0.2);
                hemisphereLight.intensity = 0.3 + sunHeight * 0.2;
            } else {
                hemisphereLight.color.setHSL(0.65, 0.3, 0.2);
                hemisphereLight.groundColor.setHSL(0.65, 0.2, 0.1);
                hemisphereLight.intensity = 0.15;
            }
        }
    }
    
    updateSkyColor(sunHeight) {
        // Update sky shader if available
        if (this.game.world && this.game.world.sky) {
            const sky = this.game.world.sky;
            
            if (sunHeight > 0.3) {
                // Day
                sky.material.uniforms.topColor.value.setHSL(0.58, 0.6, 0.6);
                sky.material.uniforms.bottomColor.value.setHSL(0.58, 0.4, 0.4);
            } else if (sunHeight > 0) {
                // Sunrise/sunset
                sky.material.uniforms.topColor.value.setHSL(0.58, 0.6, 0.4);
                sky.material.uniforms.bottomColor.value.setHSL(0.05, 0.7, 0.4);
            } else {
                // Night
                sky.material.uniforms.topColor.value.setHSL(0.65, 0.5, 0.1);
                sky.material.uniforms.bottomColor.value.setHSL(0.65, 0.3, 0.05);
            }
        }
        
        // Update scene background
        if (sunHeight > 0.3) {
            this.scene.background.setHSL(0.58, 0.5, 0.5);
        } else if (sunHeight > 0) {
            this.scene.background.setHSL(0.08 + sunHeight * 0.5, 0.5, 0.3 + sunHeight * 0.2);
        } else {
            this.scene.background.setHSL(0.65, 0.3, 0.08);
        }
    }
    
    updateFog(sunHeight) {
        if (!this.scene.fog) return;
        
        if (sunHeight > 0.3) {
            // Clear day
            this.scene.fog.color.setHSL(0.58, 0.3, 0.5);
            this.scene.fog.density = 0.005;
        } else if (sunHeight > 0) {
            // Golden hour
            this.scene.fog.color.setHSL(0.06, 0.4, 0.35);
            this.scene.fog.density = 0.008;
        } else {
            // Night
            this.scene.fog.color.setHSL(0.65, 0.3, 0.1);
            this.scene.fog.density = 0.012;
        }
    }
    
    updateClouds(deltaTime) {
        this.clouds.forEach(cloud => {
            cloud.mesh.position.x += cloud.speed * deltaTime;
            
            // Wrap around
            if (cloud.mesh.position.x > 250) {
                cloud.mesh.position.x = -250;
            }
        });
    }
    
    updateFireflies(deltaTime) {
        const sunAngle = this.dayTime * Math.PI * 2 - Math.PI / 2;
        const isNight = Math.sin(sunAngle) < -0.1;
        
        this.fireflies.forEach(firefly => {
            // Only active at night
            const targetOpacity = isNight ? 0.8 : 0;
            firefly.mesh.material.opacity = THREE.MathUtils.lerp(
                firefly.mesh.material.opacity,
                targetOpacity,
                deltaTime * 2
            );
            
            if (!isNight) return;
            
            // Blink
            firefly.phase += deltaTime * firefly.speed;
            const blink = (Math.sin(firefly.phase * 3) + 1) * 0.5;
            firefly.mesh.material.opacity = blink * 0.8;
            
            // Only update light if it exists (performance optimization)
            if (firefly.light) {
                firefly.light.intensity = blink * 0.3;
            }
            
            // Gentle movement
            firefly.mesh.position.y = firefly.baseY + Math.sin(firefly.phase) * 0.5;
            firefly.mesh.position.x += Math.sin(firefly.phase * 0.5) * deltaTime;
            firefly.mesh.position.z += Math.cos(firefly.phase * 0.3) * deltaTime;
        });
    }
    
    updateMotes(deltaTime) {
        if (!this.moteSystem) return;
        
        const sunAngle = this.dayTime * Math.PI * 2 - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle);
        
        // Only visible during day
        const targetOpacity = sunHeight > 0.1 ? 0.3 : 0;
        this.moteSystem.material.opacity = THREE.MathUtils.lerp(
            this.moteSystem.material.opacity,
            targetOpacity,
            deltaTime * 2
        );
        
        // Update only every other position for performance (skip every other particle)
        const positions = this.moteSystem.geometry.attributes.position.array;
        const numParticles = positions.length / 3;
        const updateOffset = this.updateCounter % 2;
        for (let i = updateOffset; i < numParticles; i += 2) {
            const idx = i * 3;
            positions[idx] += (Math.random() - 0.5) * deltaTime;
            positions[idx + 1] += Math.random() * deltaTime * 0.4;
            positions[idx + 2] += (Math.random() - 0.5) * deltaTime;
            
            // Reset if too high
            if (positions[idx + 1] > 35) {
                positions[idx + 1] = 0;
            }
        }
        this.moteSystem.geometry.attributes.position.needsUpdate = true;
        
        // Follow player
        const player = this.game.player;
        if (player) {
            this.moteSystem.position.x = player.position.x;
            this.moteSystem.position.z = player.position.z;
        }
    }
    
    updateWeather(deltaTime) {
        // Weather transitions would go here
        // For now, weather is controlled externally via setWeather()
    }
    
    setWeather(type, intensity = 1) {
        this.currentWeather = type;
        this.weatherIntensity = intensity;
        
        switch (type) {
            case 'clear':
                this.clearWeatherEffects();
                break;
            case 'rain':
                this.startRain(intensity);
                break;
            case 'snow':
                this.startSnow(intensity);
                break;
        }
    }
    
    clearWeatherEffects() {
        if (this.weatherParticles) {
            this.scene.remove(this.weatherParticles);
            this.weatherParticles.geometry.dispose();
            this.weatherParticles.material.dispose();
            this.weatherParticles = null;
        }
    }
    
    startRain(intensity) {
        this.clearWeatherEffects();
        
        const rainCount = Math.floor(5000 * intensity);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(rainCount * 3);
        const velocities = [];
        
        for (let i = 0; i < rainCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            
            velocities.push({
                y: -20 - Math.random() * 10
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xaaaacc,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });
        
        this.weatherParticles = new THREE.Points(geometry, material);
        this.weatherParticles.velocities = velocities;
        this.scene.add(this.weatherParticles);
        
        // Darken environment
        if (this.game.ambientLight) {
            this.game.ambientLight.intensity *= 0.7;
        }
    }
    
    startSnow(intensity) {
        this.clearWeatherEffects();
        
        const snowCount = Math.floor(3000 * intensity);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(snowCount * 3);
        const velocities = [];
        
        for (let i = 0; i < snowCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            
            velocities.push({
                x: (Math.random() - 0.5) * 2,
                y: -2 - Math.random() * 2,
                z: (Math.random() - 0.5) * 2
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.3,
            transparent: true,
            opacity: 0.8
        });
        
        this.weatherParticles = new THREE.Points(geometry, material);
        this.weatherParticles.velocities = velocities;
        this.scene.add(this.weatherParticles);
    }
    
    // Get current time of day info
    getTimeOfDay() {
        const sunAngle = this.dayTime * Math.PI * 2 - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle);
        
        if (sunHeight > 0.3) return 'day';
        if (sunHeight > 0) return 'golden_hour';
        if (sunHeight > -0.2) return 'twilight';
        return 'night';
    }
    
    // Get day time as string (0:00 - 24:00)
    getTimeString() {
        const hours = Math.floor(this.dayTime * 24);
        const minutes = Math.floor((this.dayTime * 24 - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // Weapon Art Visual Effects
    createShockwave(position, radius) {
        const geometry = new THREE.RingGeometry(0.1, radius, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.position.copy(position);
        shockwave.position.y = 0.1;
        shockwave.rotation.x = -Math.PI / 2;
        this.scene.add(shockwave);
        
        // Animate expansion and fade
        let scale = 1;
        const animate = () => {
            scale += 0.1;
            shockwave.scale.set(scale, scale, 1);
            material.opacity -= 0.05;
            
            if (material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(shockwave);
                geometry.dispose();
                material.dispose();
            }
        };
        animate();
    }
    
    createSlashWave(position, rotation, range) {
        const geometry = new THREE.PlaneGeometry(range, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const wave = new THREE.Mesh(geometry, material);
        wave.position.copy(position);
        wave.position.y = 1;
        wave.rotation.y = rotation;
        this.scene.add(wave);
        
        // Animate forward movement and fade
        let distance = 0;
        const animate = () => {
            distance += 0.3;
            wave.position.x += Math.sin(rotation) * 0.3;
            wave.position.z += Math.cos(rotation) * 0.3;
            material.opacity -= 0.04;
            
            if (material.opacity > 0 && distance < range) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(wave);
                geometry.dispose();
                material.dispose();
            }
        };
        animate();
    }
    
    createMagicNova(position, radius) {
        // Create expanding magic ring
        const geometry = new THREE.TorusGeometry(radius / 2, 0.2, 16, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x8844ff,
            transparent: true,
            opacity: 0.9
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.copy(position);
        ring.position.y = 1;
        this.scene.add(ring);
        
        // Animate expansion and rotation
        let scale = 0.5;
        const animate = () => {
            scale += 0.15;
            ring.scale.set(scale, scale, scale);
            ring.rotation.x += 0.1;
            ring.rotation.y += 0.05;
            material.opacity -= 0.06;
            
            if (material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(ring);
                geometry.dispose();
                material.dispose();
            }
        };
        animate();
    }
}
