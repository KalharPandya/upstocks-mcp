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
import endpoints, { buildUrl } from './endpoints';

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
   * 
   * Uses the correct endpoint '/market-quote/quotes' based on the official Upstox Python client
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
      
      // Use the correct endpoint format based on the Upstox Python SDK
      const endpoint = '/market-quote/quotes';
      
      // Join instruments with comma for the API parameter format
      const symbol = formattedInstruments.join(',');
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('symbol', symbol);
      
      // Make the request with the correct endpoint and parameter format
      const response = await this.client.get(`${endpoint}?${params.toString()}`);
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
      console.log('Placing order with params:', JSON.stringify(orderParams, null, 2));
      
      // Format instrument token if needed
      if (!orderParams.instrument_token.includes('|')) {
        orderParams.instrument_token = `NSE_EQ|${orderParams.instrument_token}`;
        console.log(`Formatted instrument token to: ${orderParams.instrument_token}`);
      }
      
      // Convert order parameters to match Upstox API's expected format
      const apiOrderParams = {
        ...orderParams,
        // Add additional fields that might be required by the API
        variety: 'regular',  // default variety
        quantity: Number(orderParams.quantity), // ensure quantity is a number
        price: orderParams.price ? Number(orderParams.price) : undefined,
        trigger_price: orderParams.trigger_price ? Number(orderParams.trigger_price) : undefined,
      };
      
      console.log('Final order request:', JSON.stringify(apiOrderParams, null, 2));
      
      // Place the order using the centralized endpoint
      const response = await this.client.post('/order/place', apiOrderParams);
      console.log('Order placement response:', response.status);
      
      const result = this.handleResponse<UpstoxOrder>(response);
      console.log('Order placement result:', JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('Error placing order:', error);
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
      const url = `/order/get-order-details?order_id=${orderId}`;
      const response = await this.client.get(url);
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
      const url = `/order/cancel?order_id=${orderId}`;
      const response = await this.client.delete(url);
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
        // First try with regular API
        const response = await this.client.get(`/market/instruments?exchange=${exchange}`);
        return this.handleResponse(response);
      } catch (error) {
        // Fallback to master API
        console.log('Falling back to instrument master API...');
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
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          // Handle array of errors from the API
          detailedMessage = error.response.data.errors.map((e: any) => e.message || e).join(', ');
        } else if (error.response.data.message) {
          detailedMessage = error.response.data.message;
        } else {
          detailedMessage = JSON.stringify(error.response.data);
        }
      } else {
        detailedMessage = error.response.data?.message || error.message;
      }
      
      console.error(`API Error ${status}:`, detailedMessage);
      throw new Error(`API Error ${status}: ${detailedMessage}`);
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
