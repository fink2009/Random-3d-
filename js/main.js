/**
 * Soulsborne 3D Game - Main Entry Point
 * A seamless open-world 3D action RPG inspired by Elden Ring
 */

import * as THREE from 'three';
import { Game } from './game/Game.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Create and start the game
    const game = new Game();
    game.init();
    
    // Expose game to window for debugging
    window.game = game;
    
    console.log('Soulsborne 3D initialized');
});
