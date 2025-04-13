import axios from 'axios';
import { EventEmitter } from 'events';
import { UpstoxToken, UpstoxAuthState } from './types';
import config from '../config/config';

/**
 * Auth manager for handling Upstox API authentication
 */
export class UpstoxAuthManager extends EventEmitter {
  private state: UpstoxAuthState = {
    accessToken: null,
    tokenExpiry: null,
    isAuthorized: false
  };

  private config = config.upstox;

  constructor() {
    super();
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
    // If using sandbox mode, return the sandbox token
    if (this.config.useSandbox && this.config.sandboxToken) {
      return this.config.sandboxToken;
    }

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
    const params = new URLSearchParams({
      client_id: this.config.apiKey,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'orders holdings profile'
    });

    return `https://api.upstox.com/v2/login/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  public async authenticateWithCode(authCode: string): Promise<UpstoxAuthState> {
    try {
      const tokenUrl = 'https://api.upstox.com/v2/login/authorization/token';
      const response = await axios.post<UpstoxToken>(
        tokenUrl,
        new URLSearchParams({
          code: authCode,
          client_id: this.config.apiKey,
          client_secret: this.config.apiSecret,
          redirect_uri: this.config.redirectUri,
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
   * Set the sandbox token directly
   * This is used when running in sandbox mode
   */
  public setSandboxToken(token: string): void {
    if (!this.config.useSandbox) {
      throw new Error('Cannot set sandbox token when not in sandbox mode');
    }

    this.config.sandboxToken = token;
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
