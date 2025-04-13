#!/usr/bin/env node

import { startServer } from './server';
import config from './config/config';
import { authManager } from './upstox/auth';

/**
 * Main entry point for the Upstox MCP server
 */
async function main() {
  try {
    console.log('Starting Upstox MCP server...');
    
    // Display configuration info
    console.log(`Server mode: ${config.upstox.useSandbox ? 'Sandbox' : 'Live'}`);
    console.log(`Redirect URI: ${config.upstox.redirectUri}`);
    
    // Start the server
    const server = await startServer();
    
    // If using sandbox, log the authorization URL
    if (!config.upstox.useSandbox && !authManager.getAuthState().isAuthorized) {
      const authUrl = await authManager.getAuthorizationUrl();
      console.log('\nAuthorization required. Please visit the following URL to authenticate:');
      console.log(authUrl);
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
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the application
main();
