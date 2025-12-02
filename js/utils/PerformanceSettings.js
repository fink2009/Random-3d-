/**
 * PerformanceSettings.js - Comprehensive Performance Configuration
 * Provides quality presets optimized for different hardware capabilities
 * CRITICAL: Potato mode is optimized for old Chromebooks with integrated graphics
 */

import * as THREE from 'three';

export class PerformanceSettings {
    constructor() {
        // Define quality presets with aggressive optimization for low-end hardware
        this.presets = {
            potato: {
                // Rendering - absolute minimum for old Chromebooks
                pixelRatio: 1,                  // NEVER higher than 1
                renderScale: 0.75,              // Render at 75% resolution
                antialias: false,               // NO anti-aliasing
                shadows: false,                 // NO shadows
                postProcessing: false,          // NO post-processing
                powerPreference: 'low-power',   // Use low-power GPU mode
                
                // Geometry - drastically reduced
                terrainSegments: 16,            // Very low-poly terrain (16x16)
                treeDetail: 4,                  // 4-sided cone trees
                maxTrees: 15,                   // Only 15 trees
                maxEnemies: 3,                  // Only 3 enemies
                maxRocks: 10,                   // Only 10 rocks
                maxGrass: 50,                   // Minimal grass
                
                // Particles - disabled or minimal
                particlesEnabled: false,        // Disable particles entirely
                particleCount: 10,              // If enabled, only 10
                environmentParticles: 0,        // No environmental particles
                maxFireflies: 0,                // No fireflies
                
                // Lighting - minimal
                maxLights: 1,                   // Only ambient light
                useLambertMaterial: false,      // Use BasicMaterial (no lighting)
                lightingSimplified: true,       // Simplified lighting
                
                // Updates - staggered for performance
                enemyUpdateRate: 2,             // Update enemies every 2nd frame
                environmentUpdateRate: 5,       // Update environment every 5th frame
                particleUpdateRate: 3,          // Update particles every 3rd frame
                hudUpdateRate: 3,               // Update HUD every 3rd frame
                
                // Distance - very aggressive culling
                renderDistance: 40,             // Only render nearby objects
                lodDistance: 20,                // LOD switch distance
                cameraFar: 100,                 // Camera far plane
                fogNear: 30,                    // Fog starts close
                fogFar: 80,                     // Fog ends close
                
                // Physics
                physicsSteps: 1,                // Minimal physics iterations
                
                // Other
                shadowMapSize: 256,             // Not used when shadows disabled
                bloomStrength: 0,               // No bloom
            },
            
            low: {
                pixelRatio: 1,
                renderScale: 1.0,
                antialias: false,
                shadows: false,
                postProcessing: false,
                powerPreference: 'low-power',
                
                terrainSegments: 32,
                treeDetail: 6,
                maxTrees: 30,
                maxEnemies: 5,
                maxRocks: 20,
                maxGrass: 100,
                
                particlesEnabled: true,
                particleCount: 30,
                environmentParticles: 50,
                maxFireflies: 10,
                
                maxLights: 2,
                useLambertMaterial: true,       // Use Lambert (simple lighting)
                lightingSimplified: true,
                
                enemyUpdateRate: 2,
                environmentUpdateRate: 3,
                particleUpdateRate: 2,
                hudUpdateRate: 2,
                
                renderDistance: 60,
                lodDistance: 30,
                cameraFar: 150,
                fogNear: 40,
                fogFar: 120,
                
                physicsSteps: 1,
                
                shadowMapSize: 512,
                bloomStrength: 0.2,
            },
            
            medium: {
                pixelRatio: 1.5,
                renderScale: 1.0,
                antialias: true,
                shadows: true,
                postProcessing: true,
                powerPreference: 'default',
                
                terrainSegments: 64,
                treeDetail: 8,
                maxTrees: 80,
                maxEnemies: 10,
                maxRocks: 50,
                maxGrass: 250,
                
                particlesEnabled: true,
                particleCount: 100,
                environmentParticles: 250,
                maxFireflies: 50,
                
                maxLights: 3,
                useLambertMaterial: false,
                lightingSimplified: false,
                
                enemyUpdateRate: 1,
                environmentUpdateRate: 2,
                particleUpdateRate: 1,
                hudUpdateRate: 2,
                
                renderDistance: 100,
                lodDistance: 50,
                cameraFar: 300,
                fogNear: 80,
                fogFar: 250,
                
                physicsSteps: 2,
                
                shadowMapSize: 1024,
                bloomStrength: 0.3,
            },
            
            high: {
                pixelRatio: 2,
                renderScale: 1.0,
                antialias: true,
                shadows: true,
                postProcessing: true,
                powerPreference: 'high-performance',
                
                terrainSegments: 128,
                treeDetail: 8,
                maxTrees: 150,
                maxEnemies: 15,
                maxRocks: 100,
                maxGrass: 500,
                
                particlesEnabled: true,
                particleCount: 200,
                environmentParticles: 500,
                maxFireflies: 100,
                
                maxLights: 4,
                useLambertMaterial: false,
                lightingSimplified: false,
                
                enemyUpdateRate: 1,
                environmentUpdateRate: 1,
                particleUpdateRate: 1,
                hudUpdateRate: 1,
                
                renderDistance: 200,
                lodDistance: 100,
                cameraFar: 500,
                fogNear: 150,
                fogFar: 450,
                
                physicsSteps: 2,
                
                shadowMapSize: 2048,
                bloomStrength: 0.5,
            }
        };
        
        this.currentPreset = 'potato'; // Default to Potato mode for safety
        this.settings = { ...this.presets[this.currentPreset] };
    }
    
    /**
     * Auto-detect if device is low-end (Chromebook, old laptop, mobile, etc.)
     * Returns: true if low-end device detected
     */
    static detectLowEndDevice() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                console.log('🥔 Low-end device detected: No WebGL support');
                return true;
            }
            
            // Check GPU renderer
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
                console.log('GPU detected:', renderer);
                
                // Check for integrated/low-end GPUs
                const lowEndGPUs = [
                    'intel', 'mali', 'adreno', 'swiftshader', 
                    'videocore', 'powervr', 'sgx', 'geforce 6', 
                    'geforce 7', 'radeon hd 2', 'radeon hd 3'
                ];
                
                if (lowEndGPUs.some(gpu => renderer.includes(gpu))) {
                    console.log('🥔 Low-end device detected: Integrated/old GPU');
                    return true;
                }
            }
            
            // Check device memory (if available)
            if (navigator.deviceMemory) {
                console.log('Device memory:', navigator.deviceMemory, 'GB');
                if (navigator.deviceMemory < 4) {
                    console.log('🥔 Low-end device detected: Low memory (<4GB)');
                    return true;
                }
            }
            
            // Check hardware concurrency (CPU cores)
            if (navigator.hardwareConcurrency) {
                console.log('CPU cores:', navigator.hardwareConcurrency);
                if (navigator.hardwareConcurrency <= 2) {
                    console.log('🥔 Low-end device detected: Few CPU cores (≤2)');
                    return true;
                }
            }
            
            // Check for mobile device
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                console.log('🥔 Low-end device detected: Mobile device');
                return true;
            }
            
            // Check for Chromebook specifically
            const isChromebook = /CrOS/.test(navigator.userAgent);
            if (isChromebook) {
                console.log('🥔 Low-end device detected: Chromebook');
                return true;
            }
            
            console.log('✓ Standard/high-end device detected');
            return false;
            
        } catch (e) {
            console.warn('Error detecting device capability, defaulting to low-end:', e);
            return true; // Default to low-end if detection fails
        }
    }
    
    /**
     * Get recommended preset based on device capabilities
     */
    static getRecommendedPreset() {
        if (PerformanceSettings.detectLowEndDevice()) {
            return 'potato';
        }
        
        // If we have device memory, use it to determine preset
        if (navigator.deviceMemory) {
            if (navigator.deviceMemory >= 8) return 'high';
            if (navigator.deviceMemory >= 6) return 'medium';
            return 'low';
        }
        
        // Default to low for safety
        return 'low';
    }
    
    /**
     * Apply a quality preset
     */
    applyPreset(presetName) {
        if (!this.presets[presetName]) {
            console.warn(`Unknown preset: ${presetName}, defaulting to potato`);
            presetName = 'potato';
        }
        
        this.currentPreset = presetName;
        this.settings = { ...this.presets[presetName] };
        
        console.log(`🎮 Quality preset applied: ${presetName.toUpperCase()}`);
        if (presetName === 'potato') {
            console.log('🥔 Potato Mode Activated - Optimized for Chromebook');
        }
        
        return this.settings;
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Get current preset name
     */
    getCurrentPreset() {
        return this.currentPreset;
    }
    
    /**
     * Update a specific setting value
     */
    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            console.log(`Setting updated: ${key} = ${value}`);
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('gameQualityPreset', this.currentPreset);
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
            console.log('Settings saved to localStorage');
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadFromLocalStorage() {
        try {
            const savedPreset = localStorage.getItem('gameQualityPreset');
            if (savedPreset && this.presets[savedPreset]) {
                this.applyPreset(savedPreset);
                console.log('Settings loaded from localStorage');
                return true;
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return false;
    }
}
