import type { RiskConfig, PortfolioState } from '../types/portfolio';
import { calculateFee, calculateExecutionPrice, roundPaise } from '../utils/calculations';

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxSessionLossPercent: 5.0, // Stop new trades if portfolio drops 5%
  cooldownSeconds: 2, // 2s cooldown between buy orders
  maxTradesPerSession: 15,
  feePercent: 0.1, // 0.1% transaction fee
  slippagePercent: 0.05, // 0.05% realistic execution slippage
  emergencyCloseOnStop: true, // Auto close position on emergency stop
};

export interface RiskCheckResult {
  allowed: boolean;
  reason: string;
  riskStatus: 'PASSED' | 'COOLDOWN' | 'LOSS_LIMIT_REACHED' | 'MAX_TRADES_EXCEEDED' | 'EMERGENCY_STOP' | 'INSUFFICIENT_FUNDS' | 'INSUFFICIENT_HOLDINGS' | 'SESSION_LOCKED';
  effectiveExecutionPrice: number;
  estimatedFee: number;
  adjustedQuantity: number;
}

export class RiskManager {
  private config: RiskConfig;
  private lastTradeTimeSeconds: number = -999;
  private totalTradesExecuted: number = 0;
  private isEmergencyStopped: boolean = false;
  private isRiskPaused: boolean = false;

  constructor(config: RiskConfig = DEFAULT_RISK_CONFIG) {
    this.config = { ...config };
  }

  public updateConfig(updates: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): RiskConfig {
    return { ...this.config };
  }

  public reset(): void {
    this.lastTradeTimeSeconds = -999;
    this.totalTradesExecuted = 0;
    this.isEmergencyStopped = false;
    this.isRiskPaused = false;
  }

  public triggerEmergencyStop(): void {
    this.isEmergencyStopped = true;
  }

  public isEmergencyActive(): boolean {
    return this.isEmergencyStopped;
  }

  public isRiskLimitReached(): boolean {
    return this.isRiskPaused;
  }

  /**
   * Validate order proposal against risk controls and portfolio bounds
   */
  public validateOrder(
    side: 'BUY' | 'SELL',
    requestedQuantity: number,
    quotedPrice: number,
    portfolio: PortfolioState,
    timeSeconds: number,
    isPriorityExit: boolean = false
  ): RiskCheckResult {
    const effectiveExecutionPrice = calculateExecutionPrice(quotedPrice, side, this.config.slippagePercent);
    const estimatedGross = roundPaise(requestedQuantity * effectiveExecutionPrice);
    const estimatedFee = calculateFee(estimatedGross, this.config.feePercent);

    // 1. Emergency stop check
    if (this.isEmergencyStopped && !isPriorityExit) {
      return {
        allowed: false,
        reason: 'Emergency Stop is engaged. Automated trading halted.',
        riskStatus: 'EMERGENCY_STOP',
        effectiveExecutionPrice,
        estimatedFee,
        adjustedQuantity: 0,
      };
    }

    // 2. Max session loss limit check
    const currentDrawdown = ((portfolio.initialCash - portfolio.totalEquity) / portfolio.initialCash) * 100;
    if (currentDrawdown >= this.config.maxSessionLossPercent && !isPriorityExit) {
      this.isRiskPaused = true;
      return {
        allowed: false,
        reason: `Session loss limit (${this.config.maxSessionLossPercent}%) reached. Portfolio drawdown is ${currentDrawdown.toFixed(2)}%. Trading paused to protect capital.`,
        riskStatus: 'LOSS_LIMIT_REACHED',
        effectiveExecutionPrice,
        estimatedFee,
        adjustedQuantity: 0,
      };
    }

    // 3. Max trades per session check
    if (this.totalTradesExecuted >= this.config.maxTradesPerSession && !isPriorityExit) {
      return {
        allowed: false,
        reason: `Maximum trades per session (${this.config.maxTradesPerSession}) reached.`,
        riskStatus: 'MAX_TRADES_EXCEEDED',
        effectiveExecutionPrice,
        estimatedFee,
        adjustedQuantity: 0,
      };
    }

    // 4. Cooldown check (Only applies to BUY entries, never to stop-loss or exits)
    if (side === 'BUY' && !isPriorityExit) {
      const timeSinceLastTrade = timeSeconds - this.lastTradeTimeSeconds;
      if (timeSinceLastTrade < this.config.cooldownSeconds && this.lastTradeTimeSeconds >= 0) {
        return {
          allowed: false,
          reason: `Trade cooldown active. ${this.config.cooldownSeconds - timeSinceLastTrade}s remaining before next entry.`,
          riskStatus: 'COOLDOWN',
          effectiveExecutionPrice,
          estimatedFee,
          adjustedQuantity: 0,
        };
      }
    }

    // 5. Capital & Quantity validation
    if (side === 'BUY') {
      const requiredCash = estimatedGross + estimatedFee;
      if (requiredCash > portfolio.cash) {
        const maxAffordableQty = Math.floor((portfolio.cash / (effectiveExecutionPrice * (1 + this.config.feePercent / 100))) * 100) / 100;
        if (maxAffordableQty <= 0) {
          return {
            allowed: false,
            reason: `Insufficient cash: Need ₹${requiredCash.toFixed(2)}, but available cash is ₹${portfolio.cash.toFixed(2)}.`,
            riskStatus: 'INSUFFICIENT_FUNDS',
            effectiveExecutionPrice,
            estimatedFee,
            adjustedQuantity: 0,
          };
        }
        const adjGross = roundPaise(maxAffordableQty * effectiveExecutionPrice);
        const adjFee = calculateFee(adjGross, this.config.feePercent);
        return {
          allowed: true,
          reason: `Quantity adjusted to ${maxAffordableQty} units to respect available cash limit ₹${portfolio.cash.toFixed(2)}.`,
          riskStatus: 'PASSED',
          effectiveExecutionPrice,
          estimatedFee: adjFee,
          adjustedQuantity: maxAffordableQty,
        };
      }
    } else if (side === 'SELL') {
      if (portfolio.holdingsQuantity <= 0) {
        return {
          allowed: false,
          reason: 'Cannot sell: Zero holdings in portfolio.',
          riskStatus: 'INSUFFICIENT_HOLDINGS',
          effectiveExecutionPrice,
          estimatedFee,
          adjustedQuantity: 0,
        };
      }

      let sellQty = requestedQuantity;
      if (sellQty > portfolio.holdingsQuantity) {
        sellQty = portfolio.holdingsQuantity;
      }

      const adjGross = roundPaise(sellQty * effectiveExecutionPrice);
      const adjFee = calculateFee(adjGross, this.config.feePercent);
      return {
        allowed: true,
        reason: 'Holdings validation passed.',
        riskStatus: 'PASSED',
        effectiveExecutionPrice,
        estimatedFee: adjFee,
        adjustedQuantity: sellQty,
      };
    }

    return {
      allowed: true,
      reason: 'All risk checks passed.',
      riskStatus: 'PASSED',
      effectiveExecutionPrice,
      estimatedFee,
      adjustedQuantity: requestedQuantity,
    };
  }

  public recordTradeExecuted(timeSeconds: number): void {
    this.lastTradeTimeSeconds = timeSeconds;
    this.totalTradesExecuted++;
  }
}
