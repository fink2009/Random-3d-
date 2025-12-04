#!/usr/bin/env node
/**
 * Static Runtime Checker
 * Scans source files for potential issues using regex patterns
 * Provides a lightweight alternative to running headless Chrome
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'js');

// Patterns to check
const patterns = [
  {
    name: 'infinite-loop',
    regex: /while\s*\(\s*true\s*\)/gi,
    message: 'Potential infinite loop detected (while(true))',
    severity: 'WARNING'
  },
  {
    name: 'sync-xhr',
    regex: /new\s+XMLHttpRequest\(\).*\.open\([^)]*,\s*false\s*\)/gis,
    message: 'Synchronous XMLHttpRequest detected (blocks main thread)',
    severity: 'WARNING'
  },
  {
    name: 'debugger',
    regex: /\bdebugger\s*;/gi,
    message: 'Debugger statement found (should be removed in production)',
    severity: 'WARNING'
  },
  {
    name: 'console-log-spam',
    regex: /console\.log/gi,
    message: 'Multiple console.log statements detected',
    severity: 'INFO',
    threshold: 10 // Only warn if more than 10 occurrences in a file
  },
  {
    name: 'todo-marker',
    regex: /\/\/\s*TODO/gi,
    message: 'TODO marker found',
    severity: 'INFO'
  },
  {
    name: 'fixme-marker',
    regex: /\/\/\s*FIXME/gi,
    message: 'FIXME marker found',
    severity: 'INFO'
  },
  {
    name: 'process-env',
    regex: /process\.env/gi,
    message: 'process.env usage detected (may not work in browser)',
    severity: 'WARNING'
  },
  {
    name: 'large-array',
    regex: /new\s+Array\s*\(\s*(\d{5,})\s*\)/gi,
    message: 'Very large array allocation detected',
    severity: 'WARNING'
  },
  {
    name: 'eval-usage',
    regex: /\beval\s*\(/gi,
    message: 'eval() usage detected (security risk)',
    severity: 'WARNING'
  },
  {
    name: 'document-write',
    regex: /document\.write\(/gi,
    message: 'document.write() usage detected (not recommended)',
    severity: 'INFO'
  }
];

let totalWarnings = 0;
let totalInfo = 0;
let filesScanned = 0;

/**
 * Get all JavaScript files recursively
 */
function getJSFiles(dir, fileList = []) {
  try {
    const files = readdirSync(dir);
    
    files.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (file !== 'node_modules' && !file.startsWith('.')) {
          getJSFiles(filePath, fileList);
        }
      } else if (extname(file) === '.js') {
        fileList.push(filePath);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return fileList;
}

/**
 * Get line number from character index
 */
function getLineNumber(content, index) {
  const lines = content.substring(0, index).split('\n');
  return lines.length;
}

/**
 * Analyze a file
 */
function analyzeFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = filePath.replace(rootDir + '/', '');
    let fileHasIssues = false;
    
    for (const pattern of patterns) {
      const matches = [];
      let match;
      
      // Reset regex index
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(content)) !== null) {
        matches.push({
          index: match.index,
          text: match[0],
          line: getLineNumber(content, match.index)
        });
      }
      
      // Check threshold if specified
      if (pattern.threshold && matches.length <= pattern.threshold) {
        continue;
      }
      
      // Report findings
      if (matches.length > 0) {
        if (!fileHasIssues) {
          console.log(`\n📄 ${relativePath}`);
          fileHasIssues = true;
        }
        
        const icon = pattern.severity === 'WARNING' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} [${pattern.severity}] ${pattern.message}`);
        console.log(`     Found ${matches.length} occurrence(s)`);
        
        // Show first few occurrences
        matches.slice(0, 3).forEach(m => {
          console.log(`     - Line ${m.line}: ${m.text.substring(0, 60)}`);
        });
        
        if (pattern.severity === 'WARNING') {
          totalWarnings++;
        } else {
          totalInfo++;
        }
      }
    }
    
    filesScanned++;
  } catch (err) {
    console.error(`Error analyzing ${filePath}:`, err.message);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Static Runtime Checker');
  console.log('='.repeat(50));
  console.log(`Scanning directory: ${srcDir}\n`);
  
  const files = getJSFiles(srcDir);
  
  if (files.length === 0) {
    console.log('No JavaScript files found to scan.');
    return;
  }
  
  console.log(`Found ${files.length} JavaScript files to analyze...`);
  
  files.forEach(analyzeFile);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Scan Summary');
  console.log('='.repeat(50));
  console.log(`Files scanned: ${filesScanned}`);
  console.log(`Warnings: ${totalWarnings}`);
  console.log(`Info: ${totalInfo}`);
  
  if (totalWarnings === 0 && totalInfo === 0) {
    console.log('\n✅ No issues found!');
  } else {
    console.log(`\n⚠️  Found ${totalWarnings} warnings and ${totalInfo} info items`);
  }
  
  // Exit with error code if warnings found
  if (totalWarnings > 0) {
    process.exit(1);
  }
}

main();
