import type { PortfolioState, SessionReportData } from '../types/portfolio';
import type { Transaction, DecisionObject } from '../types/orders';
import type { RuleId } from '../types/strategy';
import { roundPaise, calculateRealizedPnL, calculateUnrealizedPnL } from '../utils/calculations';
import { formatSeconds } from '../utils/formatting';

export const INITIAL_CAPITAL = 10000.0;

export class PortfolioLedger {
  private state: PortfolioState;

  constructor(initialCapital: number = INITIAL_CAPITAL) {
    this.state = this.createInitialState(initialCapital);
  }

  private createInitialState(initialCapital: number): PortfolioState {
    return {
      initialCash: initialCapital,
      cash: initialCapital,
      holdingsQuantity: 0,
      averageCostBasis: 0,
      currentAssetPrice: 100.0,
      marketValueOfHoldings: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalEquity: initialCapital,
      totalFeesPaid: 0,
      totalReturnPercent: 0,
      peakEquity: initialCapital,
      maxDrawdown: 0,
      transactions: [],
      decisions: [],
    };
  }

  public reset(initialCapital: number = INITIAL_CAPITAL): void {
    this.state = this.createInitialState(initialCapital);
  }

  public getState(): PortfolioState {
    return {
      ...this.state,
      transactions: [...this.state.transactions],
      decisions: [...this.state.decisions],
    };
  }

  /**
   * Update mark-to-market valuations on each price tick
   */
  public updateMarketPrice(newPrice: number): void {
    this.state.currentAssetPrice = newPrice;
    this.state.marketValueOfHoldings = roundPaise(this.state.holdingsQuantity * newPrice);
    this.state.unrealizedPnL = calculateUnrealizedPnL(
      this.state.holdingsQuantity,
      newPrice,
      this.state.averageCostBasis
    );
    this.state.totalEquity = roundPaise(this.state.cash + this.state.marketValueOfHoldings);
    this.state.totalReturnPercent = roundPaise(
      ((this.state.totalEquity - this.state.initialCash) / this.state.initialCash) * 100
    );

    if (this.state.totalEquity > this.state.peakEquity) {
      this.state.peakEquity = this.state.totalEquity;
    }
    const currentDrawdown = this.state.peakEquity > 0
      ? roundPaise(((this.state.peakEquity - this.state.totalEquity) / this.state.peakEquity) * 100)
      : 0;
    if (currentDrawdown > this.state.maxDrawdown) {
      this.state.maxDrawdown = currentDrawdown;
    }
  }

  /**
   * Atomically executes a BUY order
   */
  public executeBuy(
    ruleId: RuleId | 'EMERGENCY_STOP' | 'SESSION_CLOSE',
    ruleName: string,
    quantity: number,
    executionPrice: number,
    fee: number,
    timeSeconds: number,
    reason: string
  ): Transaction {
    const grossAmount = roundPaise(quantity * executionPrice);
    const totalOutflow = roundPaise(grossAmount + fee);

    if (totalOutflow > this.state.cash) {
      throw new Error(`Execution error: Cash required (₹${totalOutflow}) exceeds available cash (₹${this.state.cash})`);
    }

    const existingCost = this.state.holdingsQuantity * this.state.averageCostBasis;
    const addedCost = quantity * executionPrice;
    const newQuantity = roundPaise(this.state.holdingsQuantity + quantity);
    const newAvgCost = newQuantity > 0 ? roundPaise((existingCost + addedCost) / newQuantity) : 0;

    this.state.cash = roundPaise(this.state.cash - totalOutflow);
    this.state.holdingsQuantity = newQuantity;
    this.state.averageCostBasis = newAvgCost;
    this.state.totalFeesPaid = roundPaise(this.state.totalFeesPaid + fee);

    this.updateMarketPrice(executionPrice);

    const tx: Transaction = {
      id: `TX-${Date.now().toString().slice(-4)}-${this.state.transactions.length + 1}`,
      sessionTime: timeSeconds,
      timeFormatted: formatSeconds(timeSeconds),
      side: 'BUY',
      ruleId,
      ruleName,
      quantity,
      price: executionPrice,
      grossAmount,
      fee,
      netCashMovement: -totalOutflow,
      realizedPnL: null,
      executionStatus: 'EXECUTED',
      reason,
    };

    this.state.transactions.unshift(tx);
    return tx;
  }

  /**
   * Atomically executes a SELL order
   */
  public executeSell(
    ruleId: RuleId | 'EMERGENCY_STOP' | 'SESSION_CLOSE',
    ruleName: string,
    quantity: number,
    executionPrice: number,
    fee: number,
    timeSeconds: number,
    reason: string
  ): Transaction {
    if (quantity > this.state.holdingsQuantity) {
      throw new Error(`Execution error: Quantity to sell (${quantity}) exceeds holdings (${this.state.holdingsQuantity})`);
    }

    const grossAmount = roundPaise(quantity * executionPrice);
    const netProceeds = roundPaise(grossAmount - fee);
    const realized = calculateRealizedPnL(quantity, executionPrice, this.state.averageCostBasis, fee);

    const remainingQty = roundPaise(this.state.holdingsQuantity - quantity);

    this.state.cash = roundPaise(this.state.cash + netProceeds);
    this.state.holdingsQuantity = remainingQty;
    if (remainingQty <= 0) {
      this.state.averageCostBasis = 0;
      this.state.holdingsQuantity = 0;
    }
    this.state.realizedPnL = roundPaise(this.state.realizedPnL + realized);
    this.state.totalFeesPaid = roundPaise(this.state.totalFeesPaid + fee);

    this.updateMarketPrice(executionPrice);

    const tx: Transaction = {
      id: `TX-${Date.now().toString().slice(-4)}-${this.state.transactions.length + 1}`,
      sessionTime: timeSeconds,
      timeFormatted: formatSeconds(timeSeconds),
      side: 'SELL',
      ruleId,
      ruleName,
      quantity,
      price: executionPrice,
      grossAmount,
      fee,
      netCashMovement: netProceeds,
      realizedPnL: realized,
      executionStatus: 'EXECUTED',
      reason,
    };

    this.state.transactions.unshift(tx);
    return tx;
  }

  public addDecision(decision: DecisionObject): void {
    this.state.decisions.unshift(decision);
    if (this.state.decisions.length > 100) {
      this.state.decisions.pop();
    }
  }

  /**
   * Calculate final performance report
   */
  public generateSessionReport(): SessionReportData {
    const closedTrades = this.state.transactions.filter(t => t.side === 'SELL' && t.realizedPnL !== null);
    const winningTrades = closedTrades.filter(t => (t.realizedPnL ?? 0) > 0).length;
    const losingTrades = closedTrades.filter(t => (t.realizedPnL ?? 0) < 0).length;
    const winRate = closedTrades.length > 0 
      ? roundPaise((winningTrades / closedTrades.length) * 100) 
      : 0;

    const rulesTriggeredCounts: Record<string, number> = {};
    this.state.transactions.forEach(t => {
      rulesTriggeredCounts[t.ruleName] = (rulesTriggeredCounts[t.ruleName] || 0) + 1;
    });

    const finalTotalPnL = roundPaise(this.state.totalEquity - this.state.initialCash);

    return {
      initialCapital: this.state.initialCash,
      finalEquity: this.state.totalEquity,
      realizedPnL: this.state.realizedPnL,
      unrealizedPnL: this.state.unrealizedPnL,
      finalTotalPnL,
      returnPercent: this.state.totalReturnPercent,
      totalTrades: this.state.transactions.length,
      winningTrades,
      losingTrades,
      winRate,
      totalFees: this.state.totalFeesPaid,
      maxDrawdownPercent: this.state.maxDrawdown,
      rulesTriggeredCounts,
      totalDecisionsCount: this.state.decisions.length,
      closedTradesCount: closedTrades.length,
    };
  }
}
