import express from 'express';
import bodyParser from 'body-parser';
import { WebSocketServer } from 'ws';
import http from 'http';
import readline from 'readline';

import { mcpCore } from './mcp/core';
import { mcpResources } from './mcp/resources';
import { mcpTools } from './mcp/tools';
import { authManager } from './upstox/auth';
import config, { EnvironmentType } from './config/config';
import { JsonRpcRequest, JsonRpcResponse } from './mcp/types';
import { tunnelManager } from './utils/tunnel';

/**
 * MCP Server implementation
 */
export class McpServer {
  private app: express.Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private isRunning = false;
  private useNgrok = false;
  private stdioMode = false;
  private rl: readline.Interface | null = null;

  constructor(options: { useNgrok?: boolean; useStdio?: boolean } = {}) {
    this.useNgrok = options.useNgrok || false;
    this.stdioMode = options.useStdio || process.env.MCP_STDOUT_ONLY === 'true';
    
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    // Configure middleware
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Initialize MCP components
    this.initializeMcp();

    // Setup HTTP routes
    this.setupRoutes();

    // Setup WebSocket handlers
    this.setupWebSocket();
    
    // Setup stdin/stdout communication if needed
    if (this.stdioMode) {
      this.setupStdioTransport();
    }
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
        
        // Use any type to bypass type checking
        const errorResponse: any = {
          jsonrpc: '2.0',
          id: req.body.id || 0,
          error: {
            code: -32603,
            message: `Internal error: ${errorMessage}`
          }
        };
        
        res.status(500).json(errorResponse);
      }
    });

    // Auth callback endpoint for Upstox OAuth
    this.app.get('/callback', async (req, res) => {
      console.info('Received callback from Upstox:', req.query);
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

    // Webhook endpoint for order updates
    this.app.post('/webhook', async (req, res) => {
      try {
        console.info('Received webhook from Upstox:', req.body);
        // Process the webhook data
        // This could be stored or forwarded to clients via WebSockets
        
        // Respond with success
        res.status(200).json({ status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error processing webhook:', error);
        res.status(500).json({ 
          status: 'error', 
          message: errorMessage 
        });
      }
    });

    // Notifier endpoint for access token notifications
    this.app.post('/notifier', async (req, res) => {
      try {
        console.info('Received notifier webhook from Upstox:', req.body);
        
        // Extract token from request
        const { access_token } = req.body;
        if (access_token) {
          // Set the token in the auth manager
          authManager.setToken(access_token, config.upstox.environment === EnvironmentType.SANDBOX ? 30 : 1);
        }
        
        // Respond with success
        res.status(200).json({ status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error processing notifier:', error);
        res.status(500).json({ 
          status: 'error', 
          message: errorMessage 
        });
      }
    });

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
      try {
        const isApiReady = authManager.getAuthState().isAuthorized;
        const tunnelUrl = tunnelManager.getUrl();
        
        res.json({ 
          status: 'healthy', 
          mode: config.upstox.environment === EnvironmentType.SANDBOX ? 'sandbox' : 'live',
          auth_method: config.upstox.authMethod,
          api_ready: isApiReady,
          tunnel: {
            enabled: this.useNgrok,
            url: tunnelUrl || null
          },
          urls: tunnelUrl ? {
            callback: tunnelManager.getCallbackUrl(),
            webhook: tunnelManager.getWebhookUrl(),
            notifier: tunnelManager.getNotifierUrl()
          } : null
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
          
          // Create error response with a default ID of 0
          const errorData = {
            jsonrpc: '2.0',
            id: 0,
            error: {
              code: -32700,
              message: `Parse error: ${errorMessage}`
            }
          };
          
          ws.send(JSON.stringify(errorData));
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });
  }

  /**
   * Setup stdin/stdout transport for direct MCP communication
   * This is used when integrated with Claude or other MCP clients
   */
  private setupStdioTransport(): void {
    console.error('[INFO] Setting up stdin/stdout transport for MCP');
    
    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    // Handle incoming JSON-RPC messages from stdin
    this.rl.on('line', async (line) => {
      try {
        // Parse the JSON-RPC request
        const request = JSON.parse(line) as JsonRpcRequest;
        
        // Process the request
        const response = await mcpCore.processRequest(request);
        
        // Send the response to stdout
        // NOTE: We use process.stdout.write directly to avoid any formatting
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        console.error('[ERROR] Failed to process stdin message:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Create error response with a default ID of 0
        const errorResponse = {
          jsonrpc: '2.0',
          id: 0, // We don't know the actual ID if parsing failed
          error: {
            code: -32700,
            message: `Parse error: ${errorMessage}`
          }
        };
        
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });
    
    // Handle EOF
    this.rl.on('close', () => {
      console.error('[INFO] stdin stream closed');
      process.exit(0);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    return new Promise<void>(async (resolve) => {
      const { port, host } = config.server;
      
      // Start ngrok tunnel if enabled
      if (this.useNgrok) {
        try {
          const tunnelUrl = await tunnelManager.start();
          console.log(`Ngrok tunnel established: ${tunnelUrl}`);
          
          // Update Upstox redirect URI to use the ngrok URL
          config.upstox.redirectUri = tunnelManager.getCallbackUrl() || config.upstox.redirectUri;
          console.log(`Updated redirect URI to: ${config.upstox.redirectUri}`);
        } catch (error) {
          console.error('Failed to start ngrok tunnel:', error);
          // Continue without tunnel if it fails
        }
      }
      
      // Only start the HTTP server if we're not in stdio-only mode
      if (!this.stdioMode) {
        this.server.listen(port, host, () => {
          this.isRunning = true;
          console.log(`Server running on http://${host}:${port}/mcp`);
          
          // Log environment information
          console.log(`Environment: ${config.upstox.environment}`);
          console.log(`Log Level: ${config.server.logLevel}`);
          
          if (this.useNgrok && tunnelManager.isConnected()) {
            console.log('');
            console.log('Use the following URLs for Upstox API configuration:');
            console.log(`Redirect URL: ${tunnelManager.getCallbackUrl()}`);
            console.log(`Webhook URL: ${tunnelManager.getWebhookUrl()}`);
            console.log(`Notifier URL: ${tunnelManager.getNotifierUrl()}`);
          }
          
          resolve();
        });
      } else {
        // In stdio mode, we're already running
        this.isRunning = true;
        console.error('[INFO] Running in stdio mode, HTTP server not started');
        resolve();
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop the ngrok tunnel if it's active
    if (this.useNgrok && tunnelManager.isConnected()) {
      await tunnelManager.stop();
    }
    
    // Close stdin/stdout transport if active
    if (this.stdioMode && this.rl) {
      this.rl.close();
    }

    // Only close the HTTP server if it was started
    if (!this.stdioMode) {
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
    } else {
      this.isRunning = false;
      console.error('[INFO] Stdio transport closed');
      return Promise.resolve();
    }
  }
}

// Create and export a function to start the server
export async function startMcpServer(options: { useNgrok?: boolean; useStdio?: boolean } = {}): Promise<McpServer> {
  // Check if we're being run by an MCP client like Claude
  const mcpStdioMode = process.env.MCP_STDOUT_ONLY === 'true';
  
  // Use stdio mode if explicitly requested or if environment variable is set
  const useStdio = options.useStdio || mcpStdioMode;
  
  const server = new McpServer({ 
    useNgrok: options.useNgrok, 
    useStdio: useStdio 
  });
  
  await server.start();
  return server;
}
