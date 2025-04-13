/**
 * Type definitions for Upstox API integration
 */

// Authentication types
export interface UpstoxToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface UpstoxAuthState {
  accessToken: string | null;
  tokenExpiry: Date | null;
  isAuthorized: boolean;
}

// Market data types
export interface UpstoxMarketFeed {
  instrument_token: string;
  exchange: string;
  trading_symbol: string;
  last_price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  change_percent: number;
  volume: number;
  average_price: number;
  oi: number;
  oi_day_high: number;
  oi_day_low: number;
  ltp: number;
  timestamp: string;
  bid_price: number;
  bid_quantity: number;
  ask_price: number;
  ask_quantity: number;
}

// Order types
export enum UpstoxOrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  SL = 'SL',
  SLM = 'SL-M',
}

export enum UpstoxTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum UpstoxProductType {
  DELIVERY = 'D',
  INTRADAY = 'I',
  MARGIN = 'M',
  COVER = 'CO',
  BRACKET = 'BO',
}

export enum UpstoxOrderValidity {
  DAY = 'DAY',
  IOC = 'IOC',
}

export enum UpstoxOrderStatus {
  PENDING = 'pending',
  PLACED = 'placed',
  COMPLETE = 'complete',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface UpstoxOrderParams {
  instrument_token: string;
  transaction_type: UpstoxTransactionType;
  quantity: number;
  order_type: UpstoxOrderType;
  price?: number;
  trigger_price?: number;
  product?: UpstoxProductType;
  validity?: UpstoxOrderValidity;
  disclosed_quantity?: number;
  is_amo?: boolean;
}

export interface UpstoxOrder {
  order_id: string;
  instrument_token: string;
  transaction_type: UpstoxTransactionType;
  quantity: number;
  price: number;
  trigger_price?: number;
  order_type: UpstoxOrderType;
  status: UpstoxOrderStatus;
  timestamp: string;
  average_price: number;
  filled_quantity: number;
  product: UpstoxProductType;
  validity: UpstoxOrderValidity;
  disclosed_quantity: number;
  exchange: string;
  trading_symbol: string;
  order_request_id: string;
  message?: string;
}

// Portfolio types
export interface UpstoxPosition {
  instrument_token: string;
  exchange: string;
  trading_symbol: string;
  product: UpstoxProductType;
  quantity: number;
  overnight_quantity: number;
  average_price: number;
  ltp: number;
  pnl: number;
  day_pnl: number;
  close_price: number;
  buy_quantity: number;
  buy_price: number;
  sell_quantity: number;
  sell_price: number;
  value: number;
  cost: number;
}

export interface UpstoxHolding {
  instrument_token: string;
  exchange: string;
  trading_symbol: string;
  isin: string;
  quantity: number;
  price: number;
  ltp: number;
  pnl: number;
  value: number;
  cost: number;
  close_price: number;
}

// Market profile types
export interface UpstoxInstrument {
  instrument_token: string;
  exchange: string;
  trading_symbol: string;
  name: string;
  expiry?: string;
  strike?: number;
  option_type?: string;
  instrument_type: string;
  tick_size: number;
  lot_size: number;
  ISIN?: string;
}
