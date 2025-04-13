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
              description: 'List of instrument keys (e.g., NSE_EQ|INFY)'
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
              description: 'Exchange code (e.g., NSE_EQ, BSE_EQ)'
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
        return this.getMarketData(resourceParams);
      
      case 'positions':
        return this.getPositions();
      
      case 'holdings':
        return this.getHoldings();
      
      case 'orders':
        return this.getOrders();
      
      case 'profile':
        return this.getProfile();
      
      case 'instruments':
        return this.getInstruments(resourceParams);
      
      default:
        throw new Error(`Resource not found: ${resource_id}`);
    }
  }

  /**
   * Get market data for specified instruments
   */
  private async getMarketData(params: any): Promise<McpResourceContent> {
    // Validate parameters
    if (!params.instruments || !Array.isArray(params.instruments) || params.instruments.length === 0) {
      throw new Error('Valid instruments array is required');
    }

    // Fetch market data from Upstox
    const marketData = await upstoxApi.getMarketData(params.instruments);
    
    return {
      content: JSON.stringify(marketData),
      content_type: 'application/json'
    };
  }

  /**
   * Get positions
   */
  private async getPositions(): Promise<McpResourceContent> {
    const positions = await upstoxApi.getPositions();
    
    return {
      content: JSON.stringify(positions),
      content_type: 'application/json'
    };
  }

  /**
   * Get holdings
   */
  private async getHoldings(): Promise<McpResourceContent> {
    const holdings = await upstoxApi.getHoldings();
    
    return {
      content: JSON.stringify(holdings),
      content_type: 'application/json'
    };
  }

  /**
   * Get orders
   */
  private async getOrders(): Promise<McpResourceContent> {
    const orders = await upstoxApi.getOrders();
    
    return {
      content: JSON.stringify(orders),
      content_type: 'application/json'
    };
  }

  /**
   * Get user profile
   */
  private async getProfile(): Promise<McpResourceContent> {
    const profile = await upstoxApi.getProfile();
    
    return {
      content: JSON.stringify(profile),
      content_type: 'application/json'
    };
  }

  /**
   * Get instruments for a specified exchange
   */
  private async getInstruments(params: any): Promise<McpResourceContent> {
    // Validate parameters
    if (!params.exchange || typeof params.exchange !== 'string') {
      throw new Error('Valid exchange is required');
    }

    const instruments = await upstoxApi.getInstruments(params.exchange);
    
    return {
      content: JSON.stringify(instruments),
      content_type: 'application/json'
    };
  }
}

// Export a singleton instance
export const mcpResources = new McpResources();
