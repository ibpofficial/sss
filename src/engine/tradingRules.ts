import type { StrategyRuleConfig, RuleId, RuleEvaluationState } from '../types/strategy';
import type { MarketState } from '../types/market';
import type { PortfolioState } from '../types/portfolio';
import { roundPaise } from '../utils/calculations';

export const DEFAULT_RULES_CONFIG: StrategyRuleConfig[] = [
  {
    id: 'RULE_1_BUY_DIP',
    name: 'Rule 1: Buy The Dip',
    tagline: 'WHEN TO BUY: Asset drops ≥1.0% from recent peak + 2 green recovery ticks',
    description: 'Triggers a BUY order when asset price falls ≥1% from its recent peak and confirms reversal with ≥2 consecutive upward ticks. Allocates 20% of available cash.',
    enabled: true,
    dipThresholdPercent: 1.0,
    dipConsecutiveRecovery: 2,
    dipInvestPercent: 20,
    uptrendConsecutiveAbove: 2,
    uptrendInvestPercent: 15,
    profitTargetPercent: 1.5,
    profitSellPercent: 50,
    stopLossPercent: 1.0,
    exitSecondsRemaining: 5,
  },
  {
    id: 'RULE_2_BUY_UPTREND',
    name: 'Rule 2: Buy On Confirmed Uptrend',
    tagline: 'WHEN TO BUY: Golden Cross (MA5 > MA12) + price above MA12 for ≥2 ticks',
    description: 'Triggers a BUY order when the short MA5 crosses above long MA12 and price maintains position above MA12 for ≥2 ticks. Allocates 15% of available cash.',
    enabled: true,
    dipThresholdPercent: 1.0,
    dipConsecutiveRecovery: 2,
    dipInvestPercent: 20,
    uptrendConsecutiveAbove: 2,
    uptrendInvestPercent: 15,
    profitTargetPercent: 1.5,
    profitSellPercent: 50,
    stopLossPercent: 1.0,
    exitSecondsRemaining: 5,
  },
  {
    id: 'RULE_3_SELL_PROFIT',
    name: 'Rule 3: Sell On Profit Target',
    tagline: 'WHEN TO SELL: Price rises ≥+1.5% above average entry price (Sells 50%)',
    description: 'Triggers a SELL order when market price rises ≥1.5% above position cost basis. Liquidates 50% of open holdings to lock in realized gains.',
    enabled: true,
    dipThresholdPercent: 1.0,
    dipConsecutiveRecovery: 2,
    dipInvestPercent: 20,
    uptrendConsecutiveAbove: 2,
    uptrendInvestPercent: 15,
    profitTargetPercent: 1.5,
    profitSellPercent: 50,
    stopLossPercent: 1.0,
    exitSecondsRemaining: 5,
  },
  {
    id: 'RULE_4_SELL_STOPLOSS',
    name: 'Rule 4: Sell To Limit Losses',
    tagline: 'WHEN TO SELL: Price drops ≥-1.0% below average entry (Emergency 100% Exit)',
    description: 'Highest priority risk rule: Liquidates 100% of open holdings immediately if market price drops ≥1.0% below average cost basis to protect capital.',
    enabled: true,
    dipThresholdPercent: 1.0,
    dipConsecutiveRecovery: 2,
    dipInvestPercent: 20,
    uptrendConsecutiveAbove: 2,
    uptrendInvestPercent: 15,
    profitTargetPercent: 1.5,
    profitSellPercent: 50,
    stopLossPercent: 1.0,
    exitSecondsRemaining: 5,
  },
  {
    id: 'RULE_5_EXIT_SAFE',
    name: 'Rule 5: Capital Protection & Safe Exit',
    tagline: 'WHEN TO EXIT: Halt entries at T<5s; liquidate open positions at T=120s',
    description: 'Prevents entering new trades when <5 seconds remain in the 2-minute session, and cleanly closes any open positions at the final price.',
    enabled: true,
    dipThresholdPercent: 1.0,
    dipConsecutiveRecovery: 2,
    dipInvestPercent: 20,
    uptrendConsecutiveAbove: 2,
    uptrendInvestPercent: 15,
    profitTargetPercent: 1.5,
    profitSellPercent: 50,
    stopLossPercent: 1.0,
    exitSecondsRemaining: 5,
  },
];

export interface RuleEvaluationResult {
  ruleId: RuleId;
  ruleName: string;
  triggered: boolean;
  reason: string;
  conditionDetail: string;
  proposedAction: 'BUY' | 'SELL' | 'HOLD';
  quantity: number;
}

export class TradingRuleEvaluator {
  private rulesConfig: Record<RuleId, StrategyRuleConfig>;
  private ruleStates: Record<RuleId, RuleEvaluationState>;
  private lastUptrendCrossoverHandled: boolean = false;
  private lastDipBuyPrice: number | null = null;

  constructor(configs: StrategyRuleConfig[] = DEFAULT_RULES_CONFIG) {
    this.rulesConfig = {} as Record<RuleId, StrategyRuleConfig>;
    this.ruleStates = {} as Record<RuleId, RuleEvaluationState>;

    configs.forEach(c => {
      this.rulesConfig[c.id] = { ...c };
      this.ruleStates[c.id] = {
        id: c.id,
        name: c.name,
        status: c.enabled ? 'ACTIVE' : 'DISABLED',
        conditionSummary: c.tagline,
        lastActivationTime: null,
        timesTriggered: 0,
      };
    });
  }

  public updateRuleConfig(id: RuleId, updates: Partial<StrategyRuleConfig>): void {
    if (this.rulesConfig[id]) {
      this.rulesConfig[id] = { ...this.rulesConfig[id], ...updates };
      this.ruleStates[id].status = this.rulesConfig[id].enabled ? 'ACTIVE' : 'DISABLED';
    }
  }

  public getRuleConfigs(): StrategyRuleConfig[] {
    return Object.values(this.rulesConfig);
  }

  public getRuleStates(): RuleEvaluationState[] {
    return Object.values(this.ruleStates);
  }

  public reset(): void {
    this.lastUptrendCrossoverHandled = false;
    this.lastDipBuyPrice = null;
    Object.keys(this.ruleStates).forEach(k => {
      const id = k as RuleId;
      this.ruleStates[id].lastActivationTime = null;
      this.ruleStates[id].timesTriggered = 0;
      this.ruleStates[id].status = this.rulesConfig[id].enabled ? 'ACTIVE' : 'DISABLED';
    });
  }

  /**
   * Evaluate Rule 4: Stop-Loss (Priority 1) -> WHEN TO SELL (Loss protection)
   */
  public evaluateRule4StopLoss(
    market: MarketState,
    portfolio: PortfolioState,
    timeSeconds: number
  ): RuleEvaluationResult {
    const config = this.rulesConfig['RULE_4_SELL_STOPLOSS'];
    const base: RuleEvaluationResult = {
      ruleId: 'RULE_4_SELL_STOPLOSS',
      ruleName: config.name,
      triggered: false,
      reason: 'No open position to protect',
      conditionDetail: 'Position is 0 units',
      proposedAction: 'HOLD',
      quantity: 0,
    };

    if (!config.enabled) {
      base.reason = 'Rule is disabled by user';
      return base;
    }

    if (portfolio.holdingsQuantity <= 0 || portfolio.averageCostBasis <= 0) {
      return base;
    }

    const priceDropPercent = ((portfolio.averageCostBasis - market.currentPrice) / portfolio.averageCostBasis) * 100;
    base.conditionDetail = `Entry ₹${portfolio.averageCostBasis.toFixed(2)} vs Current ₹${market.currentPrice.toFixed(2)} (Down ${priceDropPercent.toFixed(2)}%, threshold ≥${config.stopLossPercent.toFixed(2)}%)`;

    if (priceDropPercent >= config.stopLossPercent) {
      base.triggered = true;
      base.proposedAction = 'SELL';
      base.quantity = portfolio.holdingsQuantity;
      base.reason = `Stop-loss threshold breached! Current price (₹${market.currentPrice.toFixed(2)}) dropped ${priceDropPercent.toFixed(2)}% below entry (₹${portfolio.averageCostBasis.toFixed(2)}). Liquidating 100% position to protect capital.`;
      
      this.markRuleTriggered('RULE_4_SELL_STOPLOSS', timeSeconds, base.reason);
      return base;
    }

    base.reason = `Stop-loss threshold (${config.stopLossPercent}%) not hit. Position loss is ${priceDropPercent > 0 ? priceDropPercent.toFixed(2) + '%' : '0%'}.`;
    return base;
  }

  /**
   * Evaluate Rule 5: Safe Exit & Capital Protection (Priority 2) -> WHEN TO EXIT
   */
  public evaluateRule5SafeExit(
    market: MarketState,
    portfolio: PortfolioState,
    timeSeconds: number,
    sessionEnded: boolean,
    totalDurationSeconds: number = 120
  ): RuleEvaluationResult {
    const config = this.rulesConfig['RULE_5_EXIT_SAFE'];
    const timeRemaining = Math.max(0, totalDurationSeconds - timeSeconds);
    const base: RuleEvaluationResult = {
      ruleId: 'RULE_5_EXIT_SAFE',
      ruleName: config.name,
      triggered: false,
      reason: 'Session active with sufficient time remaining',
      conditionDetail: `Time remaining: ${timeRemaining}s`,
      proposedAction: 'HOLD',
      quantity: 0,
    };

    if (!config.enabled) return base;

    if (sessionEnded || timeRemaining <= 0) {
      if (portfolio.holdingsQuantity > 0) {
        base.triggered = true;
        base.proposedAction = 'SELL';
        base.quantity = portfolio.holdingsQuantity;
        base.reason = `Session timer expired (${totalDurationSeconds}s). Liquidating remaining ${portfolio.holdingsQuantity.toFixed(2)} units at final simulated price ₹${market.currentPrice.toFixed(2)} for clean session close.`;
        this.markRuleTriggered('RULE_5_EXIT_SAFE', timeSeconds, base.reason);
        return base;
      } else {
        base.conditionDetail = 'Session ended cleanly with ₹0 open position';
        return base;
      }
    }

    if (timeRemaining <= config.exitSecondsRemaining) {
      base.conditionDetail = `T-${timeRemaining}s remaining (≤${config.exitSecondsRemaining}s safety window)`;
      base.reason = `Less than ${config.exitSecondsRemaining}s remaining. New position entries locked to protect capital.`;
      return base;
    }

    return base;
  }

  /**
   * Evaluate Rule 3: Take Profit Target (Priority 3) -> WHEN TO SELL (Profit Taking)
   */
  public evaluateRule3ProfitTarget(
    market: MarketState,
    portfolio: PortfolioState,
    timeSeconds: number
  ): RuleEvaluationResult {
    const config = this.rulesConfig['RULE_3_SELL_PROFIT'];
    const base: RuleEvaluationResult = {
      ruleId: 'RULE_3_SELL_PROFIT',
      ruleName: config.name,
      triggered: false,
      reason: 'No open position to take profit on',
      conditionDetail: 'Position is 0 units',
      proposedAction: 'HOLD',
      quantity: 0,
    };

    if (!config.enabled) {
      base.reason = 'Rule is disabled by user';
      return base;
    }

    if (portfolio.holdingsQuantity <= 0 || portfolio.averageCostBasis <= 0) {
      return base;
    }

    const profitPercent = ((market.currentPrice - portfolio.averageCostBasis) / portfolio.averageCostBasis) * 100;
    base.conditionDetail = `Entry ₹${portfolio.averageCostBasis.toFixed(2)} vs Current ₹${market.currentPrice.toFixed(2)} (Gain ${profitPercent.toFixed(2)}%, target ≥${config.profitTargetPercent.toFixed(2)}%)`;

    if (profitPercent >= config.profitTargetPercent) {
      const sellQty = roundPaise((portfolio.holdingsQuantity * config.profitSellPercent) / 100);
      if (sellQty > 0) {
        base.triggered = true;
        base.proposedAction = 'SELL';
        base.quantity = sellQty;
        base.reason = `Profit target achieved! Current price (₹${market.currentPrice.toFixed(2)}) is +${profitPercent.toFixed(2)}% above entry (₹${portfolio.averageCostBasis.toFixed(2)}). Selling ${config.profitSellPercent}% (${sellQty} units) to lock in gains.`;
        this.markRuleTriggered('RULE_3_SELL_PROFIT', timeSeconds, base.reason);
        return base;
      }
    }

    base.reason = `Profit target (+${config.profitTargetPercent}%) not reached. Current open gain: ${profitPercent.toFixed(2)}%.`;
    return base;
  }

  /**
   * Evaluate Rule 1: Buy The Dip (Priority 4) -> WHEN TO BUY (Dip & Recovery)
   */
  public evaluateRule1BuyDip(
    market: MarketState,
    portfolio: PortfolioState,
    timeSeconds: number
  ): RuleEvaluationResult {
    const config = this.rulesConfig['RULE_1_BUY_DIP'];
    const base: RuleEvaluationResult = {
      ruleId: 'RULE_1_BUY_DIP',
      ruleName: config.name,
      triggered: false,
      reason: 'Dip conditions not met',
      conditionDetail: '',
      proposedAction: 'HOLD',
      quantity: 0,
    };

    if (!config.enabled) {
      base.reason = 'Rule is disabled';
      return base;
    }

    const dropFromPeak = market.recentPeak > 0 
      ? ((market.recentPeak - market.currentPrice) / market.recentPeak) * 100 
      : 0;

    base.conditionDetail = `Drop from local peak (₹${market.recentPeak.toFixed(2)}): ${dropFromPeak.toFixed(2)}% (needed ≥${config.dipThresholdPercent}%), consecutive recovery ticks: ${market.consecutiveUp} (needed ≥${config.dipConsecutiveRecovery})`;

    if (dropFromPeak < config.dipThresholdPercent) {
      base.reason = `Price is down ${dropFromPeak.toFixed(2)}% from recent peak (₹${market.recentPeak.toFixed(2)}). Dip threshold (≥${config.dipThresholdPercent}%) not reached.`;
      return base;
    }

    if (market.consecutiveUp < config.dipConsecutiveRecovery) {
      base.reason = `Price fell ${dropFromPeak.toFixed(2)}% from peak, but recovery is NOT confirmed (only ${market.consecutiveUp} consecutive up ticks, needs ≥${config.dipConsecutiveRecovery}). Waiting for reversal confirmation.`;
      return base;
    }

    const allocateCash = (portfolio.cash * config.dipInvestPercent) / 100;
    if (allocateCash < 50 || portfolio.cash < 100) {
      base.reason = `Insufficient available cash (₹${portfolio.cash.toFixed(2)}) to execute dip purchase.`;
      return base;
    }

    if (this.lastDipBuyPrice && Math.abs(market.currentPrice - this.lastDipBuyPrice) < 0.20) {
      base.reason = `Price is too close to previous dip buy level (₹${this.lastDipBuyPrice.toFixed(2)}). Avoiding redundant accumulation.`;
      return base;
    }

    const qtyToBuy = roundPaise(allocateCash / market.currentPrice);
    if (qtyToBuy <= 0) {
      base.reason = 'Calculated buy quantity is 0.';
      return base;
    }

    base.triggered = true;
    base.proposedAction = 'BUY';
    base.quantity = qtyToBuy;
    base.reason = `Rule 1 Triggered: Price fell ${dropFromPeak.toFixed(2)}% from peak ₹${market.recentPeak.toFixed(2)} and confirmed recovery with ${market.consecutiveUp} consecutive green ticks. Allocating ${config.dipInvestPercent}% of cash (₹${allocateCash.toFixed(2)}) for ${qtyToBuy} units.`;

    this.lastDipBuyPrice = market.currentPrice;
    this.markRuleTriggered('RULE_1_BUY_DIP', timeSeconds, base.reason);
    return base;
  }

  /**
   * Evaluate Rule 2: Buy On Confirmed Uptrend (Priority 5) -> WHEN TO BUY (Trend Following)
   */
  public evaluateRule2Uptrend(
    market: MarketState,
    portfolio: PortfolioState,
    timeSeconds: number
  ): RuleEvaluationResult {
    const config = this.rulesConfig['RULE_2_BUY_UPTREND'];
    const base: RuleEvaluationResult = {
      ruleId: 'RULE_2_BUY_UPTREND',
      ruleName: config.name,
      triggered: false,
      reason: 'Uptrend crossover conditions not met',
      conditionDetail: `MA5: ₹${market.priceHistory[market.priceHistory.length - 1]?.maShort.toFixed(2) || '0.00'} vs MA12: ₹${market.priceHistory[market.priceHistory.length - 1]?.maLong.toFixed(2) || '0.00'}`,
      proposedAction: 'HOLD',
      quantity: 0,
    };

    if (!config.enabled) {
      base.reason = 'Rule is disabled';
      return base;
    }

    const currentPoint = market.priceHistory[market.priceHistory.length - 1];
    if (!currentPoint) return base;

    const isBullishMa = currentPoint.maShort > currentPoint.maLong;
    base.conditionDetail = `MA5 (₹${currentPoint.maShort.toFixed(2)}) ${isBullishMa ? '>' : '≤'} MA12 (₹${currentPoint.maLong.toFixed(2)}), consecutive ticks above MA12: ${market.consecutiveAboveMaLong} (needed ≥${config.uptrendConsecutiveAbove})`;

    if (!isBullishMa) {
      this.lastUptrendCrossoverHandled = false;
      base.reason = `MA5 (₹${currentPoint.maShort.toFixed(2)}) is below or equal to MA12 (₹${currentPoint.maLong.toFixed(2)}). No bullish crossover.`;
      return base;
    }

    if (market.consecutiveAboveMaLong < config.uptrendConsecutiveAbove) {
      base.reason = `Bullish crossover detected, but price has only been above MA12 for ${market.consecutiveAboveMaLong} tick(s). Waiting for ${config.uptrendConsecutiveAbove} confirmations.`;
      return base;
    }

    if (this.lastUptrendCrossoverHandled) {
      base.reason = 'Uptrend crossover already acted upon in this trend cycle. Preventing duplicate entry.';
      return base;
    }

    const allocateCash = (portfolio.cash * config.uptrendInvestPercent) / 100;
    if (allocateCash < 50 || portfolio.cash < 100) {
      base.reason = `Insufficient available cash (₹${portfolio.cash.toFixed(2)}) for uptrend buy.`;
      return base;
    }

    const qtyToBuy = roundPaise(allocateCash / market.currentPrice);
    if (qtyToBuy <= 0) return base;

    base.triggered = true;
    base.proposedAction = 'BUY';
    base.quantity = qtyToBuy;
    base.reason = `Rule 2 Triggered: MA5 crossed above MA12 and price confirmed ${market.consecutiveAboveMaLong} ticks above MA12. Golden crossover confirmed. Allocating ${config.uptrendInvestPercent}% cash (₹${allocateCash.toFixed(2)}) for ${qtyToBuy} units.`;

    this.lastUptrendCrossoverHandled = true;
    this.markRuleTriggered('RULE_2_BUY_UPTREND', timeSeconds, base.reason);
    return base;
  }

  private markRuleTriggered(ruleId: RuleId, timeSeconds: number, reason: string): void {
    if (this.ruleStates[ruleId]) {
      this.ruleStates[ruleId].status = 'TRIGGERED';
      this.ruleStates[ruleId].lastActivationTime = timeSeconds;
      this.ruleStates[ruleId].lastTriggerReason = reason;
      this.ruleStates[ruleId].timesTriggered++;
    }
  }
}
