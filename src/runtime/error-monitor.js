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
    `;
    
    document.body.appendChild(this.overlay);
    
    // Event listeners
    document.getElementById('error-monitor-close').addEventListener('click', () => {
      this.overlay.style.display = 'none';
    });
    
    document.getElementById('error-monitor-download').addEventListener('click', () => {
      this.downloadLogs();
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
}

export { ErrorMonitor };
