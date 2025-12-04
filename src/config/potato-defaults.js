/**
 * Potato Mode Defaults
 * Automatically applies low-end device optimizations
 */

class PotatoDefaults {
  constructor() {
    this.isLowEndDevice = false;
    this.deviceInfo = {};
  }
  
  /**
   * Detect if device is low-end
   */
  detectLowEndDevice() {
    // Check localStorage override
    if (localStorage.getItem('forcePotato') === 'true') {
      console.log('[PotatoDefaults] Potato mode forced via localStorage');
      this.isLowEndDevice = true;
      return true;
    }
    
    // Detect device characteristics
    const gpu = this.detectGPU();
    const memory = this.detectMemory();
    const isMobile = this.detectMobile();
    const isChromebook = this.detectChromebook();
    
    this.deviceInfo = { gpu, memory, isMobile, isChromebook };
    
    // Determine if low-end
    this.isLowEndDevice = (
      gpu.isIntegrated ||
      memory < 4 ||
      isChromebook ||
      isMobile
    );
    
    if (this.isLowEndDevice) {
      console.log('[PotatoDefaults] Low-end device detected:', this.deviceInfo);
    }
    
    return this.isLowEndDevice;
  }
  
  /**
   * Detect GPU type
   */
  detectGPU() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { isIntegrated: true, renderer: 'unknown' };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
    
    // Check for integrated GPUs
    const integratedPatterns = [
      /intel.*hd/i,
      /intel.*uhd/i,
      /intel.*iris/i,
      /mali/i,
      /adreno/i,
      /powervr/i,
      /videocore/i,
    ];
    
    const isIntegrated = integratedPatterns.some(pattern => pattern.test(renderer));
    
    return { isIntegrated, renderer };
  }
  
  /**
   * Detect device memory
   */
  detectMemory() {
    // Navigator.deviceMemory is in GB
    const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
    return memory;
  }
  
  /**
   * Detect if mobile device
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * Detect if Chromebook
   */
  detectChromebook() {
    return /CrOS/.test(navigator.userAgent);
  }
  
  /**
   * Apply potato defaults to game settings
   * This should be called before the game initializes
   */
  applyDefaults(game) {
    if (!this.isLowEndDevice) {
      console.log('[PotatoDefaults] Not a low-end device, skipping potato defaults');
      return;
    }
    
    console.log('[PotatoDefaults] Applying potato mode defaults...');
    
    // Apply renderer settings if available
    if (game.renderer) {
      game.renderer.setPixelRatio(1);
      game.renderer.shadowMap.enabled = false;
      console.log('[PotatoDefaults] Set pixel ratio to 1, disabled shadows');
    }
    
    // Apply game settings if available
    if (game.settings) {
      game.settings.quality = 'potato';
      game.settings.shadows = false;
      game.settings.postProcessing = false;
      game.settings.particles = false;
      game.settings.renderScale = 0.75;
      game.settings.maxEnemies = 3;
      game.settings.maxTrees = 15;
      game.settings.maxRocks = 10;
      game.settings.terrainSegments = 16;
      game.settings.drawDistance = 500;
      
      console.log('[PotatoDefaults] Applied potato settings:', game.settings);
    }
    
    // Store in localStorage for future sessions
    localStorage.setItem('detectedPotato', 'true');
    localStorage.setItem('autoQuality', 'potato');
  }
  
  /**
   * Get recommended settings for current device
   */
  getRecommendedSettings() {
    if (!this.isLowEndDevice) {
      return {
        quality: 'medium',
        renderScale: 1.0,
        shadows: true,
        postProcessing: true,
        particles: true,
        maxEnemies: 10,
        maxTrees: 50,
        maxRocks: 30,
        terrainSegments: 32,
        drawDistance: 1000
      };
    }
    
    return {
      quality: 'potato',
      renderScale: 0.75,
      shadows: false,
      postProcessing: false,
      particles: false,
      maxEnemies: 3,
      maxTrees: 15,
      maxRocks: 10,
      terrainSegments: 16,
      drawDistance: 500,
      materialType: 'basic' // Use MeshBasicMaterial instead of Lambert/Phong
    };
  }
  
  /**
   * Check if potato mode is currently active
   */
  isPotatoMode() {
    return this.isLowEndDevice || localStorage.getItem('forcePotato') === 'true';
  }
}

export { PotatoDefaults };
