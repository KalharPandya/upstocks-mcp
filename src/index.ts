#!/usr/bin/env node

import { startMcpServer } from './server';
import config from './config/config';
import { authManager } from './upstox/auth';

/**
 * Check if a command-line flag is present
 */
function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

/**
 * Main entry point for the Upstox MCP server
 */
async function main() {
  try {
    console.log('Starting Upstox MCP server...');
    
    // Determine if ngrok should be used
    const useNgrok = hasFlag('--use-ngrok');
    
    // Display configuration info
    console.log(`Server mode: ${config.upstox.environment}`);
    console.log(`Auth method: ${config.upstox.authMethod}`);
    console.log(`Redirect URI: ${config.upstox.redirectUri}`);
    console.log(`Tunnel enabled: ${useNgrok ? 'Yes' : 'No'}`);
    
    // Start the server with ngrok if requested
    const server = await startMcpServer({ useNgrok });
    
    // If not already authorized, show authorization URL
    if (!authManager.getAuthState().isAuthorized) {
      try {
        const authUrl = authManager.getAuthorizationUrl();
        console.log('\nAuthorization required. Please visit the following URL to authenticate:');
        console.log(authUrl);
        
        // Just show instructions for manually opening
        console.log('\nPlease open this URL in your browser to authenticate.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Unable to generate authorization URL:', errorMessage);
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to start server:', errorMessage);
    process.exit(1);
  }
}

// Run the application
main();
