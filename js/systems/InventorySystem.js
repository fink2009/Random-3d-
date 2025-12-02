/**
 * InventorySystem.js - Inventory and Item Management
 * Handles player inventory, item pickups, and equipment
 */

import * as THREE from 'three';

export class InventorySystem {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Inventory slots
        this.maxSlots = 40;
        this.items = [];
        
        // Item pickup range
        this.pickupRange = 2;
        
        // World items
        this.worldItems = [];
        
        // Item definitions
        this.itemDatabase = {
            // Consumables
            estusFlask: {
                name: 'Estus Flask',
                type: 'consumable',
                maxStack: 1,
                healAmount: 50,
                charges: 5,
                maxCharges: 5,
                icon: '🧪',
                description: 'A flask filled with Estus. Restores HP.'
            },
            ashenEstus: {
                name: 'Ashen Estus Flask',
                type: 'consumable',
                maxStack: 1,
                fpAmount: 50,
                charges: 3,
                maxCharges: 3,
                icon: '🔵',
                description: 'A flask filled with ashen Estus. Restores FP.'
            },
            firebomb: {
                name: 'Firebomb',
                type: 'consumable',
                maxStack: 10,
                damage: 80,
                icon: '💣',
                description: 'A small bomb that explodes on impact.'
            },
            throwingKnife: {
                name: 'Throwing Knife',
                type: 'consumable',
                maxStack: 20,
                damage: 30,
                icon: '🗡',
                description: 'A throwing knife for ranged attacks.'
            },
            greenBlossom: {
                name: 'Green Blossom',
                type: 'consumable',
                maxStack: 10,
                duration: 60,
                staminaRegen: 2,
                icon: '🌿',
                description: 'Temporarily boosts stamina recovery.'
            },
            ember: {
                name: 'Ember',
                type: 'consumable',
                maxStack: 10,
                hpBoost: 30,
                icon: '🔥',
                description: 'Consume to gain boosted HP.'
            },
            // Upgrade materials
            titaniteShard: {
                name: 'Titanite Shard',
                type: 'material',
                maxStack: 99,
                icon: '💎',
                description: 'A small titanite shard for weapon reinforcement.'
            },
            largeTitanite: {
                name: 'Large Titanite Shard',
                type: 'material',
                maxStack: 99,
                icon: '💠',
                description: 'A larger titanite shard for advanced reinforcement.'
            },
            twinkling: {
                name: 'Twinkling Titanite',
                type: 'material',
                maxStack: 99,
                icon: '✨',
                description: 'A rare titanite for special weapons.'
            },
            dragonScale: {
                name: 'Dragon Scale',
                type: 'material',
                maxStack: 10,
                icon: '🐉',
                description: 'A scale from an ancient dragon. Very rare.'
            },
            // Key items
            bossKey: {
                name: 'Boss Gate Key',
                type: 'key',
                maxStack: 1,
                icon: '🗝',
                description: 'Opens the gate to the boss arena.'
            },
            loreItem1: {
                name: 'Ancient Tome',
                type: 'key',
                maxStack: 1,
                icon: '📜',
                description: 'An ancient tome containing forgotten lore.'
            }
        };
        
        // Quick items (1-4 keys)
        this.quickItems = [null, null, null, null];
        this.selectedQuickItem = 0;
        
        // UI state
        this.isInventoryOpen = false;
        
        // Setup input
        this.setupInput();
        
        // Spawn world items
        this.spawnWorldItems();
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (this.game.isPaused && !this.isInventoryOpen) return;
            
            switch (e.code) {
                case 'KeyI':
                    this.toggleInventory();
                    break;
                case 'KeyR':
                    this.useQuickItem();
                    break;
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (e.code === 'ArrowLeft') {
                        this.selectedQuickItem = (this.selectedQuickItem - 1 + 4) % 4;
                    } else {
                        this.selectedQuickItem = (this.selectedQuickItem + 1) % 4;
                    }
                    this.updateQuickItemDisplay();
                    break;
            }
        });
    }
    
    spawnWorldItems() {
        // Spawn various items around the world
        const itemSpawns = [
            { x: 15, z: 10, item: 'titaniteShard' },
            { x: -20, z: 25, item: 'greenBlossom' },
            { x: 35, z: -15, item: 'firebomb' },
            { x: -10, z: -30, item: 'throwingKnife' },
            { x: 50, z: 20, item: 'largeTitanite' },
            { x: -35, z: -10, item: 'titaniteShard' },
            { x: 25, z: 45, item: 'ember' },
            { x: -45, z: 35, item: 'greenBlossom' },
            { x: 60, z: 60, item: 'twinkling' },
            { x: 75, z: 75, item: 'bossKey' }, // Near boss area
        ];
        
        itemSpawns.forEach(spawn => {
            this.spawnWorldItem(spawn.item, spawn.x, spawn.z);
        });
    }
    
    spawnWorldItem(itemId, x, z) {
        const itemDef = this.itemDatabase[itemId];
        if (!itemDef) return;
        
        const y = this.game.world.getHeightAt(x, z) + 0.5;
        
        // Create glowing pickup mesh
        const group = new THREE.Group();
        
        // Core sphere
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: this.getItemColor(itemDef.type),
            emissive: this.getItemColor(itemDef.type),
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        
        // Glow effect
        const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMaterial = new THREE.MeshStandardMaterial({
            color: this.getItemColor(itemDef.type),
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
        
        // Point light
        const light = new THREE.PointLight(this.getItemColor(itemDef.type), 0.5, 5);
        group.add(light);
        
        group.position.set(x, y, z);
        this.scene.add(group);
        
        this.worldItems.push({
            id: itemId,
            mesh: group,
            position: new THREE.Vector3(x, y, z),
            collected: false
        });
    }
    
    getItemColor(type) {
        switch (type) {
            case 'consumable': return 0x44ff44;
            case 'material': return 0x4488ff;
            case 'key': return 0xffdd00;
            default: return 0xffffff;
        }
    }
    
    update(deltaTime) {
        const player = this.game.player;
        if (!player) return;
        
        // Update world items (bobbing animation)
        this.worldItems.forEach(item => {
            if (!item.collected && item.mesh) {
                item.mesh.position.y = item.position.y + Math.sin(Date.now() * 0.003) * 0.2;
                item.mesh.rotation.y += deltaTime * 2;
            }
        });
        
        // Check for item pickups
        this.checkPickups(player.position);
    }
    
    checkPickups(playerPos) {
        for (let i = this.worldItems.length - 1; i >= 0; i--) {
            const item = this.worldItems[i];
            if (item.collected) continue;
            
            const dist = playerPos.distanceTo(item.position);
            if (dist < this.pickupRange) {
                this.collectItem(item, i);
            }
        }
    }
    
    collectItem(worldItem, index) {
        const itemDef = this.itemDatabase[worldItem.id];
        if (!itemDef) return;
        
        // Add to inventory
        const added = this.addItem(worldItem.id, 1);
        
        if (added) {
            // Show pickup notification
            if (this.game.hud) {
                this.game.hud.showItemPickup(itemDef.name);
            }
            
            // Spawn pickup effect
            this.game.particleSystem.spawnSoulsEffect(worldItem.position.clone(), 10);
            
            // Remove from world
            worldItem.collected = true;
            this.scene.remove(worldItem.mesh);
            worldItem.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            
            this.worldItems.splice(index, 1);
        }
    }
    
    addItem(itemId, quantity = 1) {
        const itemDef = this.itemDatabase[itemId];
        if (!itemDef) return false;
        
        // Check for existing stack
        const existingItem = this.items.find(i => i.id === itemId && i.quantity < itemDef.maxStack);
        
        if (existingItem) {
            const spaceInStack = itemDef.maxStack - existingItem.quantity;
            const toAdd = Math.min(quantity, spaceInStack);
            existingItem.quantity += toAdd;
            quantity -= toAdd;
        }
        
        // Add new stacks if needed
        while (quantity > 0 && this.items.length < this.maxSlots) {
            const toAdd = Math.min(quantity, itemDef.maxStack);
            this.items.push({
                id: itemId,
                quantity: toAdd,
                charges: itemDef.charges // For flask-type items
            });
            quantity -= toAdd;
        }
        
        return true;
    }
    
    removeItem(itemId, quantity = 1) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.items[i].id === itemId) {
                if (this.items[i].quantity <= quantity) {
                    quantity -= this.items[i].quantity;
                    this.items.splice(i, 1);
                } else {
                    this.items[i].quantity -= quantity;
                    quantity = 0;
                }
                
                if (quantity <= 0) break;
            }
        }
    }
    
    hasItem(itemId, quantity = 1) {
        let count = 0;
        for (const item of this.items) {
            if (item.id === itemId) {
                count += item.quantity;
            }
        }
        return count >= quantity;
    }
    
    getItemCount(itemId) {
        let count = 0;
        for (const item of this.items) {
            if (item.id === itemId) {
                count += item.quantity;
            }
        }
        return count;
    }
    
    useQuickItem() {
        const itemRef = this.quickItems[this.selectedQuickItem];
        if (!itemRef) return;
        
        const item = this.items.find(i => i.id === itemRef);
        if (!item) return;
        
        const itemDef = this.itemDatabase[item.id];
        if (!itemDef || itemDef.type !== 'consumable') return;
        
        // Use the item
        this.useItem(item, itemDef);
    }
    
    useItem(item, itemDef) {
        const player = this.game.player;
        if (!player) return;
        
        // Handle flask-type items
        if (item.charges !== undefined) {
            if (item.charges <= 0) {
                if (this.game.hud) {
                    this.game.hud.showMessage('No charges remaining', 1500);
                }
                return;
            }
            item.charges--;
        } else {
            // Consumable with quantity
            this.removeItem(item.id, 1);
        }
        
        // Apply effect
        switch (item.id) {
            case 'estusFlask':
                player.health = Math.min(player.maxHealth, player.health + itemDef.healAmount);
                this.game.particleSystem.spawnHealParticle && 
                    this.game.particleSystem.spawnFire(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 10);
                if (this.game.hud) this.game.hud.showHeal(itemDef.healAmount, player.position);
                break;
                
            case 'ashenEstus':
                player.mana = Math.min(player.maxMana, player.mana + itemDef.fpAmount);
                this.game.particleSystem.spawnMagicParticle(player.position.clone().add(new THREE.Vector3(0, 1, 0)));
                break;
                
            case 'firebomb':
                this.throwFirebomb(player, itemDef.damage);
                break;
                
            case 'throwingKnife':
                this.throwKnife(player, itemDef.damage);
                break;
                
            case 'greenBlossom':
                // Buff system would go here
                if (this.game.hud) this.game.hud.showMessage('Stamina recovery boosted!', 2000);
                break;
                
            case 'ember':
                player.maxHealth += itemDef.hpBoost;
                player.health += itemDef.hpBoost;
                if (this.game.hud) this.game.hud.showMessage('HP boosted!', 2000);
                break;
        }
        
        this.updateQuickItemDisplay();
    }
    
    throwFirebomb(player, damage) {
        const direction = new THREE.Vector3(
            Math.sin(player.rotation),
            0.3,
            Math.cos(player.rotation)
        );
        
        if (player.lockedTarget) {
            direction.subVectors(player.lockedTarget.position, player.position);
            direction.y += 1;
            direction.normalize();
        }
        
        // Create firebomb projectile
        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8
        });
        
        const bomb = new THREE.Mesh(geometry, material);
        bomb.position.copy(player.position);
        bomb.position.y += 1.2;
        
        this.scene.add(bomb);
        
        // Animate throw
        const velocity = direction.clone().multiplyScalar(20);
        velocity.y = 8;
        
        const animate = () => {
            velocity.y -= 0.5;
            bomb.position.add(velocity.clone().multiplyScalar(0.016));
            
            // Check ground collision
            const groundY = this.game.world.getHeightAt(bomb.position.x, bomb.position.z);
            if (bomb.position.y < groundY + 0.5) {
                // Explode
                this.explodeFirebomb(bomb.position, damage);
                this.scene.remove(bomb);
                bomb.geometry.dispose();
                bomb.material.dispose();
                return;
            }
            
            // Check enemy collision
            for (const enemy of this.game.enemies) {
                if (enemy.isAlive && bomb.position.distanceTo(enemy.position) < 2) {
                    this.explodeFirebomb(bomb.position, damage);
                    this.scene.remove(bomb);
                    bomb.geometry.dispose();
                    bomb.material.dispose();
                    return;
                }
            }
            
            if (bomb.position.y > -50) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    explodeFirebomb(position, damage) {
        // Explosion particles
        this.game.particleSystem.spawnFire(position, 30);
        this.game.particleSystem.spawnDustCloud(position, 20);
        
        // Damage enemies in range
        const radius = 4;
        
        for (const enemy of this.game.enemies) {
            if (!enemy.isAlive) continue;
            const dist = position.distanceTo(enemy.position);
            if (dist < radius) {
                const falloff = 1 - (dist / radius);
                enemy.takeDamage(Math.floor(damage * falloff), position);
            }
        }
        
        for (const boss of this.game.bosses) {
            if (!boss.isAlive) continue;
            const dist = position.distanceTo(boss.position);
            if (dist < radius + 2) {
                const falloff = 1 - (dist / (radius + 2));
                boss.takeDamage(Math.floor(damage * falloff), position);
            }
        }
    }
    
    throwKnife(player, damage) {
        const direction = new THREE.Vector3(
            Math.sin(player.rotation),
            0,
            Math.cos(player.rotation)
        );
        
        if (player.lockedTarget) {
            direction.subVectors(player.lockedTarget.position, player.position);
            direction.y += 1;
            direction.normalize();
        }
        
        // Create knife projectile
        const geometry = new THREE.ConeGeometry(0.05, 0.3, 4);
        const material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            metalness: 0.8,
            roughness: 0.3
        });
        
        const knife = new THREE.Mesh(geometry, material);
        knife.position.copy(player.position);
        knife.position.y += 1.2;
        knife.rotation.x = Math.PI / 2;
        knife.lookAt(knife.position.clone().add(direction));
        knife.rotateX(Math.PI / 2);
        
        this.scene.add(knife);
        
        const speed = 30;
        let lifetime = 2;
        
        const animate = () => {
            lifetime -= 0.016;
            if (lifetime <= 0) {
                this.scene.remove(knife);
                knife.geometry.dispose();
                knife.material.dispose();
                return;
            }
            
            knife.position.add(direction.clone().multiplyScalar(speed * 0.016));
            
            // Check enemy collision
            for (const enemy of this.game.enemies) {
                if (enemy.isAlive && knife.position.distanceTo(enemy.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1) {
                    enemy.takeDamage(damage, knife.position);
                    this.game.particleSystem.spawnHitSparks(knife.position, 10);
                    this.scene.remove(knife);
                    knife.geometry.dispose();
                    knife.material.dispose();
                    return;
                }
            }
            
            for (const boss of this.game.bosses) {
                if (boss.isAlive && knife.position.distanceTo(boss.position.clone().add(new THREE.Vector3(0, 2, 0))) < 2) {
                    boss.takeDamage(damage, knife.position);
                    this.game.particleSystem.spawnHitSparks(knife.position, 10);
                    this.scene.remove(knife);
                    knife.geometry.dispose();
                    knife.material.dispose();
                    return;
                }
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
        
        if (this.isInventoryOpen) {
            this.showInventoryUI();
        } else {
            this.hideInventoryUI();
        }
    }
    
    showInventoryUI() {
        // Create inventory UI
        let inventoryUI = document.getElementById('inventory-ui');
        if (!inventoryUI) {
            inventoryUI = document.createElement('div');
            inventoryUI.id = 'inventory-ui';
            inventoryUI.innerHTML = this.createInventoryHTML();
            document.body.appendChild(inventoryUI);
        } else {
            inventoryUI.innerHTML = this.createInventoryHTML();
            inventoryUI.classList.remove('hidden');
        }
        
        this.game.isPaused = true;
        document.exitPointerLock();
        
        // Add close button handler
        document.getElementById('close-inventory')?.addEventListener('click', () => this.toggleInventory());
    }
    
    hideInventoryUI() {
        const inventoryUI = document.getElementById('inventory-ui');
        if (inventoryUI) {
            inventoryUI.classList.add('hidden');
        }
        this.game.isPaused = false;
    }
    
    createInventoryHTML() {
        let itemsHTML = '';
        
        for (const item of this.items) {
            const itemDef = this.itemDatabase[item.id];
            if (!itemDef) continue;
            
            let quantityText = item.charges !== undefined 
                ? `${item.charges}/${itemDef.maxCharges}` 
                : `x${item.quantity}`;
            
            itemsHTML += `
                <div class="inventory-item" data-item="${item.id}" title="${itemDef.description}">
                    <span class="item-icon">${itemDef.icon}</span>
                    <span class="item-name">${itemDef.name}</span>
                    <span class="item-quantity">${quantityText}</span>
                </div>
            `;
        }
        
        if (this.items.length === 0) {
            itemsHTML = '<div class="inventory-empty">Inventory is empty</div>';
        }
        
        return `
            <div class="inventory-backdrop">
                <div class="inventory-container">
                    <div class="inventory-header">
                        <h2>INVENTORY</h2>
                        <button id="close-inventory" class="menu-button">✕</button>
                    </div>
                    <div class="inventory-tabs">
                        <button class="tab-btn active">All</button>
                        <button class="tab-btn">Consumables</button>
                        <button class="tab-btn">Materials</button>
                        <button class="tab-btn">Key Items</button>
                    </div>
                    <div class="inventory-grid">
                        ${itemsHTML}
                    </div>
                    <div class="inventory-footer">
                        <span>${this.items.length}/${this.maxSlots} slots used</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    updateQuickItemDisplay() {
        // Update HUD quick item display
        const itemSlot = document.getElementById('item-slot');
        if (itemSlot) {
            const itemRef = this.quickItems[this.selectedQuickItem];
            if (itemRef) {
                const itemDef = this.itemDatabase[itemRef];
                itemSlot.textContent = itemDef ? itemDef.icon : '🧪';
            } else {
                itemSlot.textContent = '🧪';
            }
        }
    }
    
    // Assign item to quick slot
    setQuickItem(slotIndex, itemId) {
        if (slotIndex >= 0 && slotIndex < 4) {
            this.quickItems[slotIndex] = itemId;
            this.updateQuickItemDisplay();
        }
    }
    
    // Initialize default quick items
    initializeDefaultItems() {
        // Give player starting items
        this.addItem('estusFlask', 1);
        this.addItem('ashenEstus', 1);
        this.addItem('firebomb', 3);
        this.addItem('throwingKnife', 5);
        
        // Set quick items
        this.quickItems[0] = 'estusFlask';
        this.quickItems[1] = 'ashenEstus';
        this.quickItems[2] = 'firebomb';
        this.quickItems[3] = 'throwingKnife';
        
        this.updateQuickItemDisplay();
    }
}
