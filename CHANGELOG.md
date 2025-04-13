# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- Fixed market data API endpoint from `/market/quotes` to `/market-data/quotes` to match the current Upstox API
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
