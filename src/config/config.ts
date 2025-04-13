import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface UpstoxConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
  useSandbox: boolean;
  sandboxToken: string;
}

export interface ServerConfig {
  port: number;
  host: string;
}

export interface Config {
  upstox: UpstoxConfig;
  server: ServerConfig;
}

function getEnvVariable(name: string, required: boolean = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required but not set.`);
  }
  return value || '';
}

export function loadConfig(): Config {
  return {
    upstox: {
      apiKey: getEnvVariable('UPSTOX_API_KEY'),
      apiSecret: getEnvVariable('UPSTOX_API_SECRET', false),
      redirectUri: getEnvVariable('UPSTOX_REDIRECT_URI', false) || 'http://localhost:3000/callback',
      useSandbox: getEnvVariable('USE_SANDBOX', false) === 'true',
      sandboxToken: getEnvVariable('UPSTOX_SANDBOX_TOKEN', false),
    },
    server: {
      port: parseInt(getEnvVariable('PORT', false) || '3000', 10),
      host: getEnvVariable('HOST', false) || '0.0.0.0',
    }
  };
}

export function validateConfig(config: Config): void {
  // Validate Upstox configuration
  if (!config.upstox.apiKey) {
    throw new Error('Upstox API key is required');
  }
  
  if (config.upstox.useSandbox && !config.upstox.sandboxToken) {
    console.warn('WARNING: Sandbox mode is enabled but no sandbox token is provided');
  }
  
  if (!config.upstox.useSandbox && !config.upstox.apiSecret) {
    throw new Error('Upstox API secret is required when not using sandbox mode');
  }

  // Validate server configuration
  if (isNaN(config.server.port) || config.server.port <= 0 || config.server.port > 65535) {
    throw new Error('Invalid server port number');
  }
}

// Load and validate config
const config = loadConfig();
validateConfig(config);

export default config;
