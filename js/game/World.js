/**
 * World.js - Terrain and Environment Generation
 * Creates seamless open world with varied terrain
 */

import * as THREE from 'three';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Terrain settings
        this.worldSize = 500;
        this.terrainSegments = 128;
        this.heightScale = 30;
        
        // Terrain data
        this.terrain = null;
        this.heightMap = [];
        
        // Environment objects
        this.trees = [];
        this.rocks = [];
        this.structures = [];
        
        // Biome colors
        this.biomes = {
            plains: 0x3d5c3d,
            forest: 0x2d4a2d,
            mountain: 0x5c5c5c,
            swamp: 0x3d4a3d,
            ruins: 0x4a4a4a
        };
    }
    
    generate() {
        this.generateTerrain();
        this.generateTrees();
        this.generateRocks();
        this.generateRuins();
        this.generateDecorations();
        this.createSkybox();
    }
    
    generateTerrain() {
        // Generate height map using Perlin-like noise
        this.generateHeightMap();
        
        // Create terrain geometry
        const geometry = new THREE.PlaneGeometry(
            this.worldSize,
            this.worldSize,
            this.terrainSegments,
            this.terrainSegments
        );
        
        // Apply height map to vertices
        const positions = geometry.attributes.position.array;
        const colors = [];
        
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 1];
            
            // Get height from height map with safety clamp
            const height = this.sampleHeightMap(x, z);
            const safeHeight = Number.isFinite(height) ? Math.max(-5, Math.min(50, height)) : 0;
            positions[i + 2] = safeHeight;
            
            // Assign colors based on height/biome
            const color = this.getBiomeColor(safeHeight, x, z);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        // Create terrain material
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false
        });
        
        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = false;
        this.scene.add(this.terrain);
    }
    
    generateHeightMap() {
        const size = this.terrainSegments + 1;
        this.heightMap = new Array(size);
        
        // Define height bounds for stability
        const minHeight = -5;
        const maxHeight = 50;
        
        for (let i = 0; i < size; i++) {
            this.heightMap[i] = new Array(size);
            for (let j = 0; j < size; j++) {
                // Multi-octave noise for natural terrain
                const x = (i / size) * 10;
                const y = (j / size) * 10;
                
                let height = 0;
                height += this.noise(x * 0.5, y * 0.5) * 1.0;
                height += this.noise(x * 1, y * 1) * 0.5;
                height += this.noise(x * 2, y * 2) * 0.25;
                height += this.noise(x * 4, y * 4) * 0.125;
                
                // Add some variation for interesting terrain
                const distFromCenter = Math.sqrt(
                    Math.pow((i - size/2) / (size/2), 2) + 
                    Math.pow((j - size/2) / (size/2), 2)
                );
                
                // Create mountains at edges
                if (distFromCenter > 0.7) {
                    height += (distFromCenter - 0.7) * 30;
                }
                
                // Create a valley in the starting area
                if (distFromCenter < 0.15) {
                    height *= 0.3;
                }
                
                // Apply height scale and clamp to prevent extreme values
                const finalHeight = height * this.heightScale;
                this.heightMap[i][j] = Math.max(minHeight, Math.min(maxHeight, finalHeight));
            }
        }
    }
    
    // Simple noise function with clamping for stability
    noise(x, y) {
        // Clamp input values to prevent floating point issues
        const clampedX = Math.max(-1000, Math.min(1000, x));
        const clampedY = Math.max(-1000, Math.min(1000, y));
        const n = Math.sin(clampedX * 12.9898 + clampedY * 78.233) * 43758.5453;
        const result = (n - Math.floor(n)) * 2 - 1;
        // Clamp output to [-1, 1] for stability
        return Math.max(-1, Math.min(1, result));
    }
    
    sampleHeightMap(worldX, worldZ) {
        // Validate input coordinates
        if (!Number.isFinite(worldX) || !Number.isFinite(worldZ)) {
            return 0;
        }
        
        // Convert world coordinates to heightmap indices
        const size = this.terrainSegments + 1;
        const i = ((worldX / this.worldSize) + 0.5) * (size - 1);
        const j = ((worldZ / this.worldSize) + 0.5) * (size - 1);
        
        // Clamp indices to valid range
        const i0 = Math.max(0, Math.min(size - 2, Math.floor(i)));
        const j0 = Math.max(0, Math.min(size - 2, Math.floor(j)));
        const i1 = Math.min(i0 + 1, size - 1);
        const j1 = Math.min(j0 + 1, size - 1);
        
        // Clamp interpolation factors to [0, 1]
        const fi = Math.max(0, Math.min(1, i - i0));
        const fj = Math.max(0, Math.min(1, j - j0));
        
        // Safety check for heightMap existence
        if (!this.heightMap || !this.heightMap[i0] || !this.heightMap[i1]) {
            return 0;
        }
        
        // Get heights with fallback to 0
        const h00 = this.heightMap[i0][j0] ?? 0;
        const h10 = this.heightMap[i1][j0] ?? 0;
        const h01 = this.heightMap[i0][j1] ?? 0;
        const h11 = this.heightMap[i1][j1] ?? 0;
        
        // Validate all heights are finite numbers
        if (!Number.isFinite(h00) || !Number.isFinite(h10) || 
            !Number.isFinite(h01) || !Number.isFinite(h11)) {
            return 0;
        }
        
        const h0 = h00 * (1 - fi) + h10 * fi;
        const h1 = h01 * (1 - fi) + h11 * fi;
        
        const result = h0 * (1 - fj) + h1 * fj;
        
        // Final safety clamp to prevent extreme values
        return Number.isFinite(result) ? Math.max(-5, Math.min(50, result)) : 0;
    }
    
    getHeightAt(x, z) {
        return this.sampleHeightMap(x, z);
    }
    
    getBiomeColor(height, x, z) {
        const color = new THREE.Color();
        
        if (height < 2) {
            // Low areas - swamp/grass
            color.setHex(0x4a5a3a);
        } else if (height < 8) {
            // Plains
            color.setHex(0x4a6a3a);
        } else if (height < 15) {
            // Hills/forest
            color.setHex(0x3a5a2a);
        } else if (height < 25) {
            // Mountain base
            color.setHex(0x5a5a5a);
        } else {
            // Mountain peaks
            color.setHex(0x8a8a8a);
        }
        
        // Add some noise for variety
        const noise = this.noise(x * 0.1, z * 0.1) * 0.1;
        color.r = Math.max(0, Math.min(1, color.r + noise));
        color.g = Math.max(0, Math.min(1, color.g + noise));
        color.b = Math.max(0, Math.min(1, color.b + noise));
        
        return color;
    }
    
    generateTrees() {
        const treeCount = 200;
        
        for (let i = 0; i < treeCount; i++) {
            const x = (Math.random() - 0.5) * this.worldSize * 0.8;
            const z = (Math.random() - 0.5) * this.worldSize * 0.8;
            const y = this.getHeightAt(x, z);
            
            // Don't place trees on steep slopes or very high areas
            if (y > 20 || y < 1) continue;
            
            this.createTree(x, y, z);
        }
    }
    
    createTree(x, y, z) {
        const group = new THREE.Group();
        
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a3728,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Foliage - multiple cones for fuller look
        const foliageMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a2d,
            roughness: 0.8
        });
        
        const foliage1 = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, 4, 8),
            foliageMaterial
        );
        foliage1.position.y = 5;
        foliage1.castShadow = true;
        group.add(foliage1);
        
        const foliage2 = new THREE.Mesh(
            new THREE.ConeGeometry(2, 3, 8),
            foliageMaterial
        );
        foliage2.position.y = 7;
        foliage2.castShadow = true;
        group.add(foliage2);
        
        const foliage3 = new THREE.Mesh(
            new THREE.ConeGeometry(1.5, 2.5, 8),
            foliageMaterial
        );
        foliage3.position.y = 8.5;
        foliage3.castShadow = true;
        group.add(foliage3);
        
        // Random rotation and scale
        group.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.7 + Math.random() * 0.6;
        group.scale.set(scale, scale, scale);
        
        group.position.set(x, y, z);
        this.scene.add(group);
        this.trees.push(group);
    }
    
    generateRocks() {
        const rockCount = 150;
        
        for (let i = 0; i < rockCount; i++) {
            const x = (Math.random() - 0.5) * this.worldSize * 0.9;
            const z = (Math.random() - 0.5) * this.worldSize * 0.9;
            const y = this.getHeightAt(x, z);
            
            this.createRock(x, y, z);
        }
    }
    
    createRock(x, y, z) {
        const geometry = new THREE.DodecahedronGeometry(
            0.5 + Math.random() * 2,
            0
        );
        
        // Deform slightly for natural look
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += (Math.random() - 0.5) * 0.3;
            positions[i + 1] += (Math.random() - 0.5) * 0.3;
            positions[i + 2] += (Math.random() - 0.5) * 0.3;
        }
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            color: 0x5a5a5a + Math.random() * 0x202020,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set(x, y + 0.5, z);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        this.scene.add(rock);
        this.rocks.push(rock);
    }
    
    generateRuins() {
        // Create some ruined structures for atmosphere
        const ruinLocations = [
            { x: 40, z: 40 },
            { x: -50, z: 30 },
            { x: 30, z: -60 },
            { x: -40, z: -50 },
            { x: 70, z: 70 }  // Boss arena
        ];
        
        ruinLocations.forEach((loc, index) => {
            const y = this.getHeightAt(loc.x, loc.z);
            this.createRuin(loc.x, y, loc.z, index === 4);
        });
    }
    
    createRuin(x, y, z, isBossArena = false) {
        const group = new THREE.Group();
        
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a6a6a,
            roughness: 0.95,
            metalness: 0.05
        });
        
        if (isBossArena) {
            // Create a circular boss arena
            const floorGeometry = new THREE.CylinderGeometry(25, 25, 0.5, 32);
            const floor = new THREE.Mesh(floorGeometry, stoneMaterial);
            floor.position.y = 0.25;
            floor.receiveShadow = true;
            group.add(floor);
            
            // Pillars around arena
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const pillarX = Math.cos(angle) * 22;
                const pillarZ = Math.sin(angle) * 22;
                
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(1, 1.2, 8, 8),
                    stoneMaterial
                );
                pillar.position.set(pillarX, 4, pillarZ);
                pillar.castShadow = true;
                
                // Some pillars are broken
                if (Math.random() > 0.5) {
                    pillar.scale.y = 0.3 + Math.random() * 0.5;
                    pillar.position.y *= pillar.scale.y;
                }
                
                group.add(pillar);
            }
        } else {
            // Regular ruins - scattered walls and pillars
            const wallCount = 3 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < wallCount; i++) {
                const wallWidth = 2 + Math.random() * 6;
                const wallHeight = 2 + Math.random() * 4;
                
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(wallWidth, wallHeight, 0.8),
                    stoneMaterial
                );
                
                wall.position.set(
                    (Math.random() - 0.5) * 15,
                    wallHeight / 2,
                    (Math.random() - 0.5) * 15
                );
                wall.rotation.y = Math.random() * Math.PI;
                wall.castShadow = true;
                wall.receiveShadow = true;
                
                group.add(wall);
            }
            
            // Add some broken pillars
            for (let i = 0; i < 3; i++) {
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.6, 1 + Math.random() * 3, 8),
                    stoneMaterial
                );
                pillar.position.set(
                    (Math.random() - 0.5) * 12,
                    pillar.geometry.parameters.height / 2,
                    (Math.random() - 0.5) * 12
                );
                pillar.castShadow = true;
                group.add(pillar);
            }
        }
        
        group.position.set(x, y, z);
        this.scene.add(group);
        this.structures.push(group);
    }
    
    generateDecorations() {
        // Add grass patches, small plants, etc.
        const grassCount = 500;
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a7a3a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < grassCount; i++) {
            const x = (Math.random() - 0.5) * this.worldSize * 0.8;
            const z = (Math.random() - 0.5) * this.worldSize * 0.8;
            const y = this.getHeightAt(x, z);
            
            if (y > 18) continue; // No grass on mountains
            
            // Simple grass blade
            const grass = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 0.5 + Math.random() * 0.3),
                grassMaterial
            );
            grass.position.set(x, y + 0.25, z);
            grass.rotation.y = Math.random() * Math.PI;
            this.scene.add(grass);
        }
    }
    
    createSkybox() {
        // Simple gradient skybox using a large sphere
        const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x1a1a2e) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        this.sky = sky;
    }
    
    // Check collision with world objects
    checkCollision(position, radius) {
        // Check against rocks and structures
        for (const rock of this.rocks) {
            const dist = position.distanceTo(rock.position);
            if (dist < radius + 1) {
                return true;
            }
        }
        
        for (const tree of this.trees) {
            const dist = Math.sqrt(
                Math.pow(position.x - tree.position.x, 2) +
                Math.pow(position.z - tree.position.z, 2)
            );
            if (dist < radius + 0.5) {
                return true;
            }
        }
        
        return false;
    }
}
