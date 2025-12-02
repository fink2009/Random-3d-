/**
 * World.js - Terrain and Environment Generation
 * Creates seamless open world with varied terrain
 * PERFORMANCE OPTIMIZED: Uses instanced meshes and height caching
 */

import * as THREE from 'three';

export class World {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Terrain settings - use quality settings if available
        this.worldSize = 500;
        const settings = game.settings || {};
        this.terrainSegments = settings.terrainSegments || 16; // Default to 16 for potato mode
        this.heightScale = 20; // Reduced for smoother terrain
        
        console.log(`World: Terrain segments set to ${this.terrainSegments}`);
        
        // Height bounds for terrain stability - more conservative range
        this.minHeight = -2;
        this.maxHeight = 40;
        
        // Noise function input bounds to prevent floating point issues
        this.minNoiseInput = -1000;
        this.maxNoiseInput = 1000;
        
        // Edge falloff settings for smooth boundaries
        this.edgeFalloffStart = 0.7; // Start fading at 70% from center
        this.edgeFalloffEnd = 0.95;   // Fully faded at 95% from center
        this.edgeMinHeight = 0;       // Height at world edges
        
        // Boundary buffer distance from world edge
        this.boundaryBuffer = 10;
        
        // Terrain data
        this.terrain = null;
        this.heightMap = [];
        
        // Height cache for performance optimization
        this.heightCache = new Map();
        this.heightCacheMaxSize = 10000;
        // Cache precision: higher value = more cache hits but less precision
        this.heightCachePrecision = 2;
        
        // Environment objects - now using instanced meshes
        this.trees = [];
        this.rocks = [];
        this.structures = [];
        
        // Instanced meshes for performance
        this.instancedTrees = null;
        this.instancedRocks = null;
        this.instancedGrass = null;
        
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
        this.generateInstancedTrees();
        this.generateInstancedRocks();
        this.generateRuins();
        this.generateInstancedGrass();
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
            const geomY = positions[i + 1];
            
            // After mesh rotation (rotation.x = -PI/2), the geometry Y becomes -worldZ
            // So we need to sample the height at world coordinates (x, -geomY)
            // This ensures terrain heights match what getHeightAt() returns for the same world position
            const worldZ = -geomY;
            
            // Get height from height map with safety clamp
            const height = this.sampleHeightMap(x, worldZ);
            const safeHeight = Number.isFinite(height) ? Math.max(this.minHeight, Math.min(this.maxHeight, height)) : 0;
            positions[i + 2] = safeHeight;
            
            // Assign colors based on height/biome (use world coordinates)
            const color = this.getBiomeColor(safeHeight, x, worldZ);
            colors.push(color.r, color.g, color.b);
        }
        
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        // Mark position attribute as needing update after modification
        geometry.attributes.position.needsUpdate = true;
        
        geometry.computeVertexNormals();
        
        // Create terrain material - use Basic for potato mode (no lighting calculations)
        const settings = this.game.settings || {};
        const useBasicMaterial = !settings.useLambertMaterial && settings.lightingSimplified;
        
        const material = useBasicMaterial 
            ? new THREE.MeshBasicMaterial({
                vertexColors: true,
                side: THREE.DoubleSide
            })
            : new THREE.MeshLambertMaterial({
                vertexColors: true,
                flatShading: false,
                side: THREE.DoubleSide
            });
        
        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        // Only receive shadows if enabled in settings
        this.terrain.receiveShadow = this.game.settings?.shadowsEnabled !== false;
        this.terrain.castShadow = false;
        this.scene.add(this.terrain);
    }
    
    generateHeightMap() {
        const size = this.terrainSegments + 1;
        this.heightMap = new Array(size);
        
        for (let i = 0; i < size; i++) {
            this.heightMap[i] = new Array(size);
            for (let j = 0; j < size; j++) {
                // Multi-octave noise for natural terrain with reduced amplitude
                const x = (i / size) * 8; // Reduced frequency for smoother terrain
                const y = (j / size) * 8;
                
                // Use smoothed noise with reduced octaves
                let height = 0;
                height += this.smoothNoise(x * 0.3, y * 0.3) * 1.0;  // Base terrain
                height += this.smoothNoise(x * 0.6, y * 0.6) * 0.4;  // Medium detail
                height += this.smoothNoise(x * 1.2, y * 1.2) * 0.15; // Fine detail (reduced)
                
                // Calculate distance from center for edge handling
                const normI = (i - size/2) / (size/2);
                const normJ = (j - size/2) / (size/2);
                const distFromCenter = Math.sqrt(normI * normI + normJ * normJ);
                
                // Create gentle hills at edges instead of sharp mountains
                if (distFromCenter > 0.6) {
                    const edgeInfluence = (distFromCenter - 0.6) / 0.4;
                    height += edgeInfluence * edgeInfluence * 15; // Smoother quadratic rise
                }
                
                // Create a flat starting area in center
                if (distFromCenter < 0.12) {
                    const centerFactor = 1 - (distFromCenter / 0.12);
                    height *= (1 - centerFactor * 0.8); // Flatten center
                }
                
                // Apply edge falloff for seamless boundaries
                let edgeFalloff = 1.0;
                if (distFromCenter > this.edgeFalloffStart) {
                    const falloffProgress = (distFromCenter - this.edgeFalloffStart) / 
                                           (this.edgeFalloffEnd - this.edgeFalloffStart);
                    // Use smooth step for gradual transition
                    edgeFalloff = 1.0 - this.smoothStep(0, 1, Math.min(falloffProgress, 1));
                }
                
                // Apply height scale with edge falloff
                const finalHeight = height * this.heightScale * edgeFalloff + 
                                   this.edgeMinHeight * (1 - edgeFalloff);
                
                // Clamp to safe range
                this.heightMap[i][j] = Math.max(this.minHeight, Math.min(this.maxHeight, finalHeight));
            }
        }
        
        // Apply smoothing pass to eliminate any remaining spikes
        this.smoothHeightMap();
    }
    
    // Smooth step function for gradual transitions
    smoothStep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }
    
    // Smoothing pass to reduce terrain spikes
    smoothHeightMap() {
        const size = this.terrainSegments + 1;
        const smoothed = new Array(size);
        
        for (let i = 0; i < size; i++) {
            smoothed[i] = new Array(size);
            for (let j = 0; j < size; j++) {
                // Average with neighbors for smoother terrain
                let sum = this.heightMap[i][j];
                let count = 1;
                
                // Sample neighboring points
                const neighbors = [
                    [i-1, j], [i+1, j], [i, j-1], [i, j+1],
                    [i-1, j-1], [i+1, j+1], [i-1, j+1], [i+1, j-1]
                ];
                
                for (const [ni, nj] of neighbors) {
                    if (ni >= 0 && ni < size && nj >= 0 && nj < size) {
                        sum += this.heightMap[ni][nj];
                        count++;
                    }
                }
                
                smoothed[i][j] = sum / count;
            }
        }
        
        // Apply smoothed values
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                this.heightMap[i][j] = smoothed[i][j];
            }
        }
    }
    
    // Simple noise function with clamping for stability
    noise(x, y) {
        // Clamp input values to prevent floating point issues
        const clampedX = Math.max(this.minNoiseInput, Math.min(this.maxNoiseInput, x));
        const clampedY = Math.max(this.minNoiseInput, Math.min(this.maxNoiseInput, y));
        const n = Math.sin(clampedX * 12.9898 + clampedY * 78.233) * 43758.5453;
        const result = (n - Math.floor(n)) * 2 - 1;
        // Clamp output to [-1, 1] for stability
        return Math.max(-1, Math.min(1, result));
    }
    
    // Smoother noise using interpolation between sample points
    smoothNoise(x, y) {
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const fx = x - x0;
        const fy = y - y0;
        
        // Sample at integer positions
        const n00 = this.noise(x0, y0);
        const n10 = this.noise(x0 + 1, y0);
        const n01 = this.noise(x0, y0 + 1);
        const n11 = this.noise(x0 + 1, y0 + 1);
        
        // Use smooth interpolation (cosine-like curve)
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        
        // Bilinear interpolation
        const nx0 = n00 * (1 - sx) + n10 * sx;
        const nx1 = n01 * (1 - sx) + n11 * sx;
        
        return nx0 * (1 - sy) + nx1 * sy;
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
        return Number.isFinite(result) ? Math.max(this.minHeight, Math.min(this.maxHeight, result)) : 0;
    }
    
    getHeightAt(x, z) {
        // Use cached height lookup for performance
        const precision = this.heightCachePrecision;
        const key = `${Math.floor(x * precision)},${Math.floor(z * precision)}`;
        
        if (this.heightCache.has(key)) {
            return this.heightCache.get(key);
        }
        
        const height = this.sampleHeightMap(x, z);
        
        // Cache the result, limiting cache size
        if (this.heightCache.size >= this.heightCacheMaxSize) {
            // Remove oldest entry (first key)
            const firstKey = this.heightCache.keys().next().value;
            this.heightCache.delete(firstKey);
        }
        this.heightCache.set(key, height);
        
        return height;
    }
    
    // Clear height cache (useful when terrain changes)
    clearHeightCache() {
        this.heightCache.clear();
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
    
    /**
     * PERFORMANCE: Generate trees using instanced meshes (single draw call)
     */
    generateInstancedTrees() {
        // Use tree count from quality settings
        const settings = this.game.settings || {};
        const treeCount = settings.maxTrees || 15;
        const treeDetail = settings.treeDetail || 4;
        const useBasicMaterial = !settings.useLambertMaterial && settings.lightingSimplified;
        
        // Create shared geometries for tree parts
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, Math.max(4, treeDetail));
        const trunkMaterial = useBasicMaterial
            ? new THREE.MeshBasicMaterial({ color: 0x4a3728 })
            : new THREE.MeshLambertMaterial({ color: 0x4a3728 });
        
        const foliageGeometry = new THREE.ConeGeometry(2, 5, treeDetail);
        const foliageMaterial = useBasicMaterial
            ? new THREE.MeshBasicMaterial({ color: 0x2d5a2d })
            : new THREE.MeshLambertMaterial({ color: 0x2d5a2d });
        
        // Create instanced meshes
        this.instancedTreeTrunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
        this.instancedTreeFoliage = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, treeCount);
        
        // Only cast shadows if enabled in settings
        const shadowsEnabled = this.game.settings?.shadowsEnabled !== false;
        this.instancedTreeTrunks.castShadow = shadowsEnabled;
        this.instancedTreeFoliage.castShadow = shadowsEnabled;
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        
        let instanceIndex = 0;
        let attempts = 0;
        const maxAttempts = treeCount * 3;
        
        while (instanceIndex < treeCount && attempts < maxAttempts) {
            attempts++;
            const x = (Math.random() - 0.5) * this.worldSize * 0.8;
            const z = (Math.random() - 0.5) * this.worldSize * 0.8;
            const y = this.getHeightAt(x, z);
            
            // Don't place trees on steep slopes or very high areas
            if (y > 20 || y < 1) continue;
            
            const rotY = Math.random() * Math.PI * 2;
            const treeScale = 0.7 + Math.random() * 0.6;
            
            // Set trunk transform
            position.set(x, y + 2 * treeScale, z);
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
            scale.set(treeScale, treeScale, treeScale);
            matrix.compose(position, quaternion, scale);
            this.instancedTreeTrunks.setMatrixAt(instanceIndex, matrix);
            
            // Set foliage transform
            position.set(x, y + 6 * treeScale, z);
            matrix.compose(position, quaternion, scale);
            this.instancedTreeFoliage.setMatrixAt(instanceIndex, matrix);
            
            // Store position for collision detection
            this.trees.push({ position: new THREE.Vector3(x, y, z) });
            
            instanceIndex++;
        }
        
        // Update instance count to actual number placed
        this.instancedTreeTrunks.count = instanceIndex;
        this.instancedTreeFoliage.count = instanceIndex;
        
        this.instancedTreeTrunks.instanceMatrix.needsUpdate = true;
        this.instancedTreeFoliage.instanceMatrix.needsUpdate = true;
        
        this.scene.add(this.instancedTreeTrunks);
        this.scene.add(this.instancedTreeFoliage);
    }
    
    /**
     * PERFORMANCE: Generate rocks using instanced meshes (single draw call)
     */
    generateInstancedRocks() {
        // Use rock count from quality settings
        const settings = this.game.settings || {};
        const rockCount = settings.maxRocks || 10;
        const useBasicMaterial = !settings.useLambertMaterial && settings.lightingSimplified;
        
        // Create shared geometry for rocks
        const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
        const rockMaterial = useBasicMaterial
            ? new THREE.MeshBasicMaterial({ color: 0x5a5a5a })
            : new THREE.MeshLambertMaterial({ color: 0x5a5a5a });
        
        this.instancedRocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
        
        // Only cast shadows if enabled in settings
        const shadowsEnabled = this.game.settings?.shadowsEnabled !== false;
        this.instancedRocks.castShadow = shadowsEnabled;
        this.instancedRocks.receiveShadow = shadowsEnabled;
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const euler = new THREE.Euler();
        
        for (let i = 0; i < rockCount; i++) {
            const x = (Math.random() - 0.5) * this.worldSize * 0.9;
            const z = (Math.random() - 0.5) * this.worldSize * 0.9;
            const y = this.getHeightAt(x, z);
            
            const rockScale = 0.5 + Math.random() * 2;
            
            position.set(x, y + rockScale * 0.5, z);
            euler.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            quaternion.setFromEuler(euler);
            scale.set(rockScale, rockScale * 0.7, rockScale);
            
            matrix.compose(position, quaternion, scale);
            this.instancedRocks.setMatrixAt(i, matrix);
            
            // Store position for collision detection
            this.rocks.push({ position: new THREE.Vector3(x, y, z) });
        }
        
        this.instancedRocks.instanceMatrix.needsUpdate = true;
        this.scene.add(this.instancedRocks);
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
        // Use simpler material for potato mode
        const settings = this.game.settings || {};
        const useBasicMaterial = !settings.useLambertMaterial && settings.lightingSimplified;
        
        const stoneMaterial = useBasicMaterial
            ? new THREE.MeshBasicMaterial({ color: 0x6a6a6a })
            : new THREE.MeshLambertMaterial({ color: 0x6a6a6a });
        
        if (isBossArena) {
            // Boss arena - no separate floor, use terrain as ground
            // Place pillars directly at terrain heights for proper grounding
            
            // Pillars around arena - placed individually on terrain
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const pillarX = x + Math.cos(angle) * 22;
                const pillarZ = z + Math.sin(angle) * 22;
                const pillarY = this.getHeightAt(pillarX, pillarZ);
                
                const pillarHeight = 8;
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(1, 1.2, pillarHeight, 8),
                    stoneMaterial
                );
                
                // Some pillars are broken - scale them down
                let scaleY = 1;
                if (Math.random() > 0.5) {
                    scaleY = 0.3 + Math.random() * 0.5;
                    pillar.scale.y = scaleY;
                }
                
                // Position pillar at terrain height
                // Center of scaled pillar is at (pillarHeight * scaleY) / 2
                pillar.position.set(pillarX, pillarY + (pillarHeight * scaleY) / 2, pillarZ);
                pillar.castShadow = true;
                
                this.scene.add(pillar);
                this.structures.push(pillar);
            }
        } else {
            // Regular ruins - place walls and pillars directly at terrain heights
            const wallCount = 3 + Math.floor(Math.random() * 4);
            
            for (let i = 0; i < wallCount; i++) {
                const wallWidth = 2 + Math.random() * 6;
                const wallHeight = 2 + Math.random() * 4;
                
                // Calculate world position for this wall
                const wallOffsetX = (Math.random() - 0.5) * 15;
                const wallOffsetZ = (Math.random() - 0.5) * 15;
                const wallX = x + wallOffsetX;
                const wallZ = z + wallOffsetZ;
                const wallY = this.getHeightAt(wallX, wallZ);
                
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(wallWidth, wallHeight, 0.8),
                    stoneMaterial
                );
                
                wall.position.set(wallX, wallY + wallHeight / 2, wallZ);
                wall.rotation.y = Math.random() * Math.PI;
                wall.castShadow = true;
                wall.receiveShadow = true;
                
                this.scene.add(wall);
                this.structures.push(wall);
            }
            
            // Add some broken pillars
            for (let i = 0; i < 3; i++) {
                const pillarHeight = 1 + Math.random() * 3;
                
                // Calculate world position for this pillar
                const pillarOffsetX = (Math.random() - 0.5) * 12;
                const pillarOffsetZ = (Math.random() - 0.5) * 12;
                const pillarX = x + pillarOffsetX;
                const pillarZ = z + pillarOffsetZ;
                const pillarY = this.getHeightAt(pillarX, pillarZ);
                
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.6, pillarHeight, 8),
                    stoneMaterial
                );
                pillar.position.set(pillarX, pillarY + pillarHeight / 2, pillarZ);
                pillar.castShadow = true;
                
                this.scene.add(pillar);
                this.structures.push(pillar);
            }
        }
    }
    
    /**
     * PERFORMANCE: Generate grass using instanced meshes (single draw call)
     */
    generateInstancedGrass() {
        // Get grass count from quality settings
        const settings = this.game.settings || {};
        const grassCount = settings.maxGrass || settings.environmentParticles || 50;
        const useBasicMaterial = !settings.useLambertMaterial && settings.lightingSimplified;
        
        // Create shared geometry and material for grass
        const grassGeometry = new THREE.PlaneGeometry(0.3, 0.5);
        const grassMaterial = useBasicMaterial
            ? new THREE.MeshBasicMaterial({ color: 0x4a7a3a, side: THREE.DoubleSide })
            : new THREE.MeshLambertMaterial({ color: 0x4a7a3a, side: THREE.DoubleSide });
        
        this.instancedGrass = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
        this.instancedGrass.castShadow = false; // Grass doesn't cast shadows for performance
        this.instancedGrass.receiveShadow = false;
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        
        let instanceIndex = 0;
        let attempts = 0;
        const maxAttempts = grassCount * 2;
        
        while (instanceIndex < grassCount && attempts < maxAttempts) {
            attempts++;
            const x = (Math.random() - 0.5) * this.worldSize * 0.8;
            const z = (Math.random() - 0.5) * this.worldSize * 0.8;
            const y = this.getHeightAt(x, z);
            
            if (y > 18) continue; // No grass on mountains
            
            const grassHeight = 1 + Math.random() * 0.6;
            const rotY = Math.random() * Math.PI;
            
            position.set(x, y + 0.25 * grassHeight, z);
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
            scale.set(1, grassHeight, 1);
            
            matrix.compose(position, quaternion, scale);
            this.instancedGrass.setMatrixAt(instanceIndex, matrix);
            
            instanceIndex++;
        }
        
        this.instancedGrass.count = instanceIndex;
        this.instancedGrass.instanceMatrix.needsUpdate = true;
        this.scene.add(this.instancedGrass);
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
    
    // Check collision with world objects and boundaries
    checkCollision(position, radius) {
        // Check world boundaries - prevent going to edge
        const boundaryLimit = this.worldSize / 2 - this.boundaryBuffer;
        if (Math.abs(position.x) > boundaryLimit || Math.abs(position.z) > boundaryLimit) {
            return true;
        }
        
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
    
    // Check if position is within safe world bounds
    isWithinBounds(x, z) {
        const bound = this.worldSize / 2 - this.boundaryBuffer;
        return Math.abs(x) < bound && Math.abs(z) < bound;
    }
    
    // Get clamped position within world bounds
    clampToWorldBounds(x, z) {
        const bound = this.worldSize / 2 - this.boundaryBuffer;
        return {
            x: Math.max(-bound, Math.min(bound, x)),
            z: Math.max(-bound, Math.min(bound, z))
        };
    }
    
    // Get the boundary limit distance from center
    getBoundaryLimit() {
        return this.worldSize / 2 - this.boundaryBuffer;
    }
}
