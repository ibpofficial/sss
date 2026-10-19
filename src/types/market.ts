export interface PricePoint {
  index: number;
  timeSeconds: number;
  timeFormatted: string; // e.g. "01:14"
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  change: number;
  changePercent: number;
  maShort: number; // 5-period
  maLong: number; // 12-period
  direction: 'up' | 'down' | 'flat';
  hasBuyMarker?: boolean;
  hasSellMarker?: boolean;
  markerTooltip?: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface MarketState {
  currentPrice: number;
  previousPrice: number;
  initialPrice: number;
  changePercent: number;
  priceHistory: PricePoint[];
  recentPeak: number;
  recentTrough: number;
  dayHigh: number;
  dayLow: number;
  totalVolume: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  consecutiveUp: number;
  consecutiveDown: number;
  lastMaCross: 'bullish' | 'bearish' | null;
  consecutiveAboveMaLong: number;
  consecutiveBelowMaLong: number;
  activeScenarioName: string;
}
