# Upstox MCP Server

A Model Context Protocol (MCP) server for Upstox API integration, providing market data access and trading capabilities through a standardized interface.

## Overview

This project implements an MCP server that allows AI models like Claude to interact with the Upstox trading platform. It provides:

- Real-time market data access
- Order placement and management
- Portfolio tracking and analysis
- Seamless integration with Claude Desktop

## Features

- **Trading**: Place and manage orders through a simple interface
- **Market Data**: Access real-time and historical market data
- **Portfolio Management**: Track positions and performance
- **MCP Integration**: Standardized interface for AI model interaction
- **Sandbox Support**: Test with Upstox sandbox environment

## Getting Started

### Prerequisites

- Node.js 16 or higher
- Upstox developer account
- API credentials (key and secret)

### Installation

```bash
# Clone the repository
git clone https://github.com/KalharPandya/upstocks-mcp.git
cd upstocks-mcp

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit the .env file with your credentials
nano .env

# Build the project
npm run build
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
UPSTOX_API_KEY=your_api_key_here
UPSTOX_API_SECRET=your_api_secret_here
UPSTOX_REDIRECT_URI=http://localhost:3000/callback
USE_SANDBOX=true
UPSTOX_SANDBOX_TOKEN=your_sandbox_token_here
PORT=3000
HOST=0.0.0.0
```

### Usage

```bash
# Start the MCP server
npm start
```

If running in live mode (USE_SANDBOX=false), you'll need to authenticate by visiting the URL displayed in the console.

### Testing

The project includes an interactive test client that allows you to test the MCP server functionality through a command-line interface:

```bash
# Run the interactive test client
npm run test
```

The test client provides the following features:

- Test MCP discovery to see server capabilities
- Test session management (start/end)
- Browse and retrieve available resources
- List and execute available tools
- Test both HTTP and WebSocket communication

This is a great way to understand how the MCP interface works and verify that your server is functioning correctly.

## Claude Desktop Integration

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "upstox": {
      "command": "npx",
      "args": ["-y", "upstocks-mcp"],
      "env": {
        "UPSTOX_API_KEY": "your_api_key_here",
        "UPSTOX_API_SECRET": "your_api_secret_here",
        "UPSTOX_REDIRECT_URI": "http://localhost:3000/callback",
        "USE_SANDBOX": "true",
        "UPSTOX_SANDBOX_TOKEN": "your_sandbox_token_here"
      }
    }
  }
}
```

## Architecture

The project follows a modular architecture with clear separation of concerns:

### MCP Layer
- **Core**: Handles MCP protocol implementation
- **Resources**: Exposes market data, portfolio, etc. as MCP resources
- **Tools**: Provides trading operations as MCP tools

### Upstox Integration
- **API Client**: Communicates with Upstox REST API
- **Authentication**: Manages OAuth flow and tokens
- **Types**: TypeScript type definitions for Upstox data

### Server
- **HTTP API**: JSON-RPC over HTTP
- **WebSocket**: Real-time communication
- **Authentication**: OAuth callback handling

## Available Resources

The MCP server exposes the following resources:

- `market-data`: Real-time market data for specified instruments
- `positions`: Current positions in the portfolio
- `holdings`: Current holdings in the portfolio
- `orders`: List of orders
- `profile`: User profile information
- `instruments`: Available trading instruments

## Available Tools

The MCP server provides the following tools:

- `place-order`: Place a new trading order
- `cancel-order`: Cancel an existing order
- `get-order`: Get details of a specific order

## Development

### Project Structure

```
upstocks-mcp/
├── src/
│   ├── index.ts              # Main entry point 
│   ├── server.ts             # MCP server implementation
│   ├── config/
│   │   └── config.ts         # Configuration management
│   ├── upstox/
│   │   ├── api.ts            # Upstox API client
│   │   ├── auth.ts           # Authentication manager
│   │   └── types.ts          # Type definitions for Upstox
│   ├── mcp/
│   │   ├── core.ts           # Core MCP methods
│   │   ├── resources.ts      # MCP resource implementations
│   │   ├── tools.ts          # MCP tool implementations
│   │   └── types.ts          # Type definitions for MCP
│   └── test/
│       └── interactive.ts    # Interactive test client
└── [Other configuration files]
```

### Running in Development Mode

```bash
# Run with ts-node for development
npm run dev

# Run the interactive test client
npm run test
```

## License

MIT
