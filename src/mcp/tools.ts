import { McpTool, McpToolResult } from './types';
import { upstoxApi } from '../upstox/api';
import { mcpCore } from './core';
import { 
  UpstoxOrderParams, 
  UpstoxOrderType, 
  UpstoxTransactionType,
  UpstoxProductType,
  UpstoxOrderValidity
} from '../upstox/types';

/**
 * MCP Tools implementation for Upstox operations
 */
export class McpTools {
  /**
   * Register all tool-related methods with the MCP core
   */
  initialize(): void {
    mcpCore.registerMethod('mcp.tools.list', this.listTools.bind(this));
    mcpCore.registerMethod('mcp.tools.execute', this.executeTool.bind(this));
  }

  /**
   * List available tools
   */
  async listTools(params: { session_id: string }): Promise<{ tools: McpTool[] }> {
    // Define the available tools
    const tools: McpTool[] = [
      {
        id: 'place-order',
        name: 'Place Order',
        description: 'Place a new trading order',
        parameters: {
          type: 'object',
          properties: {
            instrument_token: {
              type: 'string',
              description: 'Instrument identifier (e.g., "INFY" or "NSE_EQ|INFY")'
            },
            transaction_type: {
              type: 'string',
              enum: ['BUY', 'SELL'],
              description: 'Buy or sell order'
            },
            quantity: {
              type: 'integer',
              description: 'Number of shares'
            },
            order_type: {
              type: 'string',
              enum: ['MARKET', 'LIMIT', 'SL', 'SL-M'],
              description: 'Type of order'
            },
            price: {
              type: 'number',
              description: 'Price for limit orders'
            },
            trigger_price: {
              type: 'number',
              description: 'Trigger price for stop-loss orders'
            },
            product: {
              type: 'string',
              enum: ['D', 'I', 'M', 'CO', 'OCO'],
              description: 'Product type: D (Delivery), I (Intraday), M (Margin), CO (Cover Order), OCO (Bracket Order)'
            },
            validity: {
              type: 'string',
              enum: ['DAY', 'IOC'],
              description: 'Order validity: DAY or IOC (Immediate or Cancel)'
            },
            disclosed_quantity: {
              type: 'integer',
              description: 'Disclosed quantity for iceberg orders'
            },
            is_amo: {
              type: 'boolean',
              description: 'Whether this is an After Market Order'
            }
          },
          required: ['instrument_token', 'transaction_type', 'quantity', 'order_type']
        }
      },
      {
        id: 'cancel-order',
        name: 'Cancel Order',
        description: 'Cancel an existing order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'ID of the order to cancel'
            }
          },
          required: ['order_id']
        }
      },
      {
        id: 'get-order',
        name: 'Get Order Details',
        description: 'Get details of a specific order',
        parameters: {
          type: 'object',
          properties: {
            order_id: {
              type: 'string',
              description: 'ID of the order to retrieve'
            }
          },
          required: ['order_id']
        }
      }
    ];

    return { tools };
  }

  /**
   * Execute a specific tool
   */
  async executeTool(params: { 
    session_id: string; 
    tool_id: string; 
    [key: string]: any 
  }): Promise<McpToolResult> {
    const { tool_id, session_id, ...toolParams } = params;

    try {
      switch (tool_id) {
        case 'place-order':
          return await this.placeOrder(toolParams);
        
        case 'cancel-order':
          return await this.cancelOrder(toolParams);
        
        case 'get-order':
          return await this.getOrder(toolParams);
        
        default:
          throw new Error(`Tool not found: ${tool_id}`);
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      return {
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Place an order
   */
  private async placeOrder(params: any): Promise<McpToolResult> {
    try {
      console.log('Placing order with parameters:', JSON.stringify(params, null, 2));
      
      // Validate required parameters
      this.validateRequiredParams(params, ['instrument_token', 'transaction_type', 'quantity', 'order_type']);
      
      // Format instrument token if needed (e.g., "INFY" -> "NSE_EQ|INFY")
      if (!params.instrument_token.includes('|')) {
        params.instrument_token = `NSE_EQ|${params.instrument_token}`;
      }
      
      // Validate transaction type
      if (!Object.values(UpstoxTransactionType).includes(params.transaction_type)) {
        throw new Error(`Invalid transaction type: ${params.transaction_type}. Must be BUY or SELL.`);
      }
      
      // Validate order type
      if (!Object.values(UpstoxOrderType).includes(params.order_type)) {
        throw new Error(`Invalid order type: ${params.order_type}. Must be MARKET, LIMIT, SL, or SL-M.`);
      }
      
      // Additional validations for specific order types
      if ((params.order_type === UpstoxOrderType.LIMIT || params.order_type === UpstoxOrderType.SL) && 
          typeof params.price !== 'number') {
        throw new Error('Price is required for LIMIT and SL orders');
      }
      
      if ((params.order_type === UpstoxOrderType.SL || params.order_type === UpstoxOrderType.SLM) && 
          typeof params.trigger_price !== 'number') {
        throw new Error('Trigger price is required for SL and SL-M orders');
      }
      
      // Prepare order parameters
      const orderParams: UpstoxOrderParams = {
        instrument_token: params.instrument_token,
        transaction_type: params.transaction_type as UpstoxTransactionType,
        quantity: params.quantity,
        order_type: params.order_type as UpstoxOrderType,
        price: params.price,
        trigger_price: params.trigger_price,
        product: params.product as UpstoxProductType || UpstoxProductType.DELIVERY,
        validity: params.validity as UpstoxOrderValidity || UpstoxOrderValidity.DAY,
        disclosed_quantity: params.disclosed_quantity,
        is_amo: params.is_amo
      };
      
      console.log('Placing order with Upstox API:', orderParams);
      
      // Place the order using the Upstox API
      const result = await upstoxApi.placeOrder(orderParams);
      console.log('Order placement result:', result);
      
      return { 
        result: {
          status: 'success',
          order: result
        }
      };
    } catch (error) {
      console.error('Error placing order:', error);
      return {
        error: {
          code: 'PLACE_ORDER_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Cancel an order
   */
  private async cancelOrder(params: any): Promise<McpToolResult> {
    try {
      // Validate required parameters
      this.validateRequiredParams(params, ['order_id']);
      
      // Cancel the order using the Upstox API
      const result = await upstoxApi.cancelOrder(params.order_id);
      
      return { 
        result: {
          status: 'success',
          order_id: params.order_id,
          message: 'Order cancelled successfully'
        } 
      };
    } catch (error) {
      return {
        error: {
          code: 'CANCEL_ORDER_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Get order details
   */
  private async getOrder(params: any): Promise<McpToolResult> {
    try {
      // Validate required parameters
      this.validateRequiredParams(params, ['order_id']);
      
      // Get the order using the Upstox API
      const result = await upstoxApi.getOrder(params.order_id);
      
      return { 
        result: {
          status: 'success',
          order: result
        } 
      };
    } catch (error) {
      return {
        error: {
          code: 'GET_ORDER_ERROR',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Validate that required parameters are present
   */
  private validateRequiredParams(params: any, requiredParams: string[]): void {
    for (const param of requiredParams) {
      if (params[param] === undefined) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }
  }
}

// Export a singleton instance
export const mcpTools = new McpTools();
