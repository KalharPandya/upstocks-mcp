# Upstox MCP Server

A Model Context Protocol (MCP) server for Upstox API integration, providing virtual trading capabilities and market data access.

## Overview

This project implements an MCP server that allows AI models like Claude to interact with the Upstox trading platform. It provides:

- Virtual trading capabilities for risk-free strategy testing
- Real-time market data access
- Portfolio tracking and analysis
- Seamless integration with Claude Desktop

## Features

- **Virtual Trading**: Test trading strategies without real money
- **Market Data**: Access real-time and historical market data
- **Portfolio Management**: Track virtual positions and performance
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

# Build the project
npm run build
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
UPSTOX_API_KEY=your_api_key
UPSTOX_API_SECRET=your_api_secret
UPSTOX_REDIRECT_URI=your_redirect_uri
USE_SANDBOX=true
UPSTOX_SANDBOX_TOKEN=your_sandbox_token
PORT=3000
```

### Usage

```bash
# Start the MCP server
npm start
```

## Architecture

The project follows a modular architecture with clear separation of concerns:

- **MCP Layer**: Implements the Model Context Protocol interface
- **Virtual Trading System**: Simulates order execution and portfolio management
- **Upstox Integration**: Handles API communication and authentication
- **Configuration**: Manages environment and runtime settings

## License

MIT
