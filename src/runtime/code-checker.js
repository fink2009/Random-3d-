/**
 * Runtime Code Checker
 * Asynchronously fetches and analyzes source files for potential issues
 * Runs periodically to detect problems while the game runs
 */

class CodeChecker {
  constructor(config = {}) {
    this.config = {
      files: config.files || [
        '/js/main.js',
        '/js/game/Game.js',
        '/js/game/World.js',
        '/js/game/InputManager.js',
        '/js/entities/Player.js',
        '/js/entities/Enemy.js',
        '/js/entities/Boss.js',
        '/js/combat/CombatSystem.js',
        '/js/systems/ProgressionSystem.js',
        '/js/ui/HUD.js',
      ],
      scanInterval: config.scanInterval || 30000, // 30 seconds
      errorMonitor: config.errorMonitor || null,
      autoScan: config.autoScan !== false,
      ...config
    };
    
    this.patterns = [
      {
        name: 'infinite-loop',
        regex: /while\s*\(\s*true\s*\)/gi,
        message: 'Potential infinite loop detected (while(true))',
        severity: 'warning'
      },
      {
        name: 'sync-xhr',
        regex: /new\s+XMLHttpRequest\(\).*\.open\([^)]*,\s*false\s*\)/gis,
        message: 'Synchronous XMLHttpRequest detected (blocks main thread)',
        severity: 'warning'
      },
      {
        name: 'debugger',
        regex: /\bdebugger\s*;/gi,
        message: 'Debugger statement found (should be removed in production)',
        severity: 'warning'
      },
      {
        name: 'console-log-spam',
        regex: /console\.log/gi,
        message: 'Multiple console.log statements detected',
        severity: 'info',
        threshold: 5 // Only warn if more than 5 occurrences
      },
      {
        name: 'todo-marker',
        regex: /\/\/\s*TODO/gi,
        message: 'TODO marker found',
        severity: 'info'
      },
      {
        name: 'process-env',
        regex: /process\.env/gi,
        message: 'process.env usage detected (may not work in browser)',
        severity: 'warning'
      },
      {
        name: 'large-array',
        regex: /new\s+Array\s*\(\s*(\d{5,})\s*\)/gi,
        message: 'Very large array allocation detected',
        severity: 'warning'
      }
    ];
    
    this.scanTimer = null;
    this.isScanning = false;
    this.scanResults = [];
  }
  
  /**
   * Initialize the code checker
   */
  init() {
    console.log('[CodeChecker] Initialized');
    
    if (this.config.autoScan) {
      this.startPeriodicScan();
    }
    
    // Run initial scan after a delay
    setTimeout(() => this.scanAll(), 2000);
  }
  
  /**
   * Start periodic scanning
   */
  startPeriodicScan() {
    if (this.scanTimer) return;
    
    this.scanTimer = setInterval(() => {
      this.scanAll();
    }, this.config.scanInterval);
    
    console.log(`[CodeChecker] Periodic scan enabled (every ${this.config.scanInterval / 1000}s)`);
  }
  
  /**
   * Stop periodic scanning
   */
  stopPeriodicScan() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
      console.log('[CodeChecker] Periodic scan disabled');
    }
  }
  
  /**
   * Scan all configured files
   */
  async scanAll() {
    if (this.isScanning) {
      console.log('[CodeChecker] Scan already in progress, skipping');
      return;
    }
    
    this.isScanning = true;
    this.scanResults = [];
    
    console.log('[CodeChecker] Starting scan...');
    
    for (const file of this.config.files) {
      await this.scanFile(file);
    }
    
    this.isScanning = false;
    
    // Report results
    const warningCount = this.scanResults.filter(r => r.severity === 'warning').length;
    const infoCount = this.scanResults.filter(r => r.severity === 'info').length;
    
    if (warningCount > 0 || infoCount > 0) {
      console.log(`[CodeChecker] Scan complete: ${warningCount} warnings, ${infoCount} info`);
      this.reportFindings();
    } else {
      console.log('[CodeChecker] Scan complete: No issues found');
    }
  }
  
  /**
   * Scan a single file
   */
  async scanFile(filePath) {
    try {
      const response = await fetch(filePath);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Ignore 404s as requested
          return;
        }
        console.warn(`[CodeChecker] Failed to fetch ${filePath}: ${response.status}`);
        return;
      }
      
      const content = await response.text();
      this.analyzeCode(filePath, content);
      
    } catch (err) {
      // Silently ignore fetch errors (network issues, CORS, etc.)
    }
  }
  
  /**
   * Analyze code content for patterns
   */
  analyzeCode(filePath, content) {
    for (const pattern of this.patterns) {
      const matches = [];
      let match;
      
      // Reset regex index
      pattern.regex.lastIndex = 0;
      
      while ((match = pattern.regex.exec(content)) !== null) {
        matches.push({
          index: match.index,
          text: match[0],
          line: this.getLineNumber(content, match.index)
        });
      }
      
      // Check threshold if specified
      if (pattern.threshold && matches.length <= pattern.threshold) {
        continue;
      }
      
      // Record findings
      if (matches.length > 0) {
        const finding = {
          file: filePath,
          pattern: pattern.name,
          message: pattern.message,
          severity: pattern.severity,
          occurrences: matches.length,
          matches: matches.slice(0, 3) // Limit to first 3 matches
        };
        
        this.scanResults.push(finding);
      }
    }
  }
  
  /**
   * Get line number from character index
   */
  getLineNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }
  
  /**
   * Report findings to error monitor
   */
  reportFindings() {
    if (!this.config.errorMonitor) {
      // Just log to console
      this.scanResults.forEach(finding => {
        console.warn(
          `[CodeChecker] ${finding.severity.toUpperCase()}: ${finding.message} in ${finding.file} (${finding.occurrences} occurrences)`
        );
      });
      return;
    }
    
    // Report to error monitor
    this.scanResults.forEach(finding => {
      this.config.errorMonitor.addWarning({
        message: `${finding.message} in ${finding.file} (${finding.occurrences}x)`,
        file: finding.file,
        pattern: finding.pattern,
        severity: finding.severity,
        occurrences: finding.occurrences
      });
    });
  }
  
  /**
   * Get scan results
   */
  getResults() {
    return {
      results: this.scanResults,
      isScanning: this.isScanning,
      lastScan: Date.now()
    };
  }
  
  /**
   * Add custom pattern
   */
  addPattern(pattern) {
    this.patterns.push(pattern);
  }
  
  /**
   * Remove pattern by name
   */
  removePattern(name) {
    this.patterns = this.patterns.filter(p => p.name !== name);
  }
}

export { CodeChecker };
