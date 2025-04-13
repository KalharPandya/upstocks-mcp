import { McpResource, McpResourceContent } from './types';
import { upstoxApi } from '../upstox/api';
import { mcpCore } from './core';
import { UpstoxCandleInterval } from '../upstox/types';

/**
 * MCP Resources implementation for Upstox data
 */
export class McpResources {
  /**
   * Register all resource-related methods with the MCP core
   */
  initialize(): void {
    mcpCore.registerMethod('mcp.resources.list', this.listResources.bind(this));
    mcpCore.registerMethod('mcp.resources.get', this.getResource.bind(this));
  }

  /**
   * List available resources
   */
  async listResources(params: { session_id: string }): Promise<{ resources: McpResource[] }> {
    // Define the available resources
    const resources: McpResource[] = [
      {
        id: 'market-data',
        name: 'Market Data',
        description: 'Real-time market data for specified instruments',
        metadata: {
          parameters: {
            instruments: {
              type: 'array',
              description: 'List of instrument symbols (e.g., "INFY" or complete symbol like "NSE_EQ|INFY")'
            }
          }
        }
      },
      {
        id: 'historical-data',
        name: 'Historical Data',
        description: 'Historical OHLC candle data for a specific instrument and time range',
        metadata: {
          parameters: {
            instrument: {
              type: 'string',
              description: 'Instrument symbol (e.g., "INFY" or "NSE_EQ|INFY")'
            },
            interval: {
              type: 'string',
              description: 'Time interval (1minute, 5minute, 15minute, 30minute, 1hour, 1day, 1week, 1month)'
            },
            from_date: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format'
            },
            to_date: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format'
            }
          }
        }
      },
      {
        id: 'positions',
        name: 'Positions',
        description: 'Current positions in the portfolio',
      },
      {
        id: 'holdings',
        name: 'Holdings',
        description: 'Current holdings in the portfolio',
      },
      {
        id: 'orders',
        name: 'Orders',
        description: 'List of orders',
      },
      {
        id: 'profile',
        name: 'User Profile',
        description: 'User profile information',
      },
      {
        id: 'funds',
        name: 'Funds and Balance',
        description: 'User funds, margins, and available balance information',
      },
      {
        id: 'instruments',
        name: 'Instruments',
        description: 'Available trading instruments',
        metadata: {
          parameters: {
            exchange: {
              type: 'string',
              description: 'Exchange name (e.g., "NSE", "BSE") or complete code (e.g., "NSE_EQ")'
            }
          }
        }
      }
    ];

    return { resources };
  }

  /**
   * Get specific resource content
   */
  async getResource(params: { 
    session_id: string; 
    resource_id: string; 
    [key: string]: any 
  }): Promise<McpResourceContent> {
    const { resource_id, ...resourceParams } = params;

    switch (resource_id) {
      case 'market-data':
        return await this.getMarketData(resourceParams);
      
      case 'historical-data':
        return await this.getHistoricalData(resourceParams);
      
      case 'positions':
        return await this.getPositions();
      
      case 'holdings':
        return await this.getHoldings();
      
      case 'orders':
        return await this.getOrders();
      
      case 'profile':
        return await this.getProfile();
        
      case 'funds':
        return await this.getFunds();
      
      case 'instruments':
        return await this.getInstruments(resourceParams);
      
      default:
        throw new Error(`Resource not found: ${resource_id}`);
    }
  }

  /**
   * Get market data for specified instruments
   * 
   * Updated to handle the new API endpoint format
   */
  private async getMarketData(params: any): Promise<McpResourceContent> {
    // Validate parameters
    if (!params.instruments) {
      throw new Error('No instruments specified. Please provide at least one instrument.');
    }
    
    const instruments = Array.isArray(params.instruments) 
      ? params.instruments 
      : [params.instruments];
      
    if (instruments.length === 0) {
      throw new Error('Empty instruments array. Please provide at least one instrument.');
    }

    try {
      // Log the request to aid in debugging
      console.log(`MCP Resource: Requesting market data for instruments: ${instruments.join(', ')}`);
      
      // Fetch market data from Upstox
      const marketData = await upstoxApi.getMarketData(instruments);
      
      // If we get an empty object, include a helpful message in the JSON response
      // But don't modify the actual result object to avoid type errors
      if (Object.keys(marketData).length === 0) {
        return {
          content: JSON.stringify({
            message: "No market data returned. This may be due to market hours or invalid instrument symbols.",
            instruments_requested: instruments
          }, null, 2),
          content_type: 'application/json'
        };
      }
      
      return {
        content: JSON.stringify(marketData, null, 2),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting market data:', errorMessage);
      
      // Return a more useful error message
      throw new Error(`Failed to get market data: ${errorMessage}. Make sure you're using valid instrument symbols like "NSE_EQ|INFY" or just "INFY".`);
    }
  }

  /**
   * Get historical data for a specific instrument
   */
  private async getHistoricalData(params: any): Promise<McpResourceContent> {
    // Validate parameters
    if (!params.instrument) {
      throw new Error('Instrument symbol is required');
    }
    
    if (!params.interval) {
      throw new Error('Interval is required (e.g., "1minute", "5minute", "1day")');
    }
    
    if (!params.from_date) {
      throw new Error('Start date (from_date) is required in YYYY-MM-DD format');
    }
    
    if (!params.to_date) {
      throw new Error('End date (to_date) is required in YYYY-MM-DD format');
    }

    // Check if interval is valid
    const validIntervals = Object.values(UpstoxCandleInterval);
    if (!validIntervals.includes(params.interval)) {
      throw new Error(`Invalid interval: ${params.interval}. Valid intervals are: ${validIntervals.join(', ')}`);
    }

    try {
      console.log(`MCP Resource: Requesting historical data for ${params.instrument} with interval ${params.interval}`);
      console.log(`Time range: ${params.from_date} to ${params.to_date}`);
      
      const historicalData = await upstoxApi.getHistoricalData({
        instrument: params.instrument,
        interval: params.interval,
        from_date: params.from_date,
        to_date: params.to_date,
        format: params.format
      });
      
      return {
        content: JSON.stringify(historicalData, null, 2),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting historical data:', errorMessage);
      
      throw new Error(`Failed to get historical data: ${errorMessage}. Make sure the instrument, interval, and dates are valid.`);
    }
  }
  
  /**
   * Get funds and margin information
   */
  private async getFunds(): Promise<McpResourceContent> {
    try {
      console.log('MCP Resource: Requesting funds and margin information');
      
      // Fetch funds data
      const fundsData = await upstoxApi.getFunds();
      
      // Extract key information including available balance
      const formattedData = {
        ...fundsData,
        // Add a quick access field for available balance
        summary: {
          available_balance: fundsData.available_margin || fundsData.available_cash || 0,
          total_margin_used: fundsData.used_margin || 0,
          available_cash: fundsData.available_cash || 0
        }
      };
      
      return {
        content: JSON.stringify(formattedData, null, 2),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting funds and margins:', errorMessage);
      throw new Error(`Failed to get funds information: ${errorMessage}`);
    }
  }

  /**
   * Get positions
   */
  private async getPositions(): Promise<McpResourceContent> {
    try {
      const positions = await upstoxApi.getPositions();
      
      return {
        content: JSON.stringify(positions),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting positions:', errorMessage);
      throw error;
    }
  }

  /**
   * Get holdings
   */
  private async getHoldings(): Promise<McpResourceContent> {
    try {
      const holdings = await upstoxApi.getHoldings();
      
      return {
        content: JSON.stringify(holdings),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting holdings:', errorMessage);
      throw error;
    }
  }

  /**
   * Get orders
   */
  private async getOrders(): Promise<McpResourceContent> {
    try {
      const orders = await upstoxApi.getOrders();
      
      return {
        content: JSON.stringify(orders),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting orders:', errorMessage);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  private async getProfile(): Promise<McpResourceContent> {
    try {
      const profile = await upstoxApi.getProfile();
      
      return {
        content: JSON.stringify(profile),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting profile:', errorMessage);
      throw error;
    }
  }

  /**
   * Get instruments for a specified exchange
   */
  private async getInstruments(params: any): Promise<McpResourceContent> {
    // Validate parameters
    if (!params.exchange || typeof params.exchange !== 'string') {
      throw new Error('Exchange parameter is required (e.g., "NSE", "BSE", or complete code like "NSE_EQ")');
    }

    try {
      const instruments = await upstoxApi.getInstruments(params.exchange);
      
      return {
        content: JSON.stringify(instruments),
        content_type: 'application/json'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error getting instruments:', errorMessage);
      
      // Return a more useful error message
      throw new Error(`Failed to get instruments: ${errorMessage}. Make sure you're using a valid exchange like "NSE", "BSE", or "NSE_EQ".`);
    }
  }
}

// Export a singleton instance
export const mcpResources = new McpResources();
