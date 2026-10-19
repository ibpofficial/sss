import type { RuleId } from './strategy';

export type OrderSide = 'BUY' | 'SELL';
export type OrderAction = 'BUY' | 'SELL' | 'HOLD';
export type OrderStatus = 'EXECUTED' | 'REJECTED' | 'CANCELLED';

export type AgentStatus = 
  | 'ANALYZING'
  | 'BUYING'
  | 'HOLDING'
  | 'SELLING'
  | 'RISK PAUSED'
  | 'SESSION_ENDED';

export interface DecisionObject {
  id: string;
  timestamp: number; // seconds into session (0-60)
  timeFormatted: string; // "00:14"
  observedPrice: number;
  currentPosition: number;
  ruleId: RuleId | 'RISK_CONTROL' | 'SESSION_CLOSE' | 'EMERGENCY_STOP' | 'NONE';
  triggerCondition: string;
  decision: OrderAction;
  reasoning: string;
  proposedOrderQuantity: number;
  estimatedFee: number;
  executionResult: OrderStatus;
  updatedAccountBalance: number;
  riskStatus: string;
}

export interface Transaction {
  id: string;
  sessionTime: number; // seconds into session
  timeFormatted: string; // "00:14"
  side: OrderSide;
  ruleId: RuleId | 'SESSION_CLOSE' | 'EMERGENCY_STOP';
  ruleName: string;
  quantity: number;
  price: number;
  grossAmount: number;
  fee: number;
  netCashMovement: number; // BUY: -(gross + fee), SELL: +(gross - fee)
  realizedPnL: number | null; // null for BUY, number for SELL
  executionStatus: OrderStatus;
  reason: string;
}
