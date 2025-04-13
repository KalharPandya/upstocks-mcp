import { McpResource, McpResourceContent } from './types';
import { upstoxApi } from '../upstox/api';
import { mcpCore } from './core';

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
      
      case 'positions':
        return await this.getPositions();
      
      case 'holdings':
        return await this.getHoldings();
      
      case 'orders':
        return await this.getOrders();
      
      case 'profile':
        return await this.getProfile();
      
      case 'instruments':
        return await this.getInstruments(resourceParams);
      
      default:
        throw new Error(`Resource not found: ${resource_id}`);
    }
  }

  /**
   * Get market data for specified instruments
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
      // Fetch market data from Upstox
      const marketData = await upstoxApi.getMarketData(instruments);
      
      return {
        content: JSON.stringify(marketData),
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
