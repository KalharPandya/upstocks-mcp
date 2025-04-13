import axios from 'axios';
import { EventEmitter } from 'events';
import { UpstoxToken, UpstoxAuthState } from './types';
import config, { 
  AuthMethod, 
  EnvironmentType,
  getCredentials
} from '../config/config';

/**
 * Auth manager for handling Upstox API authentication
 */
export class UpstoxAuthManager extends EventEmitter {
  private state: UpstoxAuthState = {
    accessToken: null,
    tokenExpiry: null,
    isAuthorized: false
  };

  constructor() {
    super();
    this.initializeFromConfig();
  }

  /**
   * Initialize auth state based on configuration
   */
  private initializeFromConfig(): void {
    const { environment, authMethod } = config.upstox;
    const credentials = getCredentials(config);
    
    // If using direct access token, initialize the state
    if (authMethod === AuthMethod.ACCESS_TOKEN && credentials.accessToken) {
      // Calculate expiry based on standard Upstox token expiry rules
      // Upstox tokens expire at 3:30 AM IST the next day
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 1);
      tokenExpiry.setHours(3, 30, 0, 0); // 3:30 AM IST next day

      if (tokenExpiry < new Date()) {
        // If it's already past 3:30 AM, set to the day after
        tokenExpiry.setDate(tokenExpiry.getDate() + 1);
      }

      // For sandbox tokens, we set a longer expiry (30 days)
      if (environment === EnvironmentType.SANDBOX) {
        tokenExpiry.setDate(tokenExpiry.getDate() + 30);
      }

      this.state = {
        accessToken: credentials.accessToken,
        tokenExpiry,
        isAuthorized: true
      };

      // console.info(`Initialized auth manager with pre-configured access token (expires ${tokenExpiry.toISOString()})`);
    }
  }

  /**
   * Get the current authentication state
   */
  public getAuthState(): UpstoxAuthState {
    return { ...this.state };
  }

  /**
   * Get access token, checking for expiry
   */
  public async getAccessToken(): Promise<string> {
    const { environment, authMethod } = config.upstox;
    const credentials = getCredentials(config);
    
    // If using direct access token configuration, return it
    if (authMethod === AuthMethod.ACCESS_TOKEN) {
      // If token in state, use it
      if (this.state.accessToken && this.state.tokenExpiry && this.state.tokenExpiry > new Date()) {
        return this.state.accessToken;
      }
      
      // If token provided in config, use it
      if (credentials.accessToken) {
        // Update state before returning
        this.state.accessToken = credentials.accessToken;
        
        // Calculate expiry date
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + (environment === EnvironmentType.SANDBOX ? 30 : 1));
        tokenExpiry.setHours(3, 30, 0, 0);
        
        this.state.tokenExpiry = tokenExpiry;
        this.state.isAuthorized = true;
        
        return credentials.accessToken;
      }
      
      throw new Error('Access token not found in configuration or state');
    }
    
    // Using API key + secret flow
    // Check if token exists and is valid
    if (this.state.accessToken && this.state.tokenExpiry && this.state.tokenExpiry > new Date()) {
      return this.state.accessToken;
    }

    // Token doesn't exist or is expired
    if (!this.state.isAuthorized) {
      throw new Error('Not authenticated with Upstox. Please authenticate first.');
    }

    // Token is expired, try to refresh (Upstox doesn't support refresh tokens)
    throw new Error('Upstox token has expired. Re-authorization required.');
  }

  /**
   * Get the authorization URL for Upstox login
   */
  public getAuthorizationUrl(): string {
    const credentials = getCredentials(config);
    
    const params = new URLSearchParams({
      client_id: credentials.apiKey,
      redirect_uri: config.upstox.redirectUri,
      response_type: 'code',
      scope: 'orders holdings positions funds profile'
    });

    return `https://api.upstox.com/v2/login/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  public async authenticateWithCode(authCode: string): Promise<UpstoxAuthState> {
    try {
      const credentials = getCredentials(config);
      
      const tokenUrl = 'https://api.upstox.com/v2/login/authorization/token';
      const response = await axios.post<UpstoxToken>(
        tokenUrl,
        new URLSearchParams({
          code: authCode,
          client_id: credentials.apiKey,
          client_secret: credentials.apiSecret,
          redirect_uri: config.upstox.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      // Process the token response
      const tokenData = response.data;
      if (tokenData.access_token) {
        // Set the token and expiry
        // Upstox tokens expire at 3:30 AM IST the next day
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 1);
        tokenExpiry.setHours(3, 30, 0, 0); // 3:30 AM IST next day

        if (tokenExpiry < new Date()) {
          // If it's already past 3:30 AM, set to the day after
          tokenExpiry.setDate(tokenExpiry.getDate() + 1);
        }

        // Update state
        this.state = {
          accessToken: tokenData.access_token,
          tokenExpiry: tokenExpiry,
          isAuthorized: true
        };

        // Emit auth change event
        this.emit('auth_change', this.state);

        return this.state;
      } else {
        throw new Error('Failed to obtain access token from Upstox');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Authentication failed: ${error.response.data.message || error.message}`);
      } else {
        throw new Error(`Authentication failed: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Set a token directly
   */
  public setToken(token: string, expiryDays: number = 1): void {
    // Calculate expiry date
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + expiryDays);
    
    if (expiryDays === 1) {
      // For 1-day tokens, set standard Upstox expiry time
      tokenExpiry.setHours(3, 30, 0, 0);
    }

    // Update state
    this.state = {
      accessToken: token,
      tokenExpiry,
      isAuthorized: true
    };
    
    this.emit('auth_change', this.state);
    console.info(`Token set manually (expires ${tokenExpiry.toISOString()})`);
  }

  /**
   * Clear authentication state
   */
  public logout(): void {
    this.state = {
      accessToken: null,
      tokenExpiry: null,
      isAuthorized: false
    };
    
    this.emit('auth_change', this.state);
  }
}

// Export a singleton instance
export const authManager = new UpstoxAuthManager();
