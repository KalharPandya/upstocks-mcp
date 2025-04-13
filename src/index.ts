#!/usr/bin/env node

import { startMcpServer } from './server';
import config from './config/config';
import { authManager } from './upstox/auth';

/**
 * Main entry point for the Upstox MCP server
 */
async function main() {
  try {
    console.log('Starting Upstox MCP server...');
    
    // Display configuration info
    console.log(`Server mode: ${config.upstox.environment}`);
    console.log(`Auth method: ${config.upstox.authMethod}`);
    console.log(`Redirect URI: ${config.upstox.redirectUri}`);
    
    // Start the server
    const server = await startMcpServer();
    
    // If not using token auth and not already authorized, show authorization URL
    if (!authManager.getAuthState().isAuthorized) {
      try {
        const authUrl = authManager.getAuthorizationUrl();
        console.log('\nAuthorization required. Please visit the following URL to authenticate:');
        console.log(authUrl);
      } catch (error: any) {
        console.warn('Unable to generate authorization URL:', error?.message || 'Unknown error');
      }
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\nShutting down...');
      await server.stop();
      process.exit(0);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error?.message || 'Unknown error');
    process.exit(1);
  }
}

// Run the application
main();
