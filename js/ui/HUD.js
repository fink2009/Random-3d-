/**
 * HUD.js - Heads Up Display
 * Soulsborne-style UI with health, stamina, souls counter
 */

export class HUD {
    constructor(game) {
        this.game = game;
        
        // Cache DOM elements
        this.healthFill = document.getElementById('health-fill');
        this.healthText = document.getElementById('health-text');
        this.staminaFill = document.getElementById('stamina-fill');
        this.manaFill = document.getElementById('mana-fill');
        this.soulsAmount = document.getElementById('souls-amount');
        
        // Minimap
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.minimapRadius = 75; // Half of 150px
        this.minimapRange = 50; // Units around player to show
        
        // Damage numbers
        this.damageNumbers = [];
    }
    
    update() {
        const player = this.game.player;
        if (!player) return;
        
        // Update health bar
        if (this.healthFill) {
            const healthPercent = player.getHealthPercent() * 100;
            this.healthFill.style.width = `${healthPercent}%`;
            
            // Change health bar color when low
            if (healthPercent < 25) {
                this.healthFill.style.background = 'linear-gradient(180deg, #ff4444 0%, #aa0000 50%, #660000 100%)';
            } else {
                this.healthFill.style.background = 'linear-gradient(180deg, #b22222 0%, #8b0000 50%, #650000 100%)';
            }
        }
        
        if (this.healthText) {
            this.healthText.textContent = `${Math.ceil(player.health)}/${player.maxHealth}`;
        }
        
        // Update stamina bar
        if (this.staminaFill) {
            const staminaPercent = player.getStaminaPercent() * 100;
            this.staminaFill.style.width = `${staminaPercent}%`;
            
            // Flash stamina bar red when empty and gray out when exhausted
            if (staminaPercent < 5) {
                // Exhausted - gray out the bar and flash red
                this.staminaFill.style.background = 'linear-gradient(180deg, #666 0%, #444 50%, #333 100%)';
                this.staminaFill.style.opacity = Math.sin(Date.now() * 0.015) * 0.4 + 0.6;
                
                // Add exhausted class to the bar container for additional styling
                this.staminaFill.parentElement.classList.add('exhausted');
            } else if (staminaPercent < 20) {
                // Low stamina - flash with reduced opacity
                this.staminaFill.style.background = 'linear-gradient(180deg, #cc8800 0%, #996600 50%, #664400 100%)';
                this.staminaFill.style.opacity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                this.staminaFill.parentElement.classList.remove('exhausted');
            } else {
                // Normal stamina
                this.staminaFill.style.background = 'linear-gradient(180deg, #228b22 0%, #006400 50%, #004d00 100%)';
                this.staminaFill.style.opacity = 1;
                this.staminaFill.parentElement.classList.remove('exhausted');
            }
        }
        
        // Update mana bar
        if (this.manaFill) {
            const manaPercent = player.getManaPercent() * 100;
            this.manaFill.style.width = `${manaPercent}%`;
        }
        
        // Update souls counter
        if (this.soulsAmount && this.game.progressionSystem) {
            const souls = this.game.progressionSystem.souls;
            this.soulsAmount.textContent = souls.toLocaleString();
        }
        
        // Update minimap
        this.updateMinimap();
        
        // Update debug info
        this.updateDebugInfo();
        
        // Update time indicator
        this.updateTimeIndicator();
        
        // Clean up damage numbers
        this.cleanupDamageNumbers();
    }
    
    updateDebugInfo() {
        const player = this.game.player;
        const debugInfo = document.getElementById('debug-info');
        
        if (!debugInfo.classList.contains('hidden')) {
            document.getElementById('fps').textContent = `FPS: ${this.game.fps}`;
            document.getElementById('position').textContent = 
                `Pos: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
            document.getElementById('state').textContent = `State: ${player.state}`;
        }
    }
    
    updateTimeIndicator() {
        const timeIndicator = document.getElementById('time-indicator');
        if (timeIndicator && this.game.visualEffects) {
            const timeString = this.game.visualEffects.getTimeString();
            const timeOfDay = this.game.visualEffects.getTimeOfDay();
            const icons = {
                'day': '☀️',
                'golden_hour': '🌅',
                'twilight': '🌆',
                'night': '🌙'
            };
            timeIndicator.textContent = `${icons[timeOfDay] || ''} ${timeString}`;
        }
    }
    
    showDamage(amount, worldPosition) {
        // Create floating damage number
        const element = document.createElement('div');
        element.className = 'damage-number';
        element.textContent = Math.floor(amount);
        
        // Mark as critical if high damage
        if (amount > 50) {
            element.classList.add('critical');
        }
        
        document.body.appendChild(element);
        
        // Project world position to screen
        const screenPos = this.worldToScreen(worldPosition);
        element.style.left = `${screenPos.x}px`;
        element.style.top = `${screenPos.y}px`;
        
        // Track for cleanup
        this.damageNumbers.push({
            element,
            createdAt: Date.now()
        });
    }
    
    showHeal(amount, worldPosition) {
        const element = document.createElement('div');
        element.className = 'damage-number heal';
        element.textContent = `+${Math.floor(amount)}`;
        
        document.body.appendChild(element);
        
        const screenPos = this.worldToScreen(worldPosition);
        element.style.left = `${screenPos.x}px`;
        element.style.top = `${screenPos.y}px`;
        
        this.damageNumbers.push({
            element,
            createdAt: Date.now()
        });
    }
    
    worldToScreen(worldPosition) {
        const camera = this.game.camera;
        const pos = worldPosition.clone();
        pos.project(camera);
        
        return {
            x: (pos.x * 0.5 + 0.5) * window.innerWidth,
            y: (-pos.y * 0.5 + 0.5) * window.innerHeight
        };
    }
    
    cleanupDamageNumbers() {
        const now = Date.now();
        
        this.damageNumbers = this.damageNumbers.filter(dn => {
            if (now - dn.createdAt > 1000) {
                dn.element.remove();
                return false;
            }
            return true;
        });
    }
    
    showInteractionPrompt(text) {
        const prompt = document.getElementById('interaction-prompt');
        document.getElementById('prompt-text').textContent = text;
        prompt.classList.remove('hidden');
    }
    
    hideInteractionPrompt() {
        document.getElementById('interaction-prompt').classList.add('hidden');
    }
    
    showItemPickup(itemName) {
        // Create item popup
        const popup = document.createElement('div');
        popup.id = 'item-popup';
        popup.innerHTML = `
            <h2>ITEM ACQUIRED</h2>
            <div class="item-name">${itemName}</div>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 3000);
    }
    
    showMessage(text, duration = 3000) {
        // Create a Soulsborne-style message notification
        const message = document.createElement('div');
        message.className = 'game-message';
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 35%;
            left: 50%;
            transform: translateX(-50%);
            color: #d4af37;
            font-size: 28px;
            letter-spacing: 4px;
            text-transform: uppercase;
            text-shadow: 2px 2px 4px #000, 0 0 10px rgba(212, 175, 55, 0.5);
            opacity: 0;
            animation: message-appear ${duration / 1000}s ease-in-out forwards;
            z-index: 900;
            pointer-events: none;
        `;
        
        document.body.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, duration);
    }
    
    updateMinimap() {
        if (!this.minimapCtx) return;
        
        const ctx = this.minimapCtx;
        const player = this.game.player;
        if (!player) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, 150, 150);
        
        // Draw circular background
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.minimapRadius, this.minimapRadius, this.minimapRadius, 0, Math.PI * 2);
        ctx.clip();
        
        // Background fill
        ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        ctx.fillRect(0, 0, 150, 150);
        
        // Draw terrain within range (simplified)
        const scale = this.minimapRadius / this.minimapRange;
        
        // Draw Sites of Grace (gold dots)
        if (this.game.checkpointSystem) {
            ctx.fillStyle = '#ffd700';
            this.game.checkpointSystem.checkpoints.forEach(checkpoint => {
                const dx = checkpoint.x - player.position.x;
                const dz = checkpoint.z - player.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist < this.minimapRange) {
                    const x = this.minimapRadius + dx * scale;
                    const y = this.minimapRadius + dz * scale;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        
        // Draw trees (dark green dots)
        if (this.game.world && this.game.world.trees) {
            ctx.fillStyle = '#2d4a2d';
            this.game.world.trees.forEach(tree => {
                const dx = tree.position.x - player.position.x;
                const dz = tree.position.z - player.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist < this.minimapRange) {
                    const x = this.minimapRadius + dx * scale;
                    const y = this.minimapRadius + dz * scale;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
        
        // Draw enemies (red dots)
        ctx.fillStyle = '#ff0000';
        this.game.enemies.forEach(enemy => {
            if (!enemy.isAlive) return;
            
            const dx = enemy.position.x - player.position.x;
            const dz = enemy.position.z - player.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < this.minimapRange) {
                const x = this.minimapRadius + dx * scale;
                const y = this.minimapRadius + dz * scale;
                
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Draw bosses (large red dots)
        this.game.bosses.forEach(boss => {
            if (!boss.isAlive) return;
            
            const dx = boss.position.x - player.position.x;
            const dz = boss.position.z - player.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < this.minimapRange) {
                const x = this.minimapRadius + dx * scale;
                const y = this.minimapRadius + dz * scale;
                
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Pulse effect
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 7 + Math.sin(Date.now() * 0.005) * 2, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
        
        // Draw player (green arrow at center showing facing direction)
        ctx.save();
        ctx.translate(this.minimapRadius, this.minimapRadius);
        ctx.rotate(player.rotation);
        
        // Draw arrow
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-4, 4);
        ctx.lineTo(0, 2);
        ctx.lineTo(4, 4);
        ctx.closePath();
        ctx.fill();
        
        // Arrow outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
        
        // Draw border
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.minimapRadius, this.minimapRadius, this.minimapRadius - 1, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}
