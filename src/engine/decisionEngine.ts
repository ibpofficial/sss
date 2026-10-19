import type { MarketState } from '../types/market';
import type { PortfolioState } from '../types/portfolio';
import type { DecisionObject } from '../types/orders';
import type { TradingRuleEvaluator, RuleEvaluationResult } from './tradingRules';
import type { RiskManager, RiskCheckResult } from './riskManager';
import { formatSeconds } from '../utils/formatting';

export interface DecisionEngineResult {
  decision: DecisionObject;
  ruleResult?: RuleEvaluationResult;
  riskResult?: RiskCheckResult;
}

export class DecisionEngine {
  private ruleEvaluator: TradingRuleEvaluator;
  private riskManager: RiskManager;
  private decisionCounter: number = 0;

  constructor(ruleEvaluator: TradingRuleEvaluator, riskManager: RiskManager) {
    this.ruleEvaluator = ruleEvaluator;
    this.riskManager = riskManager;
  }

  public reset(): void {
    this.decisionCounter = 0;
  }

  /**
   * Evaluates the market state against predefined rules and risk limits
   * Priority:
   * 1. Stop-loss and risk controls (Rule 4)
   * 2. Session-end exit (Rule 5)
   * 3. Profit-taking (Rule 3)
   * 4. Confirmed dip-buying (Rule 1)
   * 5. Confirmed trend-buying (Rule 2)
   * 6. Hold when no rule is satisfied
   */
  public evaluateMarket(
    market: MarketState,
    portfolio: PortfolioState,
    timeSeconds: number,
    sessionEnded: boolean = false,
    totalDurationSeconds: number = 120
  ): DecisionEngineResult {
    this.decisionCounter++;
    const id = `DEC-${timeSeconds}-${this.decisionCounter}`;
    const timeFormatted = formatSeconds(timeSeconds);

    // 1. PRIORITY 1: Stop-Loss Evaluation (Rule 4) -> SELL 100%
    const rule4 = this.ruleEvaluator.evaluateRule4StopLoss(market, portfolio, timeSeconds);
    if (rule4.triggered) {
      const riskCheck = this.riskManager.validateOrder(
        'SELL',
        rule4.quantity,
        market.currentPrice,
        portfolio,
        timeSeconds,
        true
      );

      const decision: DecisionObject = {
        id,
        timestamp: timeSeconds,
        timeFormatted,
        observedPrice: market.currentPrice,
        currentPosition: portfolio.holdingsQuantity,
        ruleId: 'RULE_4_SELL_STOPLOSS',
        triggerCondition: rule4.conditionDetail,
        decision: 'SELL',
        reasoning: rule4.reason,
        proposedOrderQuantity: riskCheck.adjustedQuantity,
        estimatedFee: riskCheck.estimatedFee,
        executionResult: riskCheck.allowed ? 'EXECUTED' : 'REJECTED',
        updatedAccountBalance: portfolio.cash,
        riskStatus: riskCheck.riskStatus,
      };
      return { decision, ruleResult: rule4, riskResult: riskCheck };
    }

    // 2. PRIORITY 2: Session-End Exit & Capital Protection (Rule 5)
    const rule5 = this.ruleEvaluator.evaluateRule5SafeExit(market, portfolio, timeSeconds, sessionEnded, totalDurationSeconds);
    if (rule5.triggered) {
      const riskCheck = this.riskManager.validateOrder(
        'SELL',
        rule5.quantity,
        market.currentPrice,
        portfolio,
        timeSeconds,
        true
      );

      const decision: DecisionObject = {
        id,
        timestamp: timeSeconds,
        timeFormatted,
        observedPrice: market.currentPrice,
        currentPosition: portfolio.holdingsQuantity,
        ruleId: 'RULE_5_EXIT_SAFE',
        triggerCondition: rule5.conditionDetail,
        decision: 'SELL',
        reasoning: rule5.reason,
        proposedOrderQuantity: riskCheck.adjustedQuantity,
        estimatedFee: riskCheck.estimatedFee,
        executionResult: riskCheck.allowed ? 'EXECUTED' : 'REJECTED',
        updatedAccountBalance: portfolio.cash,
        riskStatus: riskCheck.riskStatus,
      };
      return { decision, ruleResult: rule5, riskResult: riskCheck };
    }

    // If session has less than 5 seconds, lock new entries
    const timeRemaining = Math.max(0, totalDurationSeconds - timeSeconds);
    if (timeRemaining <= 5 && !sessionEnded) {
      const decision: DecisionObject = {
        id,
        timestamp: timeSeconds,
        timeFormatted,
        observedPrice: market.currentPrice,
        currentPosition: portfolio.holdingsQuantity,
        ruleId: 'RULE_5_EXIT_SAFE',
        triggerCondition: `T-${timeRemaining}s remaining (Safety Lock)`,
        decision: 'HOLD',
        reasoning: `Rule 5 active: Less than 5s left in session (${timeRemaining}s). New position entries blocked to protect virtual capital.`,
        proposedOrderQuantity: 0,
        estimatedFee: 0,
        executionResult: 'EXECUTED',
        updatedAccountBalance: portfolio.cash,
        riskStatus: 'SESSION_LOCKED',
      };
      return { decision };
    }

    // 3. PRIORITY 3: Profit Target Evaluation (Rule 3) -> SELL 50%
    const rule3 = this.ruleEvaluator.evaluateRule3ProfitTarget(market, portfolio, timeSeconds);
    if (rule3.triggered) {
      const riskCheck = this.riskManager.validateOrder(
        'SELL',
        rule3.quantity,
        market.currentPrice,
        portfolio,
        timeSeconds,
        true
      );

      const decision: DecisionObject = {
        id,
        timestamp: timeSeconds,
        timeFormatted,
        observedPrice: market.currentPrice,
        currentPosition: portfolio.holdingsQuantity,
        ruleId: 'RULE_3_SELL_PROFIT',
        triggerCondition: rule3.conditionDetail,
        decision: 'SELL',
        reasoning: rule3.reason,
        proposedOrderQuantity: riskCheck.adjustedQuantity,
        estimatedFee: riskCheck.estimatedFee,
        executionResult: riskCheck.allowed ? 'EXECUTED' : 'REJECTED',
        updatedAccountBalance: portfolio.cash,
        riskStatus: riskCheck.riskStatus,
      };
      return { decision, ruleResult: rule3, riskResult: riskCheck };
    }

    // 4. PRIORITY 4: Buy The Dip Evaluation (Rule 1) -> BUY 20%
    const rule1 = this.ruleEvaluator.evaluateRule1BuyDip(market, portfolio, timeSeconds);
    if (rule1.triggered) {
      const riskCheck = this.riskManager.validateOrder(
        'BUY',
        rule1.quantity,
        market.currentPrice,
        portfolio,
        timeSeconds,
        false
      );

      const decision: DecisionObject = {
        id,
        timestamp: timeSeconds,
        timeFormatted,
        observedPrice: market.currentPrice,
        currentPosition: portfolio.holdingsQuantity,
        ruleId: 'RULE_1_BUY_DIP',
        triggerCondition: rule1.conditionDetail,
        decision: riskCheck.allowed ? 'BUY' : 'HOLD',
        reasoning: riskCheck.allowed ? rule1.reason : `${rule1.reason} | Risk Check Blocked: ${riskCheck.reason}`,
        proposedOrderQuantity: riskCheck.adjustedQuantity,
        estimatedFee: riskCheck.estimatedFee,
        executionResult: riskCheck.allowed ? 'EXECUTED' : 'REJECTED',
        updatedAccountBalance: portfolio.cash,
        riskStatus: riskCheck.riskStatus,
      };
      return { decision, ruleResult: rule1, riskResult: riskCheck };
    }

    // 5. PRIORITY 5: Buy On Confirmed Uptrend Evaluation (Rule 2) -> BUY 15%
    const rule2 = this.ruleEvaluator.evaluateRule2Uptrend(market, portfolio, timeSeconds);
    if (rule2.triggered) {
      const riskCheck = this.riskManager.validateOrder(
        'BUY',
        rule2.quantity,
        market.currentPrice,
        portfolio,
        timeSeconds,
        false
      );

      const decision: DecisionObject = {
        id,
        timestamp: timeSeconds,
        timeFormatted,
        observedPrice: market.currentPrice,
        currentPosition: portfolio.holdingsQuantity,
        ruleId: 'RULE_2_BUY_UPTREND',
        triggerCondition: rule2.conditionDetail,
        decision: riskCheck.allowed ? 'BUY' : 'HOLD',
        reasoning: riskCheck.allowed ? rule2.reason : `${rule2.reason} | Risk Check Blocked: ${riskCheck.reason}`,
        proposedOrderQuantity: riskCheck.adjustedQuantity,
        estimatedFee: riskCheck.estimatedFee,
        executionResult: riskCheck.allowed ? 'EXECUTED' : 'REJECTED',
        updatedAccountBalance: portfolio.cash,
        riskStatus: riskCheck.riskStatus,
      };
      return { decision, ruleResult: rule2, riskResult: riskCheck };
    }

    // 6. PRIORITY 6: Hold when no rule satisfied
    let holdReason = 'Monitoring market conditions: No rule conditions satisfied.';
    if (portfolio.holdingsQuantity > 0) {
      const diff = ((market.currentPrice - portfolio.averageCostBasis) / portfolio.averageCostBasis) * 100;
      holdReason = `Holding open position (${portfolio.holdingsQuantity.toFixed(2)} units). Current P/L: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%. Within profit/loss tolerance bands.`;
    } else {
      holdReason = `Monitoring price fluctuations (₹${market.currentPrice.toFixed(2)}). Waiting for dip recovery or golden cross.`;
    }

    const decision: DecisionObject = {
      id,
      timestamp: timeSeconds,
      timeFormatted,
      observedPrice: market.currentPrice,
      currentPosition: portfolio.holdingsQuantity,
      ruleId: 'NONE',
      triggerCondition: 'All rule criteria within neutral bounds',
      decision: 'HOLD',
      reasoning: holdReason,
      proposedOrderQuantity: 0,
      estimatedFee: 0,
      executionResult: 'EXECUTED',
      updatedAccountBalance: portfolio.cash,
      riskStatus: 'PASSED',
    };

    return { decision };
  }
}
