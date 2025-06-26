#!/usr/bin/env node

/**
 * Health check script for Docker containers
 * Used by Coolify to verify the application is running correctly
 */

const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/database-status',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  // Accept 200 (OK) and 307 (Temporary Redirect) as healthy
  if (res.statusCode === 200 || res.statusCode === 307) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`Health check failed: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check timeout');
  request.destroy();
  process.exit(1);
});

request.end();