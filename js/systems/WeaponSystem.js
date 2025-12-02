/**
 * WeaponSystem.js - Equipment and Weapon Management
 * Handles different weapons, armor, and equipment stats
 */

import * as THREE from 'three';

export class WeaponSystem {
    constructor(game) {
        this.game = game;
        
        // Weapon definitions
        this.weapons = {
            longsword: {
                name: 'Longsword',
                type: 'sword',
                damage: 30,
                staminaCost: { light: 15, heavy: 30 },
                attackSpeed: 1.0,
                range: 2.5,
                scaling: { strength: 'C', dexterity: 'C' },
                weight: 4,
                description: 'A balanced sword suitable for any warrior'
            },
            greatsword: {
                name: 'Greatsword',
                type: 'greatsword',
                damage: 55,
                staminaCost: { light: 25, heavy: 45 },
                attackSpeed: 0.6,
                range: 3.2,
                scaling: { strength: 'A', dexterity: 'D' },
                weight: 10,
                description: 'A massive blade requiring great strength'
            },
            dagger: {
                name: 'Dagger',
                type: 'dagger',
                damage: 15,
                staminaCost: { light: 8, heavy: 18 },
                attackSpeed: 1.8,
                range: 1.5,
                scaling: { strength: 'E', dexterity: 'A' },
                critMultiplier: 1.5,
                description: 'A swift blade for quick strikes and critical hits'
            },
            battleaxe: {
                name: 'Battle Axe',
                type: 'axe',
                damage: 45,
                staminaCost: { light: 22, heavy: 40 },
                attackSpeed: 0.75,
                range: 2.8,
                scaling: { strength: 'B', dexterity: 'E' },
                weight: 8,
                description: 'A brutal weapon that deals heavy damage'
            },
            spear: {
                name: 'Spear',
                type: 'spear',
                damage: 28,
                staminaCost: { light: 14, heavy: 28 },
                attackSpeed: 0.9,
                range: 4.0,
                scaling: { strength: 'D', dexterity: 'B' },
                weight: 5,
                description: 'Long reach for safe distance combat'
            },
            katana: {
                name: 'Uchigatana',
                type: 'katana',
                damage: 32,
                staminaCost: { light: 16, heavy: 32 },
                attackSpeed: 1.1,
                range: 2.6,
                scaling: { strength: 'D', dexterity: 'A' },
                bleedBuildup: 30,
                weight: 5,
                description: 'A curved blade from the east with bleed effect'
            },
            hammer: {
                name: 'Great Hammer',
                type: 'hammer',
                damage: 60,
                staminaCost: { light: 28, heavy: 50 },
                attackSpeed: 0.5,
                range: 2.5,
                scaling: { strength: 'S', dexterity: 'E' },
                poiseBreak: 80,
                weight: 15,
                description: 'A devastating hammer that shatters poise'
            },
            staff: {
                name: 'Sorcerer Staff',
                type: 'staff',
                damage: 10,
                staminaCost: { light: 10, heavy: 20 },
                attackSpeed: 0.8,
                range: 2.0,
                scaling: { strength: 'E', dexterity: 'E', intelligence: 'A' },
                spellBuff: 1.2,
                weight: 3,
                description: 'A staff that enhances sorcery power'
            }
        };
        
        // Armor definitions
        this.armors = {
            // Head
            knightHelm: {
                name: 'Knight Helm',
                slot: 'head',
                defense: 8,
                weight: 4,
                poise: 6
            },
            leatherCap: {
                name: 'Leather Cap',
                slot: 'head',
                defense: 3,
                weight: 1,
                poise: 2
            },
            // Chest
            knightArmor: {
                name: 'Knight Armor',
                slot: 'chest',
                defense: 20,
                weight: 12,
                poise: 15
            },
            leatherArmor: {
                name: 'Leather Armor',
                slot: 'chest',
                defense: 8,
                weight: 4,
                poise: 5
            },
            sorcererRobe: {
                name: 'Sorcerer Robe',
                slot: 'chest',
                defense: 4,
                weight: 2,
                poise: 2,
                fpBonus: 20
            },
            // Hands
            knightGauntlets: {
                name: 'Knight Gauntlets',
                slot: 'hands',
                defense: 5,
                weight: 3,
                poise: 4
            },
            leatherGloves: {
                name: 'Leather Gloves',
                slot: 'hands',
                defense: 2,
                weight: 1,
                poise: 1
            },
            // Legs
            knightLeggings: {
                name: 'Knight Leggings',
                slot: 'legs',
                defense: 12,
                weight: 8,
                poise: 10
            },
            leatherPants: {
                name: 'Leather Pants',
                slot: 'legs',
                defense: 5,
                weight: 2,
                poise: 3
            }
        };
        
        // Shield definitions
        this.shields = {
            woodenShield: {
                name: 'Wooden Shield',
                stability: 40,
                physicalBlock: 80,
                weight: 3,
                parryWindow: 0.25
            },
            ironShield: {
                name: 'Iron Shield',
                stability: 55,
                physicalBlock: 95,
                weight: 6,
                parryWindow: 0.2
            },
            greatshield: {
                name: 'Greatshield',
                stability: 75,
                physicalBlock: 100,
                weight: 14,
                parryWindow: 0.1
            }
        };
        
        // Player's equipped items
        this.equipped = {
            weapon: 'longsword',
            shield: 'woodenShield',
            head: null,
            chest: 'leatherArmor',
            hands: 'leatherGloves',
            legs: 'leatherPants'
        };
        
        // Weapon meshes
        this.weaponMeshes = {};
        
        // Current weapon index for cycling
        this.availableWeapons = ['longsword', 'greatsword', 'dagger', 'katana'];
        this.weaponIndex = 0;
    }
    
    getEquippedWeapon() {
        return this.weapons[this.equipped.weapon];
    }
    
    getEquippedShield() {
        return this.shields[this.equipped.shield];
    }
    
    getTotalDefense() {
        let defense = 0;
        for (const slot of ['head', 'chest', 'hands', 'legs']) {
            if (this.equipped[slot] && this.armors[this.equipped[slot]]) {
                defense += this.armors[this.equipped[slot]].defense;
            }
        }
        return defense;
    }
    
    getTotalWeight() {
        let weight = 0;
        
        // Weapon weight
        if (this.equipped.weapon && this.weapons[this.equipped.weapon]) {
            weight += this.weapons[this.equipped.weapon].weight || 0;
        }
        
        // Shield weight
        if (this.equipped.shield && this.shields[this.equipped.shield]) {
            weight += this.shields[this.equipped.shield].weight || 0;
        }
        
        // Armor weight
        for (const slot of ['head', 'chest', 'hands', 'legs']) {
            if (this.equipped[slot] && this.armors[this.equipped[slot]]) {
                weight += this.armors[this.equipped[slot]].weight || 0;
            }
        }
        
        return weight;
    }
    
    getTotalPoise() {
        let poise = 0;
        for (const slot of ['head', 'chest', 'hands', 'legs']) {
            if (this.equipped[slot] && this.armors[this.equipped[slot]]) {
                poise += this.armors[this.equipped[slot]].poise || 0;
            }
        }
        return poise;
    }
    
    getEquipLoad(maxEquipLoad) {
        return this.getTotalWeight() / maxEquipLoad;
    }
    
    getRollType(maxEquipLoad) {
        const load = this.getEquipLoad(maxEquipLoad);
        if (load < 0.3) return 'light';
        if (load < 0.7) return 'medium';
        return 'heavy';
    }
    
    calculateWeaponDamage(stats) {
        const weapon = this.getEquippedWeapon();
        if (!weapon) return 0;
        
        let baseDamage = weapon.damage;
        
        // Apply scaling
        if (weapon.scaling) {
            const scalingMultipliers = { S: 0.25, A: 0.18, B: 0.12, C: 0.08, D: 0.04, E: 0.02 };
            
            if (weapon.scaling.strength) {
                const mult = scalingMultipliers[weapon.scaling.strength] || 0;
                baseDamage += (stats.strength - 10) * mult * weapon.damage;
            }
            if (weapon.scaling.dexterity) {
                const mult = scalingMultipliers[weapon.scaling.dexterity] || 0;
                baseDamage += (stats.dexterity - 10) * mult * weapon.damage;
            }
            if (weapon.scaling.intelligence) {
                const mult = scalingMultipliers[weapon.scaling.intelligence] || 0;
                baseDamage += (stats.intelligence - 10) * mult * weapon.damage;
            }
        }
        
        return Math.floor(baseDamage);
    }
    
    equipWeapon(weaponId) {
        if (this.weapons[weaponId]) {
            this.equipped.weapon = weaponId;
            this.updatePlayerWeaponMesh();
            return true;
        }
        return false;
    }
    
    cycleWeapon() {
        this.weaponIndex = (this.weaponIndex + 1) % this.availableWeapons.length;
        const newWeapon = this.availableWeapons[this.weaponIndex];
        this.equipWeapon(newWeapon);
        
        // Show notification
        const weapon = this.getEquippedWeapon();
        if (this.game.hud && this.game.hud.showMessage) {
            this.game.hud.showMessage(`Equipped: ${weapon.name}`, 1500);
        }
        
        return newWeapon;
    }
    
    updatePlayerWeaponMesh() {
        const player = this.game.player;
        if (!player || !player.mesh) return;
        
        // Remove old weapon mesh
        if (player.weaponMesh) {
            player.mesh.remove(player.weaponMesh);
        }
        
        // Create new weapon mesh based on type
        const weapon = this.getEquippedWeapon();
        const weaponGroup = new THREE.Group();
        
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            roughness: 0.3,
            metalness: 0.9
        });
        
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3020,
            roughness: 0.8
        });
        
        switch (weapon.type) {
            case 'sword':
                this.createSwordMesh(weaponGroup, bladeMaterial, handleMaterial, 1.0);
                break;
            case 'greatsword':
                this.createSwordMesh(weaponGroup, bladeMaterial, handleMaterial, 1.8);
                break;
            case 'dagger':
                this.createDaggerMesh(weaponGroup, bladeMaterial, handleMaterial);
                break;
            case 'katana':
                this.createKatanaMesh(weaponGroup, bladeMaterial, handleMaterial);
                break;
            case 'axe':
                this.createAxeMesh(weaponGroup, bladeMaterial, handleMaterial);
                break;
            case 'spear':
                this.createSpearMesh(weaponGroup, bladeMaterial, handleMaterial);
                break;
            case 'hammer':
                this.createHammerMesh(weaponGroup, bladeMaterial, handleMaterial);
                break;
            case 'staff':
                this.createStaffMesh(weaponGroup);
                break;
            default:
                this.createSwordMesh(weaponGroup, bladeMaterial, handleMaterial, 1.0);
        }
        
        weaponGroup.position.set(0.6, 1, 0);
        weaponGroup.rotation.z = -0.5;
        
        player.weaponMesh = weaponGroup;
        player.mesh.add(weaponGroup);
    }
    
    createSwordMesh(group, bladeMaterial, handleMaterial, scale) {
        // Blade
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.08 * scale, 1.2 * scale, 0.02),
            bladeMaterial
        );
        blade.position.y = 0.6 * scale;
        blade.castShadow = true;
        group.add(blade);
        
        // Handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.25 * scale, 8),
            handleMaterial
        );
        handle.position.y = -0.1;
        group.add(handle);
        
        // Crossguard
        const guard = new THREE.Mesh(
            new THREE.BoxGeometry(0.25 * scale, 0.04, 0.04),
            bladeMaterial
        );
        guard.position.y = 0.02;
        group.add(guard);
    }
    
    createDaggerMesh(group, bladeMaterial, handleMaterial) {
        // Short blade
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.5, 0.015),
            bladeMaterial
        );
        blade.position.y = 0.25;
        blade.castShadow = true;
        group.add(blade);
        
        // Handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8),
            handleMaterial
        );
        handle.position.y = -0.05;
        group.add(handle);
    }
    
    createKatanaMesh(group, bladeMaterial, handleMaterial) {
        // Curved blade (approximated with a box)
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 1.1, 0.015),
            bladeMaterial
        );
        blade.position.y = 0.55;
        blade.rotation.z = 0.05; // Slight curve
        blade.castShadow = true;
        group.add(blade);
        
        // Long handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8),
            handleMaterial
        );
        handle.position.y = -0.12;
        group.add(handle);
        
        // Circular guard
        const guard = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16),
            bladeMaterial
        );
        guard.position.y = 0.02;
        guard.rotation.x = Math.PI / 2;
        group.add(guard);
    }
    
    createAxeMesh(group, bladeMaterial, handleMaterial) {
        // Handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.04, 1.2, 8),
            handleMaterial
        );
        handle.position.y = 0.3;
        group.add(handle);
        
        // Axe head
        const axeHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.3, 0.05),
            bladeMaterial
        );
        axeHead.position.set(0.15, 0.85, 0);
        axeHead.castShadow = true;
        group.add(axeHead);
    }
    
    createSpearMesh(group, bladeMaterial, handleMaterial) {
        // Long handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.03, 2.0, 8),
            handleMaterial
        );
        handle.position.y = 0.5;
        group.add(handle);
        
        // Spear tip
        const tip = new THREE.Mesh(
            new THREE.ConeGeometry(0.06, 0.3, 8),
            bladeMaterial
        );
        tip.position.y = 1.65;
        tip.castShadow = true;
        group.add(tip);
    }
    
    createHammerMesh(group, bladeMaterial, handleMaterial) {
        // Handle
        const handle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 1.4, 8),
            handleMaterial
        );
        handle.position.y = 0.4;
        group.add(handle);
        
        // Hammer head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.35, 0.35),
            new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.6,
                metalness: 0.7
            })
        );
        head.position.y = 1.1;
        head.castShadow = true;
        group.add(head);
    }
    
    createStaffMesh(group) {
        const woodMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 0.9
        });
        
        const crystalMaterial = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x4488ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        // Staff body
        const staff = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.04, 1.5, 8),
            woodMaterial
        );
        staff.position.y = 0.5;
        group.add(staff);
        
        // Crystal top
        const crystal = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.15, 0),
            crystalMaterial
        );
        crystal.position.y = 1.35;
        group.add(crystal);
    }
}
