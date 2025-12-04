#!/usr/bin/env node
/**
 * Build script for production bundle
 * Copies files and creates optimized dist directory
 */

import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

// Clean dist directory
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

console.log('Building distribution...');

console.log('Copying static files...');

// Copy service worker
const swSrc = join(rootDir, 'sw.js');
const swDest = join(distDir, 'sw.js');
if (existsSync(swSrc)) {
  copyFileSync(swSrc, swDest);
  console.log('  Copied sw.js');
}

// Copy index.html
const indexSrc = join(rootDir, 'index.html');
const indexDest = join(distDir, 'index.html');
if (existsSync(indexSrc)) {
  copyFileSync(indexSrc, indexDest);
  console.log('  Copied index.html');
}

// Copy directories recursively
function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.log(`  Warning: ${src} not found, skipping`);
    return;
  }
  
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(join(rootDir, 'css'), join(distDir, 'css'));
console.log('  Copied css/');

// Copy js directory
copyDir(join(rootDir, 'js'), join(distDir, 'js'));
console.log('  Copied js/');

// Copy src directory (runtime monitors)
copyDir(join(rootDir, 'src'), join(distDir, 'src'));
console.log('  Copied src/');

console.log('\n✓ Build complete! Output in dist/');
console.log('  Run "npm run serve" to test the build');
console.log('\nNote: Three.js must be available for the game to run.');
console.log('      The game uses import maps to load Three.js via "three" and "three/addons/".');
