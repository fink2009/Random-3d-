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
            
            // Flash stamina bar when low
            if (staminaPercent < 20) {
                this.staminaFill.style.opacity = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            } else {
                this.staminaFill.style.opacity = 1;
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
        
        // Update debug info
        this.updateDebugInfo();
        
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
}
