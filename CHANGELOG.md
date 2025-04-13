# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added dedicated wrapper script (`claude-wrapper.js`) for reliable Claude Desktop integration
- Added debug logging to wrapper script to help troubleshoot Claude integration issues
- Added support for Claude Desktop-specific `initialize` method for better integration
- Added support for Claude integration via stdin/stdout transport for MCP
- Added environment variables `MCP_STDOUT_ONLY` and `MCP_NO_CONSOLE_LOG` to control output redirection
- Added dedicated "funds" resource to check available balance and margin information
- Added historical data (OHLC candles) resource with date range and interval selection
- Added support for more time intervals (1min, 5min, 15min, 30min, 1hr, 1day, 1week, 1month)
- Added automatic log redirection to stderr when running as MCP server with Claude

### Fixed
- Fixed Claude Desktop integration issues by adding stream isolation in the wrapper script
- Fixed funds endpoint from `/user/funds-and-margin` to `/user/get-funds-and-margin` to match official Upstox API
- Fixed market data API endpoint from `/market/quotes` to `/market-quote/quotes` to match the official Upstox Python SDK
- Added required API version header (`Api-Version: 2.0`) for funds and market data endpoints 
- Fixed parameter format for market quotes (using 'symbol' instead of 'instrument_key')
- Added better error handling and logging for API requests
- Improved formatting of instrument keys (automatically adding exchange prefix when needed)

### Added
- Created centralized endpoint management in `src/upstox/endpoints.ts`
- Added utility function for building URLs with query parameters
- Improved documentation for API integration

## [0.1.0] - 2025-04-13

### Added
- Initial project setup
- Basic MCP server implementation
- Upstox API client integration
- Authentication flow for both direct token and OAuth
- MCP resources for market data, portfolio, orders, etc.
- MCP tools for placing orders, fetching data, and more
