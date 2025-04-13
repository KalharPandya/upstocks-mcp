#!/usr/bin/env node

import axios from 'axios';
import readline from 'readline';
import WebSocket from 'ws';
import { JsonRpcRequest, JsonRpcResponse } from '../mcp/types';
import config from '../config/config';

/**
 * Interactive test client for the Upstox MCP server
 * Allows testing MCP functionality through an interactive CLI
 */

// Configuration
const testConfig = {
  httpUrl: `http://${config.server.host || '0.0.0.0'}:${config.server.port}/mcp`,
  wsUrl: `ws://${config.server.host || '0.0.0.0'}:${config.server.port}`,
  sessionId: ''
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to make HTTP JSON-RPC requests
async function makeHttpRequest(method: string, params?: any): Promise<any> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method,
    params
  };

  try {
    console.log(`Sending request to ${testConfig.httpUrl}...`);
    const response = await axios.post(testConfig.httpUrl, request);
    const result = response.data as JsonRpcResponse;
    
    if (result.error) {
      throw new Error(`RPC Error ${result.error.code}: ${result.error.message}`);
    }
    
    return result.result;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
      console.error(error.response.data);
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }
    throw error;
  }
}

// WebSocket client
let ws: WebSocket | null = null;

// Helper function to make WebSocket JSON-RPC requests
function makeWsRequest(method: string, params?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket not connected'));
      return;
    }
    
    const requestId = Date.now().toString();
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };
    
    // Set up one-time response handler
    const responseHandler = (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString()) as JsonRpcResponse;
        
        if (response.id === requestId) {
          // Remove this listener
          ws!.removeListener('message', responseHandler);
          
          if (response.error) {
            reject(new Error(`RPC Error ${response.error.code}: ${response.error.message}`));
          } else {
            resolve(response.result);
          }
        }
      } catch (error) {
        reject(error);
      }
    };
    
    // Add message handler
    ws.on('message', responseHandler);
    
    // Send the request
    ws.send(JSON.stringify(request));
  });
}

// Initialize WebSocket connection
async function connectWebSocket(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to WebSocket at ${testConfig.wsUrl}...`);
    ws = new WebSocket(testConfig.wsUrl);
    
    ws.on('open', () => {
      console.log('WebSocket connected');
      resolve();
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });
  });
}

// Close WebSocket connection
function closeWebSocket(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
}

// Test MCP discovery
async function testDiscovery(): Promise<void> {
  console.log('\n--- Testing MCP Discovery ---');
  
  try {
    // Try using HTTP
    console.log('Making discovery request via HTTP...');
    const httpResult = await makeHttpRequest('mcp.discover');
    console.log('Server capabilities:');
    console.log(JSON.stringify(httpResult, null, 2));
    
    // Try using WebSocket if connected
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('\nMaking discovery request via WebSocket...');
      const wsResult = await makeWsRequest('mcp.discover');
      console.log('Server capabilities (WebSocket):');
      console.log(JSON.stringify(wsResult, null, 2));
    }
  } catch (error) {
    console.error('Discovery test failed:', (error as Error).message);
  }
}

// Test session management
async function testSession(): Promise<void> {
  console.log('\n--- Testing Session Management ---');
  
  try {
    // Start a new session
    console.log('Starting a new session...');
    const sessionResult = await makeHttpRequest('mcp.session.start');
    testConfig.sessionId = sessionResult.session_id;
    console.log(`Session started with ID: ${testConfig.sessionId}`);
    
    // Ask if user wants to end the session
    const endSession = await prompt('Do you want to end the session? (y/n): ');
    
    if (endSession.toLowerCase() === 'y') {
      console.log('Ending the session...');
      await makeHttpRequest('mcp.session.end', { session_id: testConfig.sessionId });
      console.log('Session ended');
      testConfig.sessionId = '';
    }
  } catch (error) {
    console.error('Session test failed:', (error as Error).message);
  }
}

// Test resource listing
async function testResourceList(): Promise<void> {
  console.log('\n--- Testing Resource Listing ---');
  
  try {
    // Ensure we have a session
    if (!testConfig.sessionId) {
      const sessionResult = await makeHttpRequest('mcp.session.start');
      testConfig.sessionId = sessionResult.session_id;
      console.log(`Started a new session with ID: ${testConfig.sessionId}`);
    }
    
    // List resources
    console.log('Listing available resources...');
    const resourcesResult = await makeHttpRequest('mcp.resources.list', { session_id: testConfig.sessionId });
    console.log('Available resources:');
    
    if (resourcesResult.resources && resourcesResult.resources.length > 0) {
      resourcesResult.resources.forEach((resource: any) => {
        console.log(`- ${resource.id}: ${resource.name} - ${resource.description}`);
      });
    } else {
      console.log('No resources available');
    }
  } catch (error) {
    console.error('Resource listing test failed:', (error as Error).message);
  }
}

// Test resource retrieval
async function testResourceGet(): Promise<void> {
  console.log('\n--- Testing Resource Retrieval ---');
  
  try {
    // Ensure we have a session
    if (!testConfig.sessionId) {
      const sessionResult = await makeHttpRequest('mcp.session.start');
      testConfig.sessionId = sessionResult.session_id;
      console.log(`Started a new session with ID: ${testConfig.sessionId}`);
    }
    
    // Get user input for resource to retrieve
    const resourceId = await prompt('Enter resource ID to retrieve (e.g., market-data, profile): ');
    
    // If market-data is selected, prompt for instruments
    let additionalParams: any = {};
    if (resourceId === 'market-data') {
      const instruments = await prompt('Enter instrument symbols separated by commas (e.g., NSE_EQ|INFY,NSE_EQ|TCS): ');
      additionalParams.instruments = instruments.split(',');
    } else if (resourceId === 'instruments') {
      const exchange = await prompt('Enter exchange (e.g., NSE_EQ): ');
      additionalParams.exchange = exchange;
    }
    
    // Retrieve the resource
    console.log(`Retrieving resource: ${resourceId}...`);
    const resourceResult = await makeHttpRequest('mcp.resources.get', { 
      session_id: testConfig.sessionId,
      resource_id: resourceId,
      ...additionalParams
    });
    
    // Parse and display the content if it's JSON
    if (resourceResult.content_type === 'application/json') {
      try {
        const content = JSON.parse(resourceResult.content);
        console.log('Resource content:');
        console.log(JSON.stringify(content, null, 2));
      } catch {
        console.log('Resource content (could not parse JSON):');
        console.log(resourceResult.content);
      }
    } else {
      console.log(`Resource content (${resourceResult.content_type}):`);
      console.log(resourceResult.content);
    }
  } catch (error) {
    console.error('Resource retrieval test failed:', (error as Error).message);
  }
}

// Test tool listing
async function testToolList(): Promise<void> {
  console.log('\n--- Testing Tool Listing ---');
  
  try {
    // Ensure we have a session
    if (!testConfig.sessionId) {
      const sessionResult = await makeHttpRequest('mcp.session.start');
      testConfig.sessionId = sessionResult.session_id;
      console.log(`Started a new session with ID: ${testConfig.sessionId}`);
    }
    
    // List tools
    console.log('Listing available tools...');
    const toolsResult = await makeHttpRequest('mcp.tools.list', { session_id: testConfig.sessionId });
    console.log('Available tools:');
    
    if (toolsResult.tools && toolsResult.tools.length > 0) {
      toolsResult.tools.forEach((tool: any) => {
        console.log(`- ${tool.id}: ${tool.name} - ${tool.description}`);
      });
    } else {
      console.log('No tools available');
    }
  } catch (error) {
    console.error('Tool listing test failed:', (error as Error).message);
  }
}

// Test tool execution
async function testToolExecution(): Promise<void> {
  console.log('\n--- Testing Tool Execution ---');
  
  try {
    // Ensure we have a session
    if (!testConfig.sessionId) {
      const sessionResult = await makeHttpRequest('mcp.session.start');
      testConfig.sessionId = sessionResult.session_id;
      console.log(`Started a new session with ID: ${testConfig.sessionId}`);
    }
    
    // Get user input for tool to execute
    const toolId = await prompt('Enter tool ID to execute (e.g., place-order, cancel-order): ');
    
    // Build parameters based on tool selected
    let params: any = { session_id: testConfig.sessionId, tool_id: toolId };
    
    if (toolId === 'place-order') {
      const instrument = await prompt('Enter instrument (e.g., NSE_EQ|INFY): ');
      const txnType = await prompt('Enter transaction type (BUY/SELL): ');
      const quantity = await prompt('Enter quantity: ');
      const orderType = await prompt('Enter order type (MARKET/LIMIT/SL/SL-M): ');
      
      params.instrument_token = instrument;
      params.transaction_type = txnType;
      params.quantity = parseInt(quantity, 10);
      params.order_type = orderType;
      
      if (orderType === 'LIMIT' || orderType === 'SL') {
        const price = await prompt('Enter price: ');
        params.price = parseFloat(price);
      }
      
      if (orderType === 'SL' || orderType === 'SL-M') {
        const triggerPrice = await prompt('Enter trigger price: ');
        params.trigger_price = parseFloat(triggerPrice);
      }
      
    } else if (toolId === 'cancel-order' || toolId === 'get-order') {
      const orderId = await prompt('Enter order ID: ');
      params.order_id = orderId;
    }
    
    // Execute the tool
    console.log(`Executing tool: ${toolId}...`);
    console.log('With parameters:', JSON.stringify(params, null, 2));
    
    const toolResult = await makeHttpRequest('mcp.tools.execute', params);
    console.log('Execution result:');
    console.log(JSON.stringify(toolResult, null, 2));
  } catch (error) {
    console.error('Tool execution test failed:', (error as Error).message);
  }
}

// Main menu
async function showMainMenu(): Promise<void> {
  while (true) {
    console.log('\n=== UPSTOX MCP TEST CLIENT ===');
    console.log('1. Test MCP Discovery');
    console.log('2. Test Session Management');
    console.log('3. Test Resource Listing');
    console.log('4. Test Resource Retrieval');
    console.log('5. Test Tool Listing');
    console.log('6. Test Tool Execution');
    console.log('7. Connect WebSocket');
    console.log('8. Disconnect WebSocket');
    console.log('9. Exit');
    
    if (testConfig.sessionId) {
      console.log(`\nCurrent Session ID: ${testConfig.sessionId}`);
    }
    
    const choice = await prompt('\nEnter your choice (1-9): ');
    
    switch (choice) {
      case '1':
        await testDiscovery();
        break;
      case '2':
        await testSession();
        break;
      case '3':
        await testResourceList();
        break;
      case '4':
        await testResourceGet();
        break;
      case '5':
        await testToolList();
        break;
      case '6':
        await testToolExecution();
        break;
      case '7':
        try {
          await connectWebSocket();
        } catch (error) {
          console.error('Failed to connect WebSocket:', (error as Error).message);
        }
        break;
      case '8':
        closeWebSocket();
        break;
      case '9':
        console.log('Exiting...');
        closeWebSocket();
        rl.close();
        return;
      default:
        console.log('Invalid choice, please try again.');
    }
    
    // Wait for user to continue
    await prompt('\nPress Enter to continue...');
  }
}

// Start the application
(async () => {
  console.log('Interactive test client for Upstox MCP Server');
  console.log(`HTTP Endpoint: ${testConfig.httpUrl}`);
  console.log(`WebSocket Endpoint: ${testConfig.wsUrl}`);
  
  try {
    await showMainMenu();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
})();
