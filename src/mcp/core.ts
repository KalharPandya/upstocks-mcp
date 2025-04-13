import { v4 as uuidv4 } from 'uuid';
import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  McpSession,
  McpMethodHandlers,
  McpCapabilities,
  McpInitializeParams
} from './types';

// Store active sessions
const sessions = new Map<string, McpSession>();

// Session cleanup interval (30 minutes)
const SESSION_CLEANUP_INTERVAL = 30 * 60 * 1000;

// Session expiry time (1 hour of inactivity)
const SESSION_EXPIRY_TIME = 60 * 60 * 1000;

/**
 * MCP Server core functionality
 */
export class McpCore {
  private methodHandlers: Partial<McpMethodHandlers> = {};
  private serverCapabilities: McpCapabilities | null = null;

  constructor() {
    // Start session cleanup timer
    setInterval(() => this.cleanupSessions(), SESSION_CLEANUP_INTERVAL);
  }

  /**
   * Initialize the server with capabilities
   */
  initialize(capabilities: McpCapabilities): void {
    // Store server capabilities for later use
    this.serverCapabilities = capabilities;
    
    // Register core methods
    this.registerMethod('mcp.discover', async () => capabilities);
    this.registerMethod('mcp.session.start', this.handleSessionStart.bind(this));
    this.registerMethod('mcp.session.end', this.handleSessionEnd.bind(this));
    
    // Register Claude-specific initialize method
    this.registerMethod('initialize', this.handleClientInitialize.bind(this));
  }

  /**
   * Handle Claude's initialize method
   * This is Claude Desktop specific and not part of the standard MCP protocol
   */
  private async handleClientInitialize(params: McpInitializeParams): Promise<any> {
    console.error('[DEBUG] Claude initialized with protocol version:', params.protocolVersion);
    console.error('[DEBUG] Client info:', JSON.stringify(params.clientInfo));
    
    // We'll automatically start a session for the client
    const sessionId = uuidv4();
    
    // Create new session
    const session: McpSession = {
      id: sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      metadata: {
        clientInfo: params.clientInfo,
        protocolVersion: params.protocolVersion
      }
    };
    
    sessions.set(sessionId, session);
    
    // Return server capabilities
    return {
      session_id: sessionId,
      server_info: this.serverCapabilities,
      protocol_version: params.protocolVersion
    };
  }

  /**
   * Register a method handler
   */
  registerMethod<K extends keyof McpMethodHandlers>(
    method: K, 
    handler: McpMethodHandlers[K]
  ): void {
    this.methodHandlers[method] = handler as any;
  }

  /**
   * Process an MCP request
   */
  async processRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      // Validate JSON-RPC 2.0 format
      if (request.jsonrpc !== '2.0') {
        return this.createErrorResponse(request.id, -32600, 'Invalid Request: Not JSON-RPC 2.0');
      }

      // Find handler for the method
      const handler = this.methodHandlers[request.method as keyof McpMethodHandlers];
      if (!handler) {
        return this.createErrorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }

      // Session validation for methods requiring a session
      // Skip session validation for discover, session.start, and initialize methods
      if (
        request.method !== 'mcp.discover' && 
        request.method !== 'mcp.session.start' && 
        request.method !== 'initialize'
      ) {
        const sessionId = request.params?.session_id;
        if (!sessionId) {
          return this.createErrorResponse(request.id, -32602, 'Session ID is required');
        }

        if (!this.validateSession(sessionId)) {
          return this.createErrorResponse(request.id, -32000, 'Invalid or expired session');
        }

        // Update session last accessed time
        this.updateSessionActivity(sessionId);
      }

      // Execute the method handler
      const result = await (handler as Function)(request.params || {});
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: result
      };
    } catch (error) {
      console.error('Error processing request:', error);
      return this.createErrorResponse(
        request.id,
        -32000,
        `Internal error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create an error response
   */
  private createErrorResponse(id: string | number, code: number, message: string, data?: any): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }

  /**
   * Handle session start request
   */
  private async handleSessionStart(params?: any): Promise<{ session_id: string }> {
    const sessionId = uuidv4();
    
    // Create new session
    const session: McpSession = {
      id: sessionId,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      metadata: params || {}
    };
    
    sessions.set(sessionId, session);
    return { session_id: sessionId };
  }

  /**
   * Handle session end request
   */
  private async handleSessionEnd(params: { session_id: string }): Promise<void> {
    const { session_id } = params;
    
    // Remove session if it exists
    if (sessions.has(session_id)) {
      sessions.delete(session_id);
    }
  }

  /**
   * Validate if a session exists and is not expired
   */
  private validateSession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    // Check if session is expired
    const now = new Date();
    const elapsed = now.getTime() - session.lastAccessedAt.getTime();
    return elapsed < SESSION_EXPIRY_TIME;
  }

  /**
   * Update the last accessed time for a session
   */
  private updateSessionActivity(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = new Date();
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of sessions.entries()) {
      const elapsed = now.getTime() - session.lastAccessedAt.getTime();
      if (elapsed >= SESSION_EXPIRY_TIME) {
        sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get all active sessions
   */
  getSessions(): McpSession[] {
    return Array.from(sessions.values());
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): McpSession | undefined {
    return sessions.get(sessionId);
  }
}

// Export a singleton instance
export const mcpCore = new McpCore();
