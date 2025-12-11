/**
 * FastTravelSystem.js - Fast Travel Map System
 * Visual map showing discovered Sites of Grace for fast travel
 */

import * as THREE from 'three';

export class FastTravelSystem {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.canTravel = false; // Can only travel from a Site of Grace
        
        // Map canvas
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        
        // Map dimensions and scale
        this.mapWidth = 800;
        this.mapHeight = 600;
        this.worldSize = 500; // Matches World.js worldSize
        this.scale = this.mapWidth / this.worldSize;
        
        // Discovered Sites of Grace
        this.discoveredGraces = new Set();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // M key to open map
        document.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                if (!this.game.isPaused || this.isOpen) {
                    this.toggleMap();
                }
            }
        });
        
        // Close button
        document.getElementById('close-map-btn')?.addEventListener('click', () => {
            this.close();
        });
        
        // Canvas click for teleport
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => {
                this.handleMapClick(e);
            });
        }
    }
    
    toggleMap() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.game.isPaused = true;
        document.getElementById('fast-travel-menu').classList.remove('hidden');
        document.exitPointerLock();
        
        // Check if player is at a Site of Grace
        this.canTravel = this.isPlayerAtGrace();
        
        // Draw the map
        this.drawMap();
    }
    
    close() {
        this.isOpen = false;
        this.game.isPaused = false;
        document.getElementById('fast-travel-menu').classList.add('hidden');
    }
    
    isPlayerAtGrace() {
        const player = this.game.player;
        if (!player || !this.game.checkpointSystem) return false;
        
        // Check if player is near any checkpoint
        for (const checkpoint of this.game.checkpointSystem.checkpoints) {
            const dist = Math.sqrt(
                Math.pow(player.position.x - checkpoint.position.x, 2) +
                Math.pow(player.position.z - checkpoint.position.z, 2)
            );
            
            if (dist < 5) {
                return true;
            }
        }
        
        return false;
    }
    
    discoverGrace(graceName) {
        this.discoveredGraces.add(graceName);
    }
    
    drawMap() {
        if (!this.ctx) return;
        
        const ctx = this.ctx;
        const player = this.game.player;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.mapWidth, this.mapHeight);
        
        // Background - terrain style
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.mapWidth, this.mapHeight);
        
        // Draw terrain texture
        ctx.fillStyle = 'rgba(60, 80, 60, 0.3)';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.mapWidth;
            const y = Math.random() * this.mapHeight;
            const size = Math.random() * 50 + 10;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw grid
        ctx.strokeStyle = 'rgba(100, 80, 60, 0.2)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.mapWidth; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.mapHeight);
            ctx.stroke();
        }
        for (let y = 0; y < this.mapHeight; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.mapWidth, y);
            ctx.stroke();
        }
        
        // Draw Sites of Grace
        if (this.game.checkpointSystem) {
            this.game.checkpointSystem.checkpoints.forEach(checkpoint => {
                const mapX = this.worldToMapX(checkpoint.position.x);
                const mapY = this.worldToMapY(checkpoint.position.z);
                
                // Check if discovered
                const isDiscovered = this.discoveredGraces.has(checkpoint.name);
                
                if (isDiscovered) {
                    // Draw grace marker (gold)
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(mapX, mapY, 8, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Glow effect
                    const gradient = ctx.createRadialGradient(mapX, mapY, 0, mapX, mapY, 20);
                    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(mapX - 20, mapY - 20, 40, 40);
                    
                    // Draw name
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 12px "Times New Roman"';
                    ctx.textAlign = 'center';
                    ctx.fillText(checkpoint.name, mapX, mapY + 25);
                } else {
                    // Undiscovered - show as gray
                    ctx.fillStyle = '#555';
                    ctx.beginPath();
                    ctx.arc(mapX, mapY, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        
        // Draw player position
        if (player) {
            const playerMapX = this.worldToMapX(player.position.x);
            const playerMapY = this.worldToMapY(player.position.z);
            
            // Player marker (green triangle)
            ctx.save();
            ctx.translate(playerMapX, playerMapY);
            ctx.rotate(player.rotation);
            
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-7, 7);
            ctx.lineTo(7, 7);
            ctx.closePath();
            ctx.fill();
            
            // Outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Draw border
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.mapWidth, this.mapHeight);
    }
    
    worldToMapX(worldX) {
        return (worldX + this.worldSize / 2) * this.scale;
    }
    
    worldToMapY(worldZ) {
        return (worldZ + this.worldSize / 2) * this.scale;
    }
    
    mapToWorldX(mapX) {
        return (mapX / this.scale) - this.worldSize / 2;
    }
    
    mapToWorldZ(mapY) {
        return (mapY / this.scale) - this.worldSize / 2;
    }
    
    handleMapClick(event) {
        if (!this.canTravel) {
            if (this.game.hud) {
                this.game.hud.showMessage('You can only fast travel from a Site of Grace!', 2500);
            }
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Scale click coordinates to canvas size
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mapX = clickX * scaleX;
        const mapY = clickY * scaleY;
        
        // Check if clicked on a Site of Grace
        if (this.game.checkpointSystem) {
            for (const checkpoint of this.game.checkpointSystem.checkpoints) {
                const graceMapX = this.worldToMapX(checkpoint.position.x);
                const graceMapY = this.worldToMapY(checkpoint.position.z);
                
                const dist = Math.sqrt(
                    Math.pow(mapX - graceMapX, 2) +
                    Math.pow(mapY - graceMapY, 2)
                );
                
                if (dist < 15 && this.discoveredGraces.has(checkpoint.name)) {
                    // Teleport to this grace
                    this.travelToGrace(checkpoint);
                    return;
                }
            }
        }
    }
    
    travelToGrace(checkpoint) {
        const player = this.game.player;
        if (!player) return;
        
        // Fade effect
        this.game.hud.showMessage(`Traveling to ${checkpoint.name}...`, 2000);
        
        // Teleport after a short delay
        setTimeout(() => {
            const groundY = this.game.world.getHeightAt(checkpoint.position.x, checkpoint.position.z);
            player.position.set(checkpoint.position.x, groundY + 1, checkpoint.position.z);
            player.velocity.set(0, 0, 0);
            
            // Show arrival message
            setTimeout(() => {
                this.game.hud.showMessage(`Arrived at ${checkpoint.name}`, 2000);
            }, 500);
        }, 1000);
        
        // Close map
        this.close();
    }
}