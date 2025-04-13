/**
 * Type definitions for the Model Context Protocol (MCP)
 */

// JSON-RPC 2.0 Request structure
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

// JSON-RPC 2.0 Response structure
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// MCP Session
export interface McpSession {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  metadata: Record<string, any>;
}

// Resource description
export interface McpResource {
  id: string;
  name: string;
  description: string;
  metadata?: Record<string, any>;
}

// Tool parameter schema using JSON Schema
export interface McpParameterSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  description?: string;
  enum?: any[];
  [key: string]: any;
}

// Tool description
export interface McpTool {
  id: string;
  name: string;
  description: string;
  parameters?: McpParameterSchema;
  metadata?: Record<string, any>;
}

// Prompt description
export interface McpPrompt {
  id: string;
  name: string;
  description: string;
  metadata?: Record<string, any>;
}

// MCP Server capabilities
export interface McpCapabilities {
  name: string;
  version: string;
  vendor: string;
  capabilities: {
    resources: boolean;
    tools: boolean;
    prompts: boolean;
    sampling: boolean;
  };
  metadata?: Record<string, any>;
}

// MCP Resource content
export interface McpResourceContent {
  content: string;
  content_type: string;
  metadata?: Record<string, any>;
}

// MCP Tool execution result
export interface McpToolResult {
  result?: any;
  error?: {
    code: string;
    message: string;
    data?: any;
  };
  metadata?: Record<string, any>;
}

// MCP Prompt template
export interface McpPromptTemplate {
  content: Array<{
    role: string;
    content: string;
  }>;
  parameters?: Record<string, {
    replace?: string;
    description?: string;
  }>;
  metadata?: Record<string, any>;
}

// Claude-specific initialization parameters
export interface McpInitializeParams {
  protocolVersion: string;
  capabilities: Record<string, any>;
  clientInfo: {
    name: string;
    version: string;
  };
}

// MCP Method handlers
export interface McpMethodHandlers {
  'mcp.discover': () => Promise<McpCapabilities>;
  'mcp.session.start': (params?: any) => Promise<{ session_id: string }>;
  'mcp.session.end': (params: { session_id: string }) => Promise<void>;
  'mcp.resources.list': (params: { session_id: string }) => Promise<{ resources: McpResource[] }>;
  'mcp.resources.get': (params: { session_id: string, resource_id: string, [key: string]: any }) => Promise<McpResourceContent>;
  'mcp.tools.list': (params: { session_id: string }) => Promise<{ tools: McpTool[] }>;
  'mcp.tools.execute': (params: { session_id: string, tool_id: string, [key: string]: any }) => Promise<McpToolResult>;
  'mcp.prompts.list': (params: { session_id: string }) => Promise<{ prompts: McpPrompt[] }>;
  'mcp.prompts.get': (params: { session_id: string, prompt_id: string, [key: string]: any }) => Promise<McpPromptTemplate>;
  // Add support for Claude's initialize method
  'initialize': (params: McpInitializeParams) => Promise<any>;
}
