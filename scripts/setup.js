#!/usr/bin/env node
/**
 * Setup script - Downloads Three.js library
 * Run this script after cloning the repository to set up dependencies
 * 
 * This script uses platform-specific commands but provides helpful
 * error messages and fallback instructions for cross-platform support.
 */

import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { platform } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const libDir = join(rootDir, 'lib');
const threeDir = join(libDir, 'three');

const THREE_VERSION = 'r160';
const THREE_URL = `https://github.com/mrdoob/three.js/archive/refs/tags/${THREE_VERSION}.tar.gz`;
const MANUAL_URL = 'https://github.com/mrdoob/three.js/releases/tag/r160';

console.log('🎮 Setting up Soulsborne 3D...\n');

// Check if Three.js is already installed
if (existsSync(join(threeDir, 'build', 'three.module.js'))) {
  console.log('✓ Three.js is already installed');
  console.log('  Location:', threeDir);
  process.exit(0);
}

// Warn Windows users
if (platform() === 'win32') {
  console.log('⚠️  Note: This script requires bash, wget, and tar.');
  console.log('   On Windows, you can use Git Bash, WSL, or download manually.');
  console.log('   Manual download:', MANUAL_URL);
  console.log('   Extract to: lib/three/\n');
}

console.log('📦 Downloading Three.js', THREE_VERSION, '...');
console.log('   This may take a moment...\n');

// Create lib directory
mkdirSync(libDir, { recursive: true });

// Download and extract Three.js
// Note: The GitHub archive extracts to 'three.js-r160' (not 'three.js-160')
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
    console.error('\n  Manual setup:');
    console.error('  1. Download:', MANUAL_URL);
    console.error('  2. Extract to: lib/three/');
    console.error('  3. Verify lib/three/build/three.module.js exists');
    process.exit(1);
  }
});

downloadProcess.on('error', (err) => {
  console.error('\n✗ Error running setup:', err.message);
  console.error('  This script requires bash, wget, and tar');
  if (platform() === 'win32') {
    console.error('  On Windows, use Git Bash or WSL');
  }
  console.error('\n  Manual setup:');
  console.error('  1. Download:', MANUAL_URL);
  console.error('  2. Extract to: lib/three/');
  console.error('  3. Verify lib/three/build/three.module.js exists');
  process.exit(1);
});
