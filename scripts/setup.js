#!/usr/bin/env node
/**
 * Setup script - Downloads Three.js library
 * Run this script after cloning the repository to set up dependencies
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const libDir = join(rootDir, 'lib');
const threeDir = join(libDir, 'three');

const THREE_VERSION = 'r160';
const THREE_URL = `https://github.com/mrdoob/three.js/archive/refs/tags/${THREE_VERSION}.tar.gz`;

console.log('🎮 Setting up Soulsborne 3D...\n');

// Check if Three.js is already installed
if (existsSync(join(threeDir, 'build', 'three.module.js'))) {
  console.log('✓ Three.js is already installed');
  console.log('  Location:', threeDir);
  process.exit(0);
}

console.log('📦 Downloading Three.js', THREE_VERSION, '...');
console.log('   This may take a moment...\n');

// Create lib directory
mkdirSync(libDir, { recursive: true });

// Download and extract Three.js
const downloadProcess = spawn('bash', ['-c', `
  cd "${libDir}" && \
  wget -q --show-progress "${THREE_URL}" -O three.tar.gz && \
  echo "\n📂 Extracting..." && \
  tar -xzf three.tar.gz && \
  mv three.js-${THREE_VERSION} three && \
  rm three.tar.gz
`], {
  stdio: 'inherit',
  shell: true
});

downloadProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✓ Three.js setup complete!');
    console.log('  Version:', THREE_VERSION);
    console.log('  Location:', threeDir);
    console.log('\n🚀 You can now run:');
    console.log('   npm run build  # Build the game');
    console.log('   npm run serve  # Start development server');
  } else {
    console.error('\n✗ Failed to download Three.js');
    console.error('  Please check your internet connection and try again');
    console.error('  Or download manually from:', THREE_URL);
    process.exit(1);
  }
});

downloadProcess.on('error', (err) => {
  console.error('\n✗ Error running setup:', err.message);
  console.error('  Make sure wget and tar are installed');
  process.exit(1);
});
