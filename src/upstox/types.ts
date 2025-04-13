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

// Historical data types
export enum UpstoxCandleInterval {
  MINUTE_1 = '1minute',
  MINUTE_5 = '5minute',
  MINUTE_10 = '10minute',
  MINUTE_15 = '15minute',
  MINUTE_30 = '30minute',
  HOUR_1 = '1hour',
  HOUR_2 = '2hour',
  HOUR_3 = '3hour',
  HOUR_4 = '4hour',
  DAY_1 = '1day',
  WEEK_1 = '1week',
  MONTH_1 = '1month'
}

export interface UpstoxHistoricalDataParams {
  instrument: string;              // Instrument token (e.g., "NSE_EQ|INFY")
  interval: string;                // Time interval (see UpstoxCandleInterval)
  from_date: string;               // Start date in YYYY-MM-DD format
  to_date: string;                 // End date in YYYY-MM-DD format
  format?: string;                 // Optional format (json or csv)
}

export interface UpstoxCandle {
  timestamp: string;               // Candle timestamp  
  open: number;                    // Open price
  high: number;                    // High price
  low: number;                     // Low price
  close: number;                   // Close price
  volume: number;                  // Volume traded
  oi?: number;                     // Open interest (for derivatives)
}

export interface UpstoxFundsData {
  used_margin: number;             // Margin already used
  payin_amount: number;            // Amount added today  
  span_margin: number;             // SPAN margin (for F&O)
  adhoc_margin: number;            // Adhoc margin
  notional_cash: number;           // Notional cash
  available_margin: number;        // Available balance/margin for trading
  exposure_margin: number;         // Exposure margin
  available_cash: number;          // Available cash
  used_options_premium: number;    // Premium used for options  
  realized_mtm: number;            // Realized MTM
  unrealized_mtm: number;          // Unrealized MTM
}
