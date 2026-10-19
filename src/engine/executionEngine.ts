import { PortfolioLedger } from './portfolioLedger';
import type { DecisionEngineResult } from './decisionEngine';
import { MarketSimulator } from './marketSimulator';
import { RiskManager } from './riskManager';
import type { AgentStatus, Transaction } from '../types/orders';

export class ExecutionEngine {
  private ledger: PortfolioLedger;
  private riskManager: RiskManager;
  private marketSimulator: MarketSimulator;
  private agentStatus: AgentStatus = 'ANALYZING';

  constructor(
    ledger: PortfolioLedger,
    riskManager: RiskManager,
    marketSimulator: MarketSimulator
  ) {
    this.ledger = ledger;
    this.riskManager = riskManager;
    this.marketSimulator = marketSimulator;
  }

  public getAgentStatus(): AgentStatus {
    return this.agentStatus;
  }

  public setAgentStatus(status: AgentStatus): void {
    this.agentStatus = status;
  }

  /**
   * Processes a decision result from the DecisionEngine
   */
  public processDecision(
    decisionResult: DecisionEngineResult,
    timeSeconds: number
  ): Transaction | null {
    const { decision, ruleResult, riskResult } = decisionResult;

    this.ledger.addDecision(decision);

    if (this.riskManager.isEmergencyActive() || this.riskManager.isRiskLimitReached()) {
      this.agentStatus = 'RISK PAUSED';
    }

    if (decision.decision === 'HOLD') {
      const state = this.ledger.getState();
      if (this.agentStatus !== 'RISK PAUSED' && this.agentStatus !== 'SESSION_ENDED') {
        this.agentStatus = state.holdingsQuantity > 0 ? 'HOLDING' : 'ANALYZING';
      }
      return null;
    }

    if (decision.executionResult !== 'EXECUTED' || !riskResult || !riskResult.allowed) {
      return null;
    }

    let transaction: Transaction | null = null;
    const ruleName = ruleResult?.ruleName || decision.ruleId;

    if (decision.decision === 'BUY') {
      this.agentStatus = 'BUYING';
      transaction = this.ledger.executeBuy(
        decision.ruleId as any,
        ruleName,
        decision.proposedOrderQuantity,
        riskResult.effectiveExecutionPrice,
        decision.estimatedFee,
        timeSeconds,
        decision.reasoning
      );
      this.riskManager.recordTradeExecuted(timeSeconds);
      this.marketSimulator.markTradeOnHistory(
        timeSeconds,
        'BUY',
        `BUY ${decision.proposedOrderQuantity} @ ₹${riskResult.effectiveExecutionPrice.toFixed(2)} (${ruleName})`
      );
    } else if (decision.decision === 'SELL') {
      this.agentStatus = 'SELLING';
      transaction = this.ledger.executeSell(
        decision.ruleId as any,
        ruleName,
        decision.proposedOrderQuantity,
        riskResult.effectiveExecutionPrice,
        decision.estimatedFee,
        timeSeconds,
        decision.reasoning
      );
      this.riskManager.recordTradeExecuted(timeSeconds);
      this.marketSimulator.markTradeOnHistory(
        timeSeconds,
        'SELL',
        `SELL ${decision.proposedOrderQuantity} @ ₹${riskResult.effectiveExecutionPrice.toFixed(2)} (${ruleName})`
      );
    }

    decision.updatedAccountBalance = this.ledger.getState().cash;

    return transaction;
  }
}
