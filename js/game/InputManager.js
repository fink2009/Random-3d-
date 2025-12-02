/**
 * InputManager.js - Handles all player input
 * Manages keyboard, mouse, and gamepad input
 */

export class InputManager {
    constructor(game) {
        this.game = game;
        
        // Key states
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false,
            jump: false,
            roll: false,
            lightAttack: false,
            heavyAttack: false,
            block: false,
            interact: false,
            lockOn: false,
            pause: false,
            inventory: false
        };
        
        // Mouse state
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
            rightButton: false,
            sensitivity: 0.002
        };
        
        // Action flags (for single-press detection)
        this.actionPressed = {
            roll: false,
            lightAttack: false,
            heavyAttack: false,
            interact: false,
            lockOn: false,
            pause: false,
            inventory: false,
            jump: false
        };
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    }
    
    onKeyDown(event) {
        // Prevent default for game controls
        if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
            event.preventDefault();
        }
        
        switch (event.code) {
            case 'KeyW':
                this.keys.forward = true;
                break;
            case 'KeyS':
                this.keys.backward = true;
                break;
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = true;
                break;
            case 'Space':
                if (!this.keys.roll) {
                    this.keys.roll = true;
                    this.actionPressed.roll = true;
                }
                break;
            case 'KeyE':
                if (!this.keys.interact) {
                    this.keys.interact = true;
                    this.actionPressed.interact = true;
                }
                break;
            case 'Tab':
                if (!this.keys.lockOn) {
                    this.keys.lockOn = true;
                    this.actionPressed.lockOn = true;
                }
                break;
            case 'Escape':
                if (!this.keys.pause) {
                    this.keys.pause = true;
                    this.actionPressed.pause = true;
                    this.game.isPaused ? this.game.resume() : this.game.pause();
                }
                break;
            case 'KeyI':
                if (!this.keys.inventory) {
                    this.keys.inventory = true;
                    this.actionPressed.inventory = true;
                }
                break;
            case 'KeyX':
                // Cycle weapons
                if (this.game.weaponSystem) {
                    this.game.weaponSystem.cycleWeapon();
                }
                break;
            case 'KeyL':
                // Use weapon art
                if (this.game.weaponSystem && !this.game.isPaused) {
                    this.game.weaponSystem.useWeaponArt();
                }
                break;
            case 'KeyG':
                // Toggle debug info
                document.getElementById('debug-info').classList.toggle('hidden');
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
                this.keys.forward = false;
                break;
            case 'KeyS':
                this.keys.backward = false;
                break;
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = false;
                break;
            case 'Space':
                this.keys.roll = false;
                break;
            case 'KeyE':
                this.keys.interact = false;
                break;
            case 'Tab':
                this.keys.lockOn = false;
                break;
            case 'Escape':
                this.keys.pause = false;
                break;
            case 'KeyI':
                this.keys.inventory = false;
                break;
        }
    }
    
    onMouseMove(event) {
        if (document.pointerLockElement === this.game.canvas) {
            this.mouse.deltaX = event.movementX * this.mouse.sensitivity;
            this.mouse.deltaY = event.movementY * this.mouse.sensitivity;
        } else {
            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;
        }
    }
    
    onMouseDown(event) {
        if (event.button === 0) {
            // Left click - attack
            this.mouse.leftButton = true;
            if (this.keys.sprint) {
                this.actionPressed.heavyAttack = true;
            } else {
                this.actionPressed.lightAttack = true;
            }
        } else if (event.button === 2) {
            // Right click - block
            this.mouse.rightButton = true;
            this.keys.block = true;
        }
    }
    
    onMouseUp(event) {
        if (event.button === 0) {
            this.mouse.leftButton = false;
        } else if (event.button === 2) {
            this.mouse.rightButton = false;
            this.keys.block = false;
        }
    }
    
    onPointerLockChange() {
        if (document.pointerLockElement !== this.game.canvas) {
            // Pointer unlocked - could pause game
            this.mouse.deltaX = 0;
            this.mouse.deltaY = 0;
        }
    }
    
    // Check if an action was just pressed (single press)
    wasActionPressed(action) {
        if (this.actionPressed[action]) {
            this.actionPressed[action] = false;
            return true;
        }
        return false;
    }
    
    // Get movement direction vector
    getMovementDirection() {
        let x = 0;
        let z = 0;
        
        if (this.keys.forward) z -= 1;
        if (this.keys.backward) z += 1;
        if (this.keys.left) x -= 1;
        if (this.keys.right) x += 1;
        
        // Normalize
        const length = Math.sqrt(x * x + z * z);
        if (length > 0) {
            x /= length;
            z /= length;
        }
        
        return { x, z };
    }
    
    // Check if player is trying to move
    isMoving() {
        return this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    }
    
    // Get mouse delta and reset
    getMouseDelta() {
        const delta = {
            x: this.mouse.deltaX,
            y: this.mouse.deltaY
        };
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        return delta;
    }
    
    // Reset all action pressed flags
    clearActions() {
        for (const key in this.actionPressed) {
            this.actionPressed[key] = false;
        }
    }
}
