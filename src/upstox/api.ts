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
import config, { EnvironmentType } from '../config/config';

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
    this.client.interceptors.request.use(async (axiosConfig) => {
      // Only log the first API call
      if (!this.isInitialized) {
        console.info(`Making API calls to ${this.baseUrl} (${config.upstox.environment === EnvironmentType.SANDBOX ? 'Sandbox' : 'Live'} mode)`);
        this.isInitialized = true;
      }
      
      try {
        const token = await authManager.getAccessToken();
        axiosConfig.headers.Authorization = `Bearer ${token}`;
        return axiosConfig;
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
    
    // Direct response for non-standard formats
    if (response.data && typeof response.data === 'object') {
      return response.data as T;
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
      if (!instruments || instruments.length === 0) {
        throw new Error('No instruments provided');
      }
      
      // Format each instrument correctly
      const formattedInstruments = instruments.map(instrument => {
        // Check if the instrument already contains a pipe (|) character
        if (instrument.includes('|')) {
          return instrument;
        }
        
        // Otherwise, default to NSE_EQ exchange if none provided
        return `NSE_EQ|${instrument}`;
      });
      
      console.log(`Fetching market data for: ${formattedInstruments.join(', ')}`);
      
      // Build the parameters
      const params = new URLSearchParams();
      formattedInstruments.forEach(instrument => {
        params.append('instrument_key', instrument);
      });

      // Make the request
      const response = await this.client.get(`/market/quotes?${params.toString()}`);
      console.log('Market data response status:', response.status);
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching market data:', error);
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
      const response = await this.client.get('/portfolio/positions');
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
      // Format exchange if needed
      if (!exchange.includes('_')) {
        exchange = exchange.toUpperCase() + '_EQ';
      }
      console.log(`Fetching instruments for exchange: ${exchange}`);
      
      // Try both endpoints - v2 method requires a segment
      try {
        // First try with master API
        const response = await this.client.get(`/market/instruments?exchange=${exchange}`);
        return this.handleResponse(response);
      } catch (error) {
        // Fallback to index-based API
        console.log('Falling back to instrument index API...');
        const response = await this.client.get(`/market/instruments/master?exchange=${exchange}`);
        return this.handleResponse(response);
      }
    } catch (error) {
      console.error('Error fetching instruments:', error);
      return this.handleApiError(error, `Failed to fetch instruments for ${exchange}`);
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
      
      // Format a detailed error message
      let detailedMessage: string;
      if (error.response.data && typeof error.response.data === 'object') {
        detailedMessage = JSON.stringify(error.response.data);
      } else {
        detailedMessage = error.response.data?.message || error.message;
      }
      
      console.error(`API Error ${status}:`, detailedMessage);
      throw new Error(`API Error ${status}: ${error.message}`);
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
