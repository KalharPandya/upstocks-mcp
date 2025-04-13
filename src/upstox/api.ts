import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authManager } from './auth';
import {
  UpstoxOrderParams,
  UpstoxOrder,
  UpstoxPosition,
  UpstoxHolding,
  UpstoxInstrument,
  UpstoxMarketFeed
} from './types';
import config, { EnvironmentType, UpstoxConfig } from '../config/config';

/**
 * Upstox API client for interacting with the Upstox REST API
 */
export class UpstoxApiClient {
  private baseUrl = 'https://api.upstox.com/v2';
  private client: AxiosInstance;
  private isInitialized = false;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include the auth token
    this.client.interceptors.request.use(async (config) => {
      // Only log the first API call
      if (!this.isInitialized) {
        console.info(`Making API calls to ${this.baseUrl} (${config?.environment === EnvironmentType.SANDBOX ? 'Sandbox' : 'Live'} mode)`);
          const upstoxConfig = config.upstox as UpstoxConfig;
          console.info(`Making API calls to ${this.baseUrl} (${upstoxConfig.environment === EnvironmentType.SANDBOX ? 'Sandbox' : 'Live'} mode)`);          this.isInitialized = true;
      }
      
      try {
        const token = await authManager.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error) {
        console.error('Authentication error:', error);
        throw error;
      }
    });

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Force re-authentication on 401 errors
          authManager.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Helper method to handle API responses
   */
  private handleResponse<T>(response: AxiosResponse): T {
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    } else if (response.data && response.data.status === 'error') {
      throw new Error(response.data.message || 'Unknown API error');
    }
    return response.data;
  }

  /**
   * Get user profile information
   */
  async getProfile(): Promise<any> {
    try {
      const response = await this.client.get('/user/profile');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch user profile');
    }
  }

  /**
   * Get market data for specified instruments
   */
  async getMarketData(instruments: string[]): Promise<Record<string, UpstoxMarketFeed>> {
    try {
      const params = new URLSearchParams();
      instruments.forEach(instrument => {
        params.append('instrument_key', instrument);
      });

      const response = await this.client.get(`/market/quote/full?${params.toString()}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch market data');
    }
  }

  /**
   * Place an order
   */
  async placeOrder(orderParams: UpstoxOrderParams): Promise<UpstoxOrder> {
    try {
      const response = await this.client.post('/order/place', orderParams);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to place order');
    }
  }

  /**
   * Get all orders
   */
  async getOrders(): Promise<UpstoxOrder[]> {
    try {
      const response = await this.client.get('/order/get-orders');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch orders');
    }
  }

  /**
   * Get details of a specific order
   */
  async getOrder(orderId: string): Promise<UpstoxOrder> {
    try {
      const response = await this.client.get(`/order/get-order-details?order_id=${orderId}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch order details');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<any> {
    try {
      const response = await this.client.delete(`/order/cancel?order_id=${orderId}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to cancel order');
    }
  }

  /**
   * Get positions
   */
  async getPositions(): Promise<UpstoxPosition[]> {
    try {
      const response = await this.client.get('/trading/positions');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch positions');
    }
  }

  /**
   * Get holdings
   */
  async getHoldings(): Promise<UpstoxHolding[]> {
    try {
      const response = await this.client.get('/portfolio/holdings');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch holdings');
    }
  }

  /**
   * Get available instruments
   */
  async getInstruments(exchange: string): Promise<UpstoxInstrument[]> {
    try {
      const response = await this.client.get(`/market/instruments/master?exchange=${exchange}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch instruments');
    }
  }

  /**
   * Get fund details
   */
  async getFunds(): Promise<any> {
    try {
      const response = await this.client.get('/user/funds-and-margin');
      return this.handleResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch funds');
    }
  }

  /**
   * Handle API errors with standardized formatting
   */
  private handleApiError(error: any, defaultMessage: string): never {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      throw new Error(`API Error ${status}: ${message}`);
    } else {
      throw new Error(`${defaultMessage}: ${(error as Error).message}`);
    }
  }

  /**
   * Determines if the API is ready to use (authenticated)
   */
  async isReady(): Promise<boolean> {
    try {
      await authManager.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const upstoxApi = new UpstoxApiClient();
