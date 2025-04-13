import express from 'express';
import bodyParser from 'body-parser';
import { WebSocketServer } from 'ws';
import http from 'http';

import { mcpCore } from './mcp/core';
import { mcpResources } from './mcp/resources';
import { mcpTools } from './mcp/tools';
import { authManager } from './upstox/auth';
import config, { EnvironmentType } from './config/config';
import { JsonRpcRequest, JsonRpcResponse } from './mcp/types';

/**
 * MCP Server implementation
 */
export class McpServer {
  private app: express.Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private isRunning = false;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    // Configure middleware
    this.app.use(bodyParser.json());

    // Initialize MCP components
    this.initializeMcp();

    // Setup HTTP routes
    this.setupRoutes();

    // Setup WebSocket handlers
    this.setupWebSocket();
  }

  /**
   * Initialize MCP components
   */
  private initializeMcp(): void {
    // Initialize MCP core with server capabilities
    mcpCore.initialize({
      name: 'upstox-mcp-server',
      version: '1.0.0',
      vendor: 'Upstox',
      capabilities: {
        resources: true,
        tools: true,
        prompts: false,
        sampling: false
      }
    });

    // Initialize resources and tools
    mcpResources.initialize();
    mcpTools.initialize();
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // MCP JSON-RPC endpoint
    this.app.post('/mcp', async (req, res) => {
      try {
        const request = req.body as JsonRpcRequest;
        const response = await mcpCore.processRequest(request);
        res.json(response);
      } catch (error) {
        console.error('Error processing request:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: req.body.id || null,
          error: {
            code: -32603,
            message: `Internal error: ${errorMessage}`
          }
        };
        res.status(500).json(response);
      }
    });

    // Auth callback endpoint for Upstox OAuth
    this.app.get('/callback', async (req, res) => {
      const code = req.query.code as string;
      
      if (!code) {
        return res.status(400).send('Authorization code is missing');
      }
      
      try {
        // Exchange code for access token
        await authManager.authenticateWithCode(code);
        
        // Send success response
        res.send(`
          <html>
            <body>
              <h1>Authentication Successful</h1>
              <p>You can now close this window and return to the application.</p>
              <script>
                window.close();
              </script>
            </body>
          </html>
        `);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Authentication error:', error);
        res.status(500).send(`Authentication failed: ${errorMessage}`);
      }
    });

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
      try {
        const isApiReady = authManager.getAuthState().isAuthorized;
        
        res.json({ 
          status: 'healthy', 
          mode: config.upstox.environment === EnvironmentType.SANDBOX ? 'sandbox' : 'live',
          auth_method: config.upstox.authMethod,
          api_ready: isApiReady
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          status: 'unhealthy',
          error: errorMessage
        });
      }
    });
  }

  /**
   * Setup WebSocket handlers
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      ws.on('message', async (message) => {
        try {
          // Parse the JSON-RPC request
          const request = JSON.parse(message.toString()) as JsonRpcRequest;
          
          // Process the request
          const response = await mcpCore.processRequest(request);
          
          // Send the response back
          ws.send(JSON.stringify(response));
        } catch (error) {
          console.error('WebSocket error:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Send error response
          const errorResponse: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: `Parse error: ${errorMessage}`
            }
          };
          
          ws.send(JSON.stringify(errorResponse));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    return new Promise<void>((resolve) => {
      const { port, host } = config.server;
      
      this.server.listen(port, host, () => {
        this.isRunning = true;
        console.log(`Server running on http://${host}:${port}/mcp`);
        
        // Log environment information
        console.log(`Environment: ${config.upstox.environment}`);
        console.log(`Log Level: ${config.server.logLevel}`);
        
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        
        this.isRunning = false;
        console.log('Server stopped');
        resolve();
      });
    });
  }
}

// Create and export a function to start the server
export async function startMcpServer(): Promise<McpServer> {
  const server = new McpServer();
  await server.start();
  return server;
}
