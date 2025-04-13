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
- **Multiple Auth Methods**: Support for both direct token and OAuth flow
- **Public URL Support**: Integrated ngrok tunneling for OAuth and webhooks

## Getting Started

### Prerequisites

- Node.js 16 or higher
- Upstox developer account
- API credentials (key, secret, tokens)
- For tunneling: Internet connection for ngrok (optional)

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

Create a `.env` file in the root directory with your credentials. This MCP server supports 6 different configuration options:

1. **Live API with OAuth**: Use Live API credentials and perform OAuth flow
2. **Live API with Token**: Use Live API credentials with pre-generated access token
3. **Sandbox API with OAuth**: Use Sandbox API credentials and perform OAuth flow
4. **Sandbox API with Token**: Use Sandbox API credentials with pre-generated access token
5. **Live API with OAuth (user provides key/secret during execution)**: Dynamic credentials
6. **Sandbox API with OAuth (user provides key/secret during execution)**: Dynamic credentials

Here's a sample configuration:

```
# Upstox Environment Configuration
# Options: 'live' or 'sandbox'
UPSTOX_ENVIRONMENT=sandbox

# Authentication Method Configuration
# Options: 'api_key_secret' or 'access_token'
UPSTOX_AUTH_METHOD=access_token

# Redirect URI for OAuth flow
UPSTOX_REDIRECT_URI=http://localhost:3000/callback

# Live Environment Credentials
API_KEY=your_live_api_key
API_SECRET=your_live_api_secret
ACCESS_TOKEN=your_live_access_token

# Sandbox Environment Credentials
SANDBOX_API_KEY=your_sandbox_api_key
SANDBOX_API_SECRET=your_sandbox_api_secret
SANDBOX_ACCESS_TOKEN=your_sandbox_access_token

# Server Configuration
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info  # Options: debug, info, warn, error
```

### Usage

There are several ways to run the server:

```bash
# Start the MCP server (standard mode)
npm start

# Start in development mode
npm run dev

# Start with ngrok tunneling for OAuth and webhooks
npm run dev:tunnel
```

When using the `dev:tunnel` option, the server will start ngrok and provide you with public URLs that can be used for:
- OAuth redirect URL
- Webhook URL for order updates
- Notifier URL for access token notifications

These URLs can be used directly in your Upstox app configuration.

### Ngrok Commands for Upstox App Configuration

When using ngrok with the MCP server, you'll get these URLs automatically. The server will display them in the console:

```
Use the following URLs for Upstox API configuration:
Redirect URL: https://xxxx-xxx-xx-xx.ngrok-free.app/callback
Webhook URL: https://xxxx-xxx-xx-xx.ngrok-free.app/webhook
Notifier URL: https://xxxx-xxx-xx-xx.ngrok-free.app/notifier
```

You can use these URLs when configuring your Upstox app in the developer portal.

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
        "UPSTOX_ENVIRONMENT": "sandbox",
        "UPSTOX_AUTH_METHOD": "access_token",
        "SANDBOX_API_KEY": "your_sandbox_api_key",
        "SANDBOX_API_SECRET": "your_sandbox_api_secret",
        "SANDBOX_ACCESS_TOKEN": "your_sandbox_access_token",
        "UPSTOX_REDIRECT_URI": "http://localhost:3000/callback"
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
- **Webhooks**: Handles order updates and notifications

### Utils
- **Tunnel**: Manages ngrok tunneling for public URL access

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
│   ├── utils/
│   │   └── tunnel.ts         # Ngrok tunnel management
│   └── test/
│       └── interactive.ts    # Interactive test client
└── [Other configuration files]
```

### Running in Development Mode

```bash
# Run with ts-node for development
npm run dev

# Run with ngrok tunnel for public access
npm run dev:tunnel

# Run the interactive test client
npm run test
```

## License

MIT
