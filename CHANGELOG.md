# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Added dedicated "funds" resource to check available balance and margin information
- Added historical data (OHLC candles) resource with date range and interval selection
- Added support for more time intervals (1min, 5min, 15min, 30min, 1hr, 1day, 1week, 1month)

### Fixed
- Fixed market data API endpoint from `/market/quotes` to `/market-quote/quotes` to match the official Upstox Python SDK
- Added proper API version header for market quotes requests
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
