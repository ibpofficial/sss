import type { Transaction, DecisionObject } from './orders';

export interface PortfolioState {
  initialCash: number; // ₹10,000.00
  cash: number; // Current available cash
  holdingsQuantity: number; // Asset quantity owned (e.g. 20.00 units)
  averageCostBasis: number; // Weighted average purchase price (₹)
  currentAssetPrice: number; // Current market price (₹)
  marketValueOfHoldings: number; // holdingsQuantity * currentAssetPrice
  unrealizedPnL: number; // marketValueOfHoldings - (holdingsQuantity * averageCostBasis)
  realizedPnL: number; // Cumulated net proceeds from sales minus allocated cost
  totalEquity: number; // cash + marketValueOfHoldings
  totalFeesPaid: number;
  totalReturnPercent: number; // ((totalEquity - initialCash) / initialCash) * 100
  peakEquity: number;
  maxDrawdown: number; // In percentage (e.g. 1.25%)
  transactions: Transaction[];
  decisions: DecisionObject[];
}

export interface RiskConfig {
  maxSessionLossPercent: number; // e.g. 5.0% - if drawdown/loss reaches this, pause trading
  cooldownSeconds: number; // minimum seconds between new position entries (e.g. 2s)
  maxTradesPerSession: number; // e.g. 15 trades
  feePercent: number; // 0.1% transaction fee
  slippagePercent: number; // e.g. 0.05% simulated slippage
  emergencyCloseOnStop: boolean; // whether emergency stop closes open positions immediately
}

export interface SessionReportData {
  initialCapital: number;
  finalEquity: number;
  realizedPnL: number;
  unrealizedPnL: number;
  finalTotalPnL: number;
  returnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage of closed trades with positive realized P/L
  totalFees: number;
  maxDrawdownPercent: number;
  rulesTriggeredCounts: Record<string, number>;
  totalDecisionsCount: number;
  closedTradesCount: number;
}
