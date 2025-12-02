/**
 * SettingsMenu.js - In-game Settings UI
 * Allows players to adjust quality settings and view FPS
 */

export class SettingsMenu {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        
        this.createSettingsUI();
        this.setupEventListeners();
    }
    
    createSettingsUI() {
        // Create settings menu container
        const settingsMenu = document.createElement('div');
        settingsMenu.id = 'settings-menu';
        settingsMenu.className = 'hidden';
        settingsMenu.innerHTML = `
            <div class="menu-container settings-container">
                <h1>SETTINGS</h1>
                
                <div class="settings-section">
                    <h2>Graphics Quality</h2>
                    <div class="setting-row">
                        <label>Quality Preset:</label>
                        <select id="quality-preset">
                            <option value="potato">Potato (Chromebook)</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    
                    <div class="setting-row">
                        <label>Render Scale:</label>
                        <select id="render-scale">
                            <option value="0.5">50%</option>
                            <option value="0.75">75%</option>
                            <option value="1.0">100%</option>
                        </select>
                    </div>
                    
                    <div class="setting-row">
                        <label>Shadows:</label>
                        <input type="checkbox" id="shadows-toggle">
                    </div>
                    
                    <div class="setting-row">
                        <label>Particles:</label>
                        <input type="checkbox" id="particles-toggle">
                    </div>
                    
                    <div class="setting-row">
                        <label>Post-Processing:</label>
                        <input type="checkbox" id="postprocess-toggle">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>Audio</h2>
                    <div class="setting-row">
                        <label>Music:</label>
                        <input type="checkbox" id="music-toggle" checked>
                    </div>
                    
                    <div class="setting-row">
                        <label>Music Volume:</label>
                        <input type="range" id="music-volume" min="0" max="100" value="30">
                        <span id="volume-value">30%</span>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>Performance</h2>
                    <div class="setting-row">
                        <label>Draw Distance:</label>
                        <select id="draw-distance">
                            <option value="40">Near (40m)</option>
                            <option value="60">Medium (60m)</option>
                            <option value="100">Far (100m)</option>
                            <option value="200">Very Far (200m)</option>
                        </select>
                    </div>
                    
                    <div class="setting-row">
                        <label>Show FPS:</label>
                        <input type="checkbox" id="fps-toggle" checked>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h2>Performance Info</h2>
                    <div class="info-row">
                        <span>Current FPS:</span>
                        <span id="current-fps">--</span>
                    </div>
                    <div class="info-row">
                        <span>Active Enemies:</span>
                        <span id="active-enemies">--</span>
                    </div>
                    <div class="info-row">
                        <span>Visible Objects:</span>
                        <span id="visible-objects">--</span>
                    </div>
                </div>
                
                <div class="settings-note">
                    <p><strong>Potato Mode</strong> is optimized for old Chromebooks and low-end devices.</p>
                    <p>Changes will take effect immediately.</p>
                </div>
                
                <button class="menu-button" id="apply-settings-btn">Apply & Close</button>
                <button class="menu-button" id="close-settings-btn">Close</button>
            </div>
        `;
        
        document.getElementById('game-container').appendChild(settingsMenu);
        
        // Create FPS counter overlay
        const fpsCounter = document.createElement('div');
        fpsCounter.id = 'fps-counter';
        fpsCounter.className = 'fps-counter';
        fpsCounter.textContent = 'FPS: --';
        document.getElementById('game-container').appendChild(fpsCounter);
        
        // Add settings button to pause menu
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) {
            const settingsBtn = document.createElement('button');
            settingsBtn.className = 'menu-button';
            settingsBtn.id = 'settings-btn';
            settingsBtn.textContent = 'Settings';
            
            // Insert before the quit button
            const quitBtn = document.getElementById('quit-btn');
            if (quitBtn) {
                quitBtn.parentNode.insertBefore(settingsBtn, quitBtn);
            }
        }
    }
    
    setupEventListeners() {
        // Settings button in pause menu
        document.getElementById('settings-btn')?.addEventListener('click', () => {
            this.open();
        });
        
        // Close buttons
        document.getElementById('close-settings-btn')?.addEventListener('click', () => {
            this.close();
        });
        
        document.getElementById('apply-settings-btn')?.addEventListener('click', () => {
            this.applySettings();
            this.close();
        });
        
        // Quality preset change
        document.getElementById('quality-preset')?.addEventListener('change', (e) => {
            this.applyPreset(e.target.value);
        });
        
        // Individual settings
        document.getElementById('render-scale')?.addEventListener('change', (e) => {
            this.applyRenderScale(parseFloat(e.target.value));
        });
        
        document.getElementById('shadows-toggle')?.addEventListener('change', (e) => {
            this.toggleShadows(e.target.checked);
        });
        
        document.getElementById('particles-toggle')?.addEventListener('change', (e) => {
            this.toggleParticles(e.target.checked);
        });
        
        document.getElementById('postprocess-toggle')?.addEventListener('change', (e) => {
            this.togglePostProcessing(e.target.checked);
        });
        
        document.getElementById('draw-distance')?.addEventListener('change', (e) => {
            this.applyDrawDistance(parseInt(e.target.value));
        });
        
        document.getElementById('fps-toggle')?.addEventListener('change', (e) => {
            this.toggleFPS(e.target.checked);
        });
        
        // Music controls
        document.getElementById('music-toggle')?.addEventListener('change', (e) => {
            this.toggleMusic(e.target.checked);
        });
        
        document.getElementById('music-volume')?.addEventListener('input', (e) => {
            this.setMusicVolume(parseInt(e.target.value));
        });
        
        // Keyboard shortcut to open settings (G key) and close (ESC key)
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            if (e.key === 'g' || e.key === 'G') {
                if (!this.isOpen) {
                    this.open();
                } else {
                    this.close();
                }
            }
            
            // ESC key closes settings menu
            if (e.key === 'Escape' && this.isOpen) {
                e.stopPropagation(); // Prevent pause menu from also handling ESC
                this.close();
            }
        });
    }
    
    open() {
        this.isOpen = true;
        document.getElementById('settings-menu').classList.remove('hidden');
        this.game.pause();
        this.updateUI();
    }
    
    close() {
        this.isOpen = false;
        document.getElementById('settings-menu').classList.add('hidden');
        this.game.resume();
    }
    
    updateUI() {
        const settings = this.game.performanceSettings.getSettings();
        const preset = this.game.performanceSettings.getCurrentPreset();
        
        // Update form values
        document.getElementById('quality-preset').value = preset;
        document.getElementById('render-scale').value = settings.renderScale;
        document.getElementById('shadows-toggle').checked = settings.shadows;
        document.getElementById('particles-toggle').checked = settings.particlesEnabled;
        document.getElementById('postprocess-toggle').checked = settings.postProcessing;
        document.getElementById('draw-distance').value = settings.renderDistance;
        
        // Update music settings
        if (this.game.musicSystem) {
            document.getElementById('music-toggle').checked = this.game.musicSystem.enabled;
            const volumePercent = Math.round(this.game.musicSystem.volume * 100);
            document.getElementById('music-volume').value = volumePercent;
            document.getElementById('volume-value').textContent = volumePercent + '%';
        }
        
        // Update performance info
        document.getElementById('current-fps').textContent = this.game.fps || 0;
        document.getElementById('active-enemies').textContent = 
            this.game.enemies?.filter(e => e?.isAlive).length || 0;
        
        // Count visible objects (approximate)
        let visibleCount = 0;
        this.game.scene.traverse((obj) => {
            if (obj.visible && obj.isMesh) visibleCount++;
        });
        document.getElementById('visible-objects').textContent = visibleCount;
    }
    
    applySettings() {
        // Save settings to localStorage
        this.game.performanceSettings.saveToLocalStorage();
        console.log('Settings applied and saved');
    }
    
    applyPreset(presetName) {
        this.game.applyQualityPreset(presetName);
        this.updateUI();
    }
    
    applyRenderScale(scale) {
        this.game.performanceSettings.updateSetting('renderScale', scale);
        this.game.applyRenderScale(scale);
    }
    
    toggleShadows(enabled) {
        this.game.performanceSettings.updateSetting('shadows', enabled);
        this.game.toggleShadows(enabled);
    }
    
    toggleParticles(enabled) {
        this.game.performanceSettings.updateSetting('particlesEnabled', enabled);
        this.game.toggleParticles(enabled);
    }
    
    togglePostProcessing(enabled) {
        this.game.performanceSettings.updateSetting('postProcessing', enabled);
        this.game.togglePostProcessing(enabled);
    }
    
    applyDrawDistance(distance) {
        this.game.performanceSettings.updateSetting('renderDistance', distance);
        this.game.applyDrawDistance(distance);
    }
    
    toggleFPS(show) {
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
            fpsCounter.style.display = show ? 'block' : 'none';
        }
    }
    
    updateFPS(fps) {
        const fpsCounter = document.getElementById('fps-counter');
        if (fpsCounter) {
            fpsCounter.textContent = `FPS: ${fps}`;
            
            // Color code based on performance
            if (fps >= 50) {
                fpsCounter.style.color = '#00ff00';
            } else if (fps >= 30) {
                fpsCounter.style.color = '#ffff00';
            } else {
                fpsCounter.style.color = '#ff0000';
            }
        }
        
        // Update in settings menu if open
        if (this.isOpen) {
            document.getElementById('current-fps').textContent = fps;
        }
    }
    
    toggleMusic(enabled) {
        if (this.game.musicSystem) {
            this.game.musicSystem.setEnabled(enabled);
        }
    }
    
    setMusicVolume(volumePercent) {
        if (this.game.musicSystem) {
            this.game.musicSystem.setVolume(volumePercent / 100);
            document.getElementById('volume-value').textContent = volumePercent + '%';
        }
    }
}
