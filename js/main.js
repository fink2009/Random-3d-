/**
 * Soulsborne 3D Game - Main Entry Point
 * A seamless open-world 3D action RPG inspired by Elden Ring
 */

import * as THREE from 'three';
import { Game } from './game/Game.js';
import { ErrorMonitor } from '../src/runtime/error-monitor.js';
import { CodeChecker } from '../src/runtime/code-checker.js';
import { PotatoDefaults } from '../src/config/potato-defaults.js';

// Initialize runtime monitoring (if enabled)
let errorMonitor = null;
let codeChecker = null;

// Check if runtime checks are enabled
const runtimeChecksEnabled = 
    localStorage.getItem('enableRuntimeChecks') === 'true' || 
    !localStorage.getItem('enableRuntimeChecks'); // Default to enabled

if (runtimeChecksEnabled) {
    console.log('[Runtime] Initializing runtime monitors...');
    
    // Initialize error monitor
    errorMonitor = new ErrorMonitor({
        showOverlay: true,
        remoteEndpoint: null // Set to your logging endpoint if available
    });
    errorMonitor.init();
    
    // Initialize code checker with error monitor
    codeChecker = new CodeChecker({
        errorMonitor: errorMonitor,
        scanInterval: 30000, // 30 seconds
        autoScan: true
    });
    codeChecker.init();
    
    // Expose to window for debugging
    window.errorMonitor = errorMonitor;
    window.codeChecker = codeChecker;
}

// Initialize potato mode detector
const potatoDefaults = new PotatoDefaults();
potatoDefaults.detectLowEndDevice();

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game();
    
    // Apply potato defaults if needed
    if (potatoDefaults.isPotatoMode()) {
        console.log('[Runtime] Applying potato mode defaults...');
        // Note: This will be applied in Game.init() after renderer is created
        game._potatoDefaults = potatoDefaults;
    }
    
    game.init();
    
    // Expose game to window for debugging
    window.game = game;
    
    console.log('Soulsborne 3D initialized');
    
    // Log device info
    if (potatoDefaults.isPotatoMode()) {
        console.log('[Runtime] Potato mode active - optimizations enabled');
        console.log('[Runtime] Device info:', potatoDefaults.deviceInfo);
    }
});
