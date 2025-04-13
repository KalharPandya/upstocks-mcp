/**
 * Upstox API Endpoints
 * 
 * This file defines all the API endpoints used in the application.
 * Centralizing these endpoints makes it easier to update when the API changes.
 */

const endpoints = {
  // Market Data
  marketData: {
    quotes: '/market-data/quotes',
    ohlc: '/market-data/ohlc',
    historicalCandle: '/market-data/candle',
  },
  
  // Orders
  orders: {
    place: '/order/place',
    modify: '/order/modify',
    cancel: '/order/cancel',
    getAll: '/order/get-orders',
    getDetails: '/order/get-order-details',
  },
  
  // Portfolio
  portfolio: {
    positions: '/portfolio/positions',
    holdings: '/portfolio/holdings',
  },
  
  // Market
  market: {
    instruments: '/market/instruments',
    instrumentsMaster: '/market/instruments/master',
  },
  
  // User
  user: {
    profile: '/user/profile',
    funds: '/user/funds-and-margin',
  },
};

/**
 * Helper function to build a complete endpoint URL with query parameters
 * 
 * @param baseEndpoint The base endpoint path
 * @param queryParams Object containing query parameters
 * @returns Complete URL with query parameters
 */
export function buildUrl(baseEndpoint: string, queryParams?: Record<string, string | string[]>): string {
  if (!queryParams) {
    return baseEndpoint;
  }
  
  const params = new URLSearchParams();
  
  Object.entries(queryParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => {
        params.append(key, item);
      });
    } else {
      params.append(key, value);
    }
  });
  
  return `${baseEndpoint}?${params.toString()}`;
}

export default endpoints;
