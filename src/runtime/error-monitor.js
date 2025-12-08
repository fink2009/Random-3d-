/**
 * Runtime Error Monitor
 * Hooks into window errors, unhandled rejections, and console.error
 * Displays a minimal overlay with error tracking
 */

class ErrorMonitor {
  constructor(config = {}) {
    this.config = {
      maxErrors: config.maxErrors || 100,
      remoteEndpoint: config.remoteEndpoint || null,
      showOverlay: config.showOverlay !== false,
      ...config
    };
    
    this.errors = [];
    this.warnings = [];
    this.overlay = null;
    this.isEnabled = false;
  }
  
  /**
   * Initialize the error monitor
   */
  init() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    this.hookErrors();
    
    if (this.config.showOverlay) {
      this.createOverlay();
    }
    
    console.log('[ErrorMonitor] Initialized');
  }
  
  /**
   * Hook into error events
   */
  hookErrors() {
    // Hook window.onerror
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this.recordError({
        type: 'error',
        message: message,
        source: source,
        line: lineno,
        column: colno,
        stack: error ? error.stack : null,
        timestamp: Date.now()
      });
      
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }
      return false;
    };
    
    // Hook unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'unhandledRejection',
        message: event.reason ? event.reason.message || event.reason : 'Unhandled Promise Rejection',
        stack: event.reason ? event.reason.stack : null,
        timestamp: Date.now()
      });
    });
    
    // Hook console.error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.recordError({
        type: 'consoleError',
        message: args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' '),
        timestamp: Date.now()
      });
      
      originalConsoleError.apply(console, args);
    };
  }
  
  /**
   * Record an error or warning
   */
  recordError(errorInfo) {
    const entry = {
      ...errorInfo,
      id: this.errors.length + this.warnings.length
    };
    
    if (errorInfo.severity === 'warning') {
      this.warnings.push(entry);
    } else {
      this.errors.push(entry);
    }
    
    // Limit stored errors
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }
    if (this.warnings.length > this.config.maxErrors) {
      this.warnings.shift();
    }
    
    this.updateOverlay();
    this.sendToRemote(entry);
  }
  
  /**
   * Add a warning (called by code-checker)
   */
  addWarning(warning) {
    this.recordError({
      type: 'codeWarning',
      severity: 'warning',
      message: warning.message,
      file: warning.file,
      pattern: warning.pattern,
      timestamp: Date.now()
    });
  }
  
  /**
   * Send error to remote endpoint
   */
  async sendToRemote(errorInfo) {
    if (!this.config.remoteEndpoint) return;
    
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorInfo)
      });
    } catch (err) {
      // Silently fail - don't spam console with failed remote logging
    }
  }
  
  /**
   * Create the error overlay UI
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'error-monitor-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      pointer-events: auto;
    `;
    
    this.overlay.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #ff6b6b;">🔍 Runtime Monitor</strong>
        <button id="error-monitor-close" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 16px;">×</button>
      </div>
      <div id="error-monitor-content">
        <div style="color: #51cf66;">✓ No errors detected</div>
      </div>
      <button id="error-monitor-download" style="
        margin-top: 8px;
        width: 100%;
        background: #4c6ef5;
        color: white;
        border: none;
        padding: 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">Download Logs</button>
      <button id="error-monitor-diagnostics" style="
        margin-top: 4px;
        width: 100%;
        background: #37b24d;
        color: white;
        border: none;
        padding: 6px;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      ">Run Self-Diagnostics</button>
    `;
    
    document.body.appendChild(this.overlay);
    
    // Event listeners
    document.getElementById('error-monitor-close').addEventListener('click', () => {
      this.overlay.style.display = 'none';
    });
    
    document.getElementById('error-monitor-download').addEventListener('click', () => {
      this.downloadLogs();
    });
    
    document.getElementById('error-monitor-diagnostics').addEventListener('click', () => {
      this.runDiagnostics();
    });
    
    this.updateOverlay();
  }
  
  /**
   * Update the overlay display
   */
  updateOverlay() {
    if (!this.overlay) return;
    
    const content = document.getElementById('error-monitor-content');
    if (!content) return;
    
    const errorCount = this.errors.length;
    const warningCount = this.warnings.length;
    
    if (errorCount === 0 && warningCount === 0) {
      content.innerHTML = '<div style="color: #51cf66;">✓ No errors detected</div>';
      return;
    }
    
    const lastError = this.errors[this.errors.length - 1];
    const lastWarning = this.warnings[this.warnings.length - 1];
    
    let html = '';
    
    if (errorCount > 0) {
      html += `<div style="color: #ff6b6b; margin-bottom: 4px;">⚠ ${errorCount} error(s)</div>`;
      if (lastError) {
        html += `<div style="color: #ffa94d; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          Last: ${lastError.message.substring(0, 50)}${lastError.message.length > 50 ? '...' : ''}
        </div>`;
      }
    }
    
    if (warningCount > 0) {
      html += `<div style="color: #ffd43b; margin-top: 4px;">⚠ ${warningCount} warning(s)</div>`;
      if (lastWarning) {
        html += `<div style="color: #ffa94d; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          Last: ${lastWarning.message.substring(0, 50)}${lastWarning.message.length > 50 ? '...' : ''}
        </div>`;
      }
    }
    
    content.innerHTML = html;
  }
  
  /**
   * Download logs as JSON file
   */
  downloadLogs() {
    const logs = {
      errors: this.errors,
      warnings: this.warnings,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[ErrorMonitor] Logs downloaded');
  }
  
  /**
   * Get current error statistics
   */
  getStats() {
    return {
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings
    };
  }
  
  /**
   * Run self-diagnostics
   */
  async runDiagnostics() {
    console.log('[ErrorMonitor] Running self-diagnostics...');
    
    // Trigger code checker diagnostics if available
    try {
      if (window.codeChecker && typeof window.codeChecker.runDiagnostics === 'function') {
        await window.codeChecker.runDiagnostics();
      }
    } catch (err) {
      console.warn('[ErrorMonitor] Code checker diagnostics failed:', err);
    }
    
    const results = {
      timestamp: Date.now(),
      checks: []
    };
    
    // Check 1: WebGL context
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        // Get basic WebGL info without detailed hardware fingerprinting
        const version = gl.getParameter(gl.VERSION);
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        results.checks.push({
          name: 'WebGL Context',
          status: 'PASS',
          details: `${version}, Max texture: ${maxTextureSize}`
        });
        console.log('[Diagnostics] ✓ WebGL context available');
      } else {
        results.checks.push({
          name: 'WebGL Context',
          status: 'FAIL',
          details: 'WebGL not available'
        });
        console.error('[Diagnostics] ✗ WebGL context not available');
      }
    } catch (err) {
      results.checks.push({
        name: 'WebGL Context',
        status: 'ERROR',
        details: err.message
      });
      console.error('[Diagnostics] ✗ WebGL check error:', err);
    }
    
    // Check 2: Critical assets (concurrent fetch for better performance)
    const criticalAssets = [
      '/index.html',
      '/css/styles.css',
      '/js/main.js',
      '/js/game/Game.js'
    ];
    
    const assetChecks = await Promise.all(
      criticalAssets.map(async (asset) => {
        try {
          // Add 5 second timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(asset, { 
            method: 'HEAD',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          return {
            asset,
            success: response.ok,
            status: response.status
          };
        } catch (err) {
          return {
            asset,
            success: false,
            error: err.name === 'AbortError' ? 'Timeout' : (err.message || err.toString() || 'Network error')
          };
        }
      })
    );
    
    const assetChecksPassed = assetChecks.filter(c => c.success).length;
    const assetChecksFailed = assetChecks.filter(c => !c.success).length;
    
    assetChecks.forEach(check => {
      if (!check.success) {
        console.warn(`[Diagnostics] Asset check failed: ${check.asset} (${check.status || check.error})`);
      }
    });
    
    results.checks.push({
      name: 'Critical Assets',
      status: assetChecksFailed === 0 ? 'PASS' : (assetChecksPassed > 0 ? 'PARTIAL' : 'FAIL'),
      details: `${assetChecksPassed}/${criticalAssets.length} assets accessible`
    });
    
    console.log(`[Diagnostics] Asset checks: ${assetChecksPassed}/${criticalAssets.length} passed`);
    
    // Check 3: Scene population
    try {
      // Try to access game scene if available
      if (window.game && window.game.scene) {
        const childCount = window.game.scene.children.length;
        
        if (childCount > 0) {
          results.checks.push({
            name: 'Scene Population',
            status: 'PASS',
            details: `Scene has ${childCount} objects`
          });
          console.log(`[Diagnostics] ✓ Scene populated with ${childCount} objects`);
        } else {
          results.checks.push({
            name: 'Scene Population',
            status: 'WARNING',
            details: 'Scene is empty'
          });
          console.warn('[Diagnostics] ⚠ Scene is empty');
        }
      } else {
        results.checks.push({
          name: 'Scene Population',
          status: 'SKIP',
          details: 'Game not initialized yet'
        });
        console.log('[Diagnostics] Scene check skipped (game not initialized)');
      }
    } catch (err) {
      results.checks.push({
        name: 'Scene Population',
        status: 'ERROR',
        details: err.message
      });
      console.error('[Diagnostics] ✗ Scene check error:', err);
    }
    
    // Store diagnostics results
    this.diagnosticsResults = results;
    
    // Display results in overlay
    this.showDiagnosticsResults(results);
    
    console.log('[ErrorMonitor] Diagnostics complete');
    return results;
  }
  
  /**
   * Show diagnostics results in overlay
   */
  showDiagnosticsResults(results) {
    const content = document.getElementById('error-monitor-content');
    if (!content) return;
    
    // Clear existing content
    content.textContent = '';
    
    // Create header
    const header = document.createElement('div');
    header.style.marginBottom = '8px';
    const headerText = document.createElement('strong');
    headerText.textContent = 'Diagnostics Results:';
    header.appendChild(headerText);
    content.appendChild(header);
    
    // Add each check result
    for (const check of results.checks) {
      let color = '#51cf66'; // green
      let icon = '✓';
      
      if (check.status === 'FAIL' || check.status === 'ERROR') {
        color = '#ff6b6b'; // red
        icon = '✗';
      } else if (check.status === 'WARNING' || check.status === 'PARTIAL') {
        color = '#ffd43b'; // yellow
        icon = '⚠';
      } else if (check.status === 'SKIP') {
        color = '#adb5bd'; // gray
        icon = '○';
      }
      
      const checkDiv = document.createElement('div');
      checkDiv.style.color = color;
      checkDiv.style.fontSize = '10px';
      checkDiv.style.margin = '4px 0';
      
      const mainLine = document.createTextNode(`${icon} ${check.name}: ${check.status}`);
      checkDiv.appendChild(mainLine);
      checkDiv.appendChild(document.createElement('br'));
      
      const detailsSpan = document.createElement('span');
      detailsSpan.style.color = '#adb5bd';
      detailsSpan.style.marginLeft = '12px';
      detailsSpan.textContent = check.details;
      checkDiv.appendChild(detailsSpan);
      
      content.appendChild(checkDiv);
    }
  }
}

export { ErrorMonitor };
