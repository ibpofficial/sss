export type RuleId = 
  | 'RULE_1_BUY_DIP'
  | 'RULE_2_BUY_UPTREND'
  | 'RULE_3_SELL_PROFIT'
  | 'RULE_4_SELL_STOPLOSS'
  | 'RULE_5_EXIT_SAFE';

export interface StrategyRuleConfig {
  id: RuleId;
  name: string;
  tagline: string;
  description: string;
  enabled: boolean;
  
  // Rule 1 params
  dipThresholdPercent: number; // e.g. 1.0%
  dipConsecutiveRecovery: number; // e.g. 2 updates
  dipInvestPercent: number; // e.g. 20% of cash
  
  // Rule 2 params
  uptrendConsecutiveAbove: number; // e.g. 2 updates
  uptrendInvestPercent: number; // e.g. 15% of cash
  
  // Rule 3 params
  profitTargetPercent: number; // e.g. 1.5%
  profitSellPercent: number; // e.g. 50%
  
  // Rule 4 params
  stopLossPercent: number; // e.g. 1.0%
  
  // Rule 5 params
  exitSecondsRemaining: number; // e.g. 5 seconds
}

export interface RuleEvaluationState {
  id: RuleId;
  name: string;
  status: 'ACTIVE' | 'DISABLED' | 'TRIGGERED' | 'EVALUATED_NO_TRIGGER';
  conditionSummary: string;
  lastActivationTime: number | null; // seconds
  lastTriggerReason?: string;
  timesTriggered: number;
}
