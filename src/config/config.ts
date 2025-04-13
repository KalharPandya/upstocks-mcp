import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Authentication method options for Upstox API
 */
export enum AuthMethod {
  API_KEY_SECRET = 'api_key_secret',  // Use API key + secret + OAuth flow
  ACCESS_TOKEN = 'access_token',      // Use pre-generated access token
}

/**
 * Environment type for Upstox API
 */
export enum EnvironmentType {
  LIVE = 'live',
  SANDBOX = 'sandbox',
}

/**
 * Upstox configuration interface
 */
export interface UpstoxConfig {
  // Common settings
  environment: EnvironmentType;
  useSandbox: boolean;

  // Authentication settings
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  authMethod: AuthMethod;
  redirectUri: string;
  
  // Live credentials
  liveApiKey: string;
  liveApiSecret: string;
  liveAccessToken: string;
  
  // Sandbox credentials
  sandboxApiKey: string;
  sandboxApiSecret: string;
  sandboxAccessToken: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Complete configuration
 */
export interface Config {
  upstox: UpstoxConfig;
  server: ServerConfig;
}

/**
 * Get environment variable with optional requirement
 */
function getEnvVariable(name: string, required: boolean = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required but not set.`);
  }
  return value || '';
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  // Determine environment type (live or sandbox)
  const useEnvironment = (getEnvVariable('UPSTOX_ENVIRONMENT', false) || 'sandbox').toLowerCase();
  const environment = useEnvironment === 'live' ? EnvironmentType.LIVE : EnvironmentType.SANDBOX;

  // Determine authentication method
  const authMethodStr = (getEnvVariable('UPSTOX_AUTH_METHOD', false) || 'access_token').toLowerCase();
  const authMethod = authMethodStr === 'api_key_secret' ?
    AuthMethod.API_KEY_SECRET : AuthMethod.ACCESS_TOKEN;

  // Fetch credentials based on environment
  const useSandbox = environment === EnvironmentType.SANDBOX;
  const apiKey = useSandbox
    ? getEnvVariable('SANDBOX_API_KEY')
    : getEnvVariable('API_KEY');
  const apiSecret = useSandbox
    ? getEnvVariable('SANDBOX_API_SECRET', authMethod === AuthMethod.API_KEY_SECRET)
    : getEnvVariable('API_SECRET', authMethod === AuthMethod.API_KEY_SECRET);
  const accessToken = useSandbox
    ? getEnvVariable('SANDBOX_ACCESS_TOKEN', authMethod === AuthMethod.ACCESS_TOKEN)
    : getEnvVariable('ACCESS_TOKEN', authMethod === AuthMethod.ACCESS_TOKEN);

  
  return {
    upstox: {
      // Environment and auth settings
      environment,
      authMethod,
      redirectUri: getEnvVariable('UPSTOX_REDIRECT_URI', false) || 'http://localhost:3000/callback',
      useSandbox,
      apiKey,
      apiSecret,
      accessToken,
      liveApiKey: getEnvVariable('LIVE_API_KEY', false),
      liveApiSecret: getEnvVariable('LIVE_API_SECRET', false),
      liveAccessToken: getEnvVariable('LIVE_ACCESS_TOKEN', false),
      sandboxApiKey: getEnvVariable('SANDBOX_API_KEY', false),
      sandboxApiSecret: getEnvVariable('SANDBOX_API_SECRET', false),
      sandboxAccessToken: getEnvVariable('SANDBOX_ACCESS_TOKEN', false),
    },
    server: {
      port: parseInt(getEnvVariable('PORT', false) || '3000', 10),
      host: getEnvVariable('HOST', false) || '0.0.0.0',
      logLevel: (getEnvVariable('LOG_LEVEL', false) || 'info') as 'debug' | 'info' | 'warn' | 'error',
    },
  }
}

/**
 * Get active API credentials based on current configuration
 */
export function getCredentials(config: Config): {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
} {
  if (config.upstox.environment === EnvironmentType.LIVE) {
    return {
      apiKey: config.upstox.liveApiKey || "",
      apiSecret: config.upstox.liveApiSecret || "",
      accessToken: config.upstox.liveAccessToken || "",
    };
  } else if (config.upstox.environment === EnvironmentType.SANDBOX) {
    return {
      apiKey: config.upstox.sandboxApiKey || "",
      apiSecret: config.upstox.sandboxApiSecret || "",
      accessToken: config.upstox.sandboxAccessToken || "",
    };
  } else {
    return { apiKey: "", apiSecret: "", accessToken: "" };
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
  const { apiKey, apiSecret, accessToken } = getCredentials(config);
  
  // Check API key (required for all configurations)
  if (!apiKey) {
    throw new Error('API key is required');
  }
  
  // Validate based on authentication method
  if (config.upstox.authMethod === AuthMethod.API_KEY_SECRET && !apiSecret) {
    throw new Error('API secret is required when using API key + secret authentication method');
  }
  
  if (config.upstox.authMethod === AuthMethod.ACCESS_TOKEN && !accessToken) {
    throw new Error('Access token is required when using token-based authentication method');
  }

  // Validate server configuration
  if (isNaN(config.server.port) || config.server.port <= 0 || config.server.port > 65535) {
    throw new Error('Invalid server port number');
  }
  
  // Log configuration information
  console.info(`Upstox MCP Server Configuration:`);
  console.info(`- Environment: ${config.upstox.environment}`);
  console.info(`- Auth Method: ${config.upstox.authMethod}`);
  console.info(`- Server Port: ${config.server.port}`);
}

// Load and validate config
const config = loadConfig();
validateConfig(config);
export default config;
