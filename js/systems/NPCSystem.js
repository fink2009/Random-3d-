/**
 * NPCSystem.js - Friendly NPC Management
 * Handles NPC interactions, dialogue, and vendors
 */

import * as THREE from 'three';

export class NPCSystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // All NPCs
        this.npcs = [];
        
        // Interaction
        this.interactionRange = 3;
        this.activeNPC = null;
        this.dialogueActive = false;
        this.currentDialogueIndex = 0;
        
        // Create NPCs
        this.createNPCs();
        
        // Setup dialogue UI
        this.setupDialogueUI();
    }
    
    createNPCs() {
        // Fire Keeper at starting bonfire
        this.addNPC({
            name: 'Fire Keeper',
            type: 'firekeeper',
            x: 3,
            z: 0,
            dialogue: [
                "Welcome, Ashen One. I am the Fire Keeper.",
                "I tend to the flame, and to thee.",
                "Touch the bonfire to restore thy strength.",
                "May the flames guide thee."
            ],
            services: ['levelUp']
        });
        
        // Merchant near forest edge
        this.addNPC({
            name: 'Wandering Merchant',
            type: 'merchant',
            x: 25,
            z: 25,
            dialogue: [
                "Ah, a customer! Welcome, weary traveler.",
                "I sell various goods for souls.",
                "Be careful in these lands... many have fallen.",
                "Come back anytime. Stay safe out there."
            ],
            services: ['shop'],
            inventory: [
                { id: 'firebomb', price: 100 },
                { id: 'throwingKnife', price: 50 },
                { id: 'greenBlossom', price: 150 }
            ]
        });
        
        // Crestfallen Warrior
        this.addNPC({
            name: 'Crestfallen Warrior',
            type: 'npc',
            x: -15,
            z: 8,
            dialogue: [
                "Oh, you're a new one, aren't you?",
                "Let me guess... they sent you here too?",
                "Well, good luck with that. Many have tried.",
                "The boss to the northeast... it's strong.",
                "I'd avoid it if I were you. But you won't listen.",
                "Heh, they never do."
            ]
        });
        
        // Sorcerer NPC
        this.addNPC({
            name: 'Exiled Sorcerer',
            type: 'sorcerer',
            x: -30,
            z: -25,
            dialogue: [
                "Ah, another soul seeking knowledge of the arcane.",
                "Magic is both power and danger. Respect it.",
                "Press Q to cast your equipped spell.",
                "Press 1, 2, 3 to switch between spells.",
                "The flames of a Fireball can devastate many foes.",
                "May wisdom guide your spells."
            ],
            services: ['spells']
        });
    }
    
    addNPC(config) {
        const y = this.game.world.getHeightAt(config.x, config.z);
        
        const npc = {
            name: config.name,
            type: config.type,
            position: new THREE.Vector3(config.x, y, config.z),
            dialogue: config.dialogue,
            services: config.services || [],
            inventory: config.inventory || [],
            mesh: null
        };
        
        this.createNPCMesh(npc);
        this.npcs.push(npc);
    }
    
    createNPCMesh(npc) {
        const group = new THREE.Group();
        
        // Different colors based on type
        let robeColor, detailColor;
        switch (npc.type) {
            case 'firekeeper':
                robeColor = 0x2a2a3a;
                detailColor = 0xd4af37;
                break;
            case 'merchant':
                robeColor = 0x4a3a2a;
                detailColor = 0x8b7355;
                break;
            case 'sorcerer':
                robeColor = 0x2a2a4a;
                detailColor = 0x4488ff;
                break;
            default:
                robeColor = 0x3a3a3a;
                detailColor = 0x888888;
        }
        
        // Body/robe
        const bodyGeometry = new THREE.CapsuleGeometry(0.35, 1.2, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: robeColor,
            roughness: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4a574,
            roughness: 0.8
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.8;
        head.castShadow = true;
        group.add(head);
        
        // Hood/hat
        if (npc.type === 'sorcerer' || npc.type === 'firekeeper') {
            const hoodGeometry = new THREE.ConeGeometry(0.3, 0.4, 8);
            const hood = new THREE.Mesh(hoodGeometry, bodyMaterial);
            hood.position.y = 2.1;
            group.add(hood);
        }
        
        // Detail accent (belt, trim, etc.)
        const accentGeometry = new THREE.TorusGeometry(0.4, 0.05, 8, 16);
        const accentMaterial = new THREE.MeshStandardMaterial({
            color: detailColor,
            roughness: 0.5,
            metalness: 0.3
        });
        const accent = new THREE.Mesh(accentGeometry, accentMaterial);
        accent.position.y = 0.7;
        accent.rotation.x = Math.PI / 2;
        group.add(accent);
        
        // Staff for sorcerer
        if (npc.type === 'sorcerer') {
            const staffGeometry = new THREE.CylinderGeometry(0.03, 0.04, 1.8, 8);
            const staffMaterial = new THREE.MeshStandardMaterial({
                color: 0x3a2a1a,
                roughness: 0.9
            });
            const staff = new THREE.Mesh(staffGeometry, staffMaterial);
            staff.position.set(0.4, 1, 0);
            staff.rotation.z = 0.2;
            group.add(staff);
            
            // Crystal on staff
            const crystalGeometry = new THREE.OctahedronGeometry(0.1, 0);
            const crystalMaterial = new THREE.MeshStandardMaterial({
                color: 0x4488ff,
                emissive: 0x4488ff,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.8
            });
            const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
            crystal.position.set(0.5, 1.95, 0);
            group.add(crystal);
        }
        
        // Lantern for merchant
        if (npc.type === 'merchant') {
            const lanternGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.15);
            const lanternMaterial = new THREE.MeshStandardMaterial({
                color: 0x8b7355,
                roughness: 0.7
            });
            const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
            lantern.position.set(0.45, 0.8, 0);
            group.add(lantern);
            
            // Lantern light
            const light = new THREE.PointLight(0xffaa44, 0.5, 5);
            light.position.set(0.45, 0.9, 0);
            group.add(light);
        }
        
        // Firekeeper has warm glow
        if (npc.type === 'firekeeper') {
            const light = new THREE.PointLight(0xffaa44, 0.3, 8);
            light.position.y = 1.2;
            group.add(light);
        }
        
        // Name label
        // (Would normally use a sprite or CSS3D object, but keeping it simple)
        
        group.position.copy(npc.position);
        this.scene.add(group);
        npc.mesh = group;
    }
    
    setupDialogueUI() {
        // Create dialogue container if not exists
        if (!document.getElementById('dialogue-container')) {
            const dialogueHTML = `
                <div id="dialogue-container" class="hidden">
                    <div id="dialogue-box">
                        <div id="npc-name"></div>
                        <div id="dialogue-text"></div>
                        <div id="dialogue-continue">Press E to continue</div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', dialogueHTML);
            
            // Add dialogue styles
            const style = document.createElement('style');
            style.textContent = `
                #dialogue-container {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 600px;
                    max-width: 90%;
                    z-index: 600;
                }
                
                #dialogue-box {
                    background: linear-gradient(180deg, rgba(30, 25, 20, 0.95) 0%, rgba(20, 15, 10, 0.98) 100%);
                    border: 3px solid rgba(100, 80, 60, 0.8);
                    padding: 25px 30px;
                }
                
                #npc-name {
                    color: #d4af37;
                    font-size: 18px;
                    letter-spacing: 2px;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                }
                
                #dialogue-text {
                    color: #eee;
                    font-size: 16px;
                    line-height: 1.6;
                    min-height: 60px;
                }
                
                #dialogue-continue {
                    color: #888;
                    font-size: 12px;
                    margin-top: 15px;
                    text-align: right;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    update(deltaTime) {
        const player = this.game.player;
        if (!player) return;
        
        // Rotate NPCs to face player when nearby
        this.npcs.forEach(npc => {
            const distance = player.position.distanceTo(npc.position);
            
            if (distance < 10 && npc.mesh) {
                // Face player
                const toPlayer = new THREE.Vector3();
                toPlayer.subVectors(player.position, npc.position);
                toPlayer.y = 0;
                npc.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
            }
        });
        
        // Check for interaction if not in dialogue
        if (!this.dialogueActive) {
            this.checkNPCInteraction(player);
        }
    }
    
    checkNPCInteraction(player) {
        let nearestNPC = null;
        let nearestDistance = this.interactionRange;
        
        this.npcs.forEach(npc => {
            const distance = player.position.distanceTo(npc.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestNPC = npc;
            }
        });
        
        if (nearestNPC) {
            this.game.hud.showInteractionPrompt('Talk to ' + nearestNPC.name);
            
            // Check for interact input
            if (this.game.inputManager.wasActionPressed('interact')) {
                this.startDialogue(nearestNPC);
            }
        }
    }
    
    startDialogue(npc) {
        this.activeNPC = npc;
        this.dialogueActive = true;
        this.currentDialogueIndex = 0;
        this.game.isPaused = true;
        
        // Show dialogue UI
        document.getElementById('dialogue-container').classList.remove('hidden');
        document.getElementById('npc-name').textContent = npc.name;
        this.showCurrentDialogue();
        
        // Hide interaction prompt
        this.game.hud.hideInteractionPrompt();
        
        // Release pointer lock
        document.exitPointerLock();
        
        // Setup dialogue advancement
        this.dialogueHandler = (e) => {
            if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
                this.advanceDialogue();
            }
            if (e.code === 'Escape') {
                this.endDialogue();
            }
        };
        document.addEventListener('keydown', this.dialogueHandler);
    }
    
    showCurrentDialogue() {
        const dialogue = this.activeNPC.dialogue[this.currentDialogueIndex];
        document.getElementById('dialogue-text').textContent = dialogue;
        
        // Update continue prompt
        const isLast = this.currentDialogueIndex >= this.activeNPC.dialogue.length - 1;
        document.getElementById('dialogue-continue').textContent = 
            isLast ? 'Press E to end' : 'Press E to continue';
    }
    
    advanceDialogue() {
        this.currentDialogueIndex++;
        
        if (this.currentDialogueIndex >= this.activeNPC.dialogue.length) {
            this.endDialogue();
        } else {
            this.showCurrentDialogue();
        }
    }
    
    endDialogue() {
        this.dialogueActive = false;
        document.getElementById('dialogue-container').classList.add('hidden');
        
        // Remove event listener
        if (this.dialogueHandler) {
            document.removeEventListener('keydown', this.dialogueHandler);
        }
        
        // Check for services
        if (this.activeNPC && this.activeNPC.services.length > 0) {
            // Open shop if merchant
            if (this.activeNPC.services.includes('shop')) {
                this.openShop(this.activeNPC);
                return;
            }
            
            // Open level up menu
            if (this.activeNPC.services.includes('levelUp')) {
                if (this.game.progressionSystem.canLevelUp()) {
                    this.game.progressionSystem.openLevelUpMenu();
                    return;
                }
            }
        }
        
        this.activeNPC = null;
        this.game.isPaused = false;
    }
    
    openShop(npc) {
        const shopMenu = document.getElementById('shop-menu');
        const shopTitle = document.getElementById('shop-title');
        const shopSoulsAmount = document.getElementById('shop-souls-amount');
        const shopItemsGrid = document.getElementById('shop-items-grid');
        
        if (!shopMenu || !npc.inventory) return;
        
        // Set shop title
        shopTitle.textContent = npc.name;
        
        // Update player souls display
        const playerSouls = this.game.progressionSystem.souls;
        shopSoulsAmount.textContent = playerSouls.toLocaleString();
        
        // Clear previous items
        shopItemsGrid.innerHTML = '';
        
        // Populate shop items
        npc.inventory.forEach((shopItem, index) => {
            const itemDef = this.game.inventorySystem.itemDatabase[shopItem.id];
            if (!itemDef) return;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'shop-item';
            itemDiv.innerHTML = `
                <div class="shop-item-icon">${itemDef.icon}</div>
                <div class="shop-item-name">${itemDef.name}</div>
                <div class="shop-item-description">${itemDef.description}</div>
                <div class="shop-item-price">${shopItem.price} Souls</div>
                <button class="shop-buy-btn" data-item-id="${shopItem.id}" data-price="${shopItem.price}">Buy</button>
            `;
            shopItemsGrid.appendChild(itemDiv);
        });
        
        // Add buy button handlers
        const buyButtons = shopItemsGrid.querySelectorAll('.shop-buy-btn');
        buyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.getAttribute('data-item-id');
                const price = parseInt(btn.getAttribute('data-price'));
                this.buyItem(itemId, price);
            });
        });
        
        // Show shop menu
        shopMenu.classList.remove('hidden');
        this.game.isPaused = true;
        
        // Setup close button
        const closeBtn = document.getElementById('close-shop-btn');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeShop();
        }
    }
    
    buyItem(itemId, price) {
        const playerSouls = this.game.progressionSystem.souls;
        
        // Check if player has enough souls
        if (playerSouls < price) {
            if (this.game.hud) {
                this.game.hud.showMessage('Not enough souls!', 2000);
            }
            return;
        }
        
        // Deduct souls
        this.game.progressionSystem.addSouls(-price);
        
        // Add item to inventory
        this.game.inventorySystem.addItem(itemId, 1);
        
        // Show confirmation
        const itemDef = this.game.inventorySystem.itemDatabase[itemId];
        if (this.game.hud && itemDef) {
            this.game.hud.showMessage(`Purchased ${itemDef.name}!`, 2000);
        }
        
        // Update souls display in shop
        const shopSoulsAmount = document.getElementById('shop-souls-amount');
        if (shopSoulsAmount) {
            shopSoulsAmount.textContent = this.game.progressionSystem.souls.toLocaleString();
        }
        
        // Play purchase sound (if available)
        // this.game.audioSystem?.playSound('purchase');
    }
    
    closeShop() {
        document.getElementById('shop-menu').classList.add('hidden');
        this.activeNPC = null;
        this.game.isPaused = false;
    }
}
