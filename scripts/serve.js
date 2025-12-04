#!/usr/bin/env node
/**
 * Simple HTTP server for serving the dist directory
 * Serves static files with proper MIME types
 */

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mime from 'mime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const PORT = process.env.PORT || 8080;

const server = createServer(async (req, res) => {
  try {
    // Parse URL and remove query string
    let path = req.url.split('?')[0];
    
    // Default to index.html for root
    if (path === '/') {
      path = '/index.html';
    }
    
    const filePath = join(distDir, path);
    
    // Check if file exists
    try {
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        // Try to serve index.html from directory
        const indexPath = join(filePath, 'index.html');
        const indexStats = await stat(indexPath);
        if (indexStats.isFile()) {
          const content = await readFile(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
          return;
        }
      }
      
      if (stats.isFile()) {
        const content = await readFile(filePath);
        const mimeType = mime.getType(extname(filePath)) || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content);
        return;
      }
    } catch (err) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
  } catch (err) {
    console.error('Server error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}/`);
  console.log(`   Serving files from: ${distDir}`);
  console.log('\n   Press Ctrl+C to stop\n');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\nShutting down server...');
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});
