import { MarketSimulator } from './marketSimulator';
import type { SimulationScenario } from './marketSimulator';
import { TradingRuleEvaluator, DEFAULT_RULES_CONFIG } from './tradingRules';
import { RiskManager, DEFAULT_RISK_CONFIG } from './riskManager';
import { PortfolioLedger, INITIAL_CAPITAL } from './portfolioLedger';
import { DecisionEngine } from './decisionEngine';
import { ExecutionEngine } from './executionEngine';
import type { MarketState } from '../types/market';
import type { PortfolioState, SessionReportData } from '../types/portfolio';
import type { AgentStatus } from '../types/orders';
import type { StrategyRuleConfig, RuleEvaluationState } from '../types/strategy';

export type SimulationRunState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'STOPPED';

export interface SessionSnapshot {
  runState: SimulationRunState;
  timeRemaining: number; // 120 down to 0
  elapsedSeconds: number; // 0 up to 120
  agentStatus: AgentStatus;
  market: MarketState;
  portfolio: PortfolioState;
  ruleStates: RuleEvaluationState[];
  ruleConfigs: StrategyRuleConfig[];
  sessionReport: SessionReportData | null;
  seed: number;
  scenario: SimulationScenario;
  maxDurationSeconds: number;
}

export class SessionController {
  private simulator: MarketSimulator;
  private ruleEvaluator: TradingRuleEvaluator;
  private riskManager: RiskManager;
  private ledger: PortfolioLedger;
  private decisionEngine: DecisionEngine;
  private executionEngine: ExecutionEngine;

  private runState: SimulationRunState = 'IDLE';
  private elapsedSeconds: number = 0;
  private maxDurationSeconds: number = 120; // 2 minutes (120 seconds)
  private timerId: any = null;
  private tickIntervalMs: number = 750; // ~750ms per simulated second for snappy smooth updates

  private initialSeed: number = 42;
  private currentScenario: SimulationScenario = 'DIP_AND_REBOUND';
  private sessionReport: SessionReportData | null = null;
  private listeners: Set<(snapshot: SessionSnapshot) => void> = new Set();

  constructor(seed: number = 42, scenario: SimulationScenario = 'DIP_AND_REBOUND', durationSeconds: number = 120) {
    this.initialSeed = seed;
    this.currentScenario = scenario;
    this.maxDurationSeconds = durationSeconds;

    this.simulator = new MarketSimulator({
      initialPrice: 100.0,
      seed: this.initialSeed,
      scenario: this.currentScenario,
      volatility: 0.006,
    });

    this.ruleEvaluator = new TradingRuleEvaluator(DEFAULT_RULES_CONFIG);
    this.riskManager = new RiskManager(DEFAULT_RISK_CONFIG);
    this.ledger = new PortfolioLedger(INITIAL_CAPITAL);
    this.decisionEngine = new DecisionEngine(this.ruleEvaluator, this.riskManager);
    this.executionEngine = new ExecutionEngine(this.ledger, this.riskManager, this.simulator);
  }

  public subscribe(listener: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach(fn => fn(snap));
  }

  public getSnapshot(): SessionSnapshot {
    return {
      runState: this.runState,
      timeRemaining: Math.max(0, this.maxDurationSeconds - this.elapsedSeconds),
      elapsedSeconds: this.elapsedSeconds,
      agentStatus: this.executionEngine.getAgentStatus(),
      market: this.simulator.getMarketState(),
      portfolio: this.ledger.getState(),
      ruleStates: this.ruleEvaluator.getRuleStates(),
      ruleConfigs: this.ruleEvaluator.getRuleConfigs(),
      sessionReport: this.sessionReport,
      seed: this.initialSeed,
      scenario: this.currentScenario,
      maxDurationSeconds: this.maxDurationSeconds,
    };
  }

  public start(): void {
    if (this.runState === 'RUNNING') return;
    if (this.runState === 'COMPLETED' || this.runState === 'STOPPED') {
      this.reset();
    }
    this.runState = 'RUNNING';
    this.executionEngine.setAgentStatus('ANALYZING');
    this.scheduleNextTick();
    this.notify();
  }

  public pause(): void {
    if (this.runState !== 'RUNNING') return;
    this.clearTimer();
    this.runState = 'PAUSED';
    this.notify();
  }

  public resume(): void {
    if (this.runState !== 'PAUSED') return;
    this.runState = 'RUNNING';
    this.scheduleNextTick();
    this.notify();
  }

  public emergencyStop(): void {
    this.clearTimer();
    this.runState = 'STOPPED';
    this.riskManager.triggerEmergencyStop();
    this.executionEngine.setAgentStatus('RISK PAUSED');

    const riskCfg = this.riskManager.getConfig();
    const portState = this.ledger.getState();
    const marketState = this.simulator.getMarketState();

    if (riskCfg.emergencyCloseOnStop && portState.holdingsQuantity > 0) {
      const decisionRes = {
        decision: {
          id: `EMERGENCY-${this.elapsedSeconds}`,
          timestamp: this.elapsedSeconds,
          timeFormatted: `${this.elapsedSeconds}s`,
          observedPrice: marketState.currentPrice,
          currentPosition: portState.holdingsQuantity,
          ruleId: 'EMERGENCY_STOP' as any,
          triggerCondition: 'Manual Emergency Stop Button Triggered',
          decision: 'SELL' as const,
          reasoning: 'Emergency Stop pressed: Liquidating open position to protect capital.',
          proposedOrderQuantity: portState.holdingsQuantity,
          estimatedFee: 0,
          executionResult: 'EXECUTED' as const,
          updatedAccountBalance: portState.cash,
          riskStatus: 'EMERGENCY_STOP',
        },
        ruleResult: {
          ruleId: 'RULE_4_SELL_STOPLOSS' as any,
          ruleName: 'Emergency Stop Liquidation',
          triggered: true,
          reason: 'Emergency Stop Pressed by User',
          conditionDetail: 'Forced liquidation',
          proposedAction: 'SELL' as const,
          quantity: portState.holdingsQuantity,
        },
        riskResult: {
          allowed: true,
          reason: 'Emergency liquidation permitted',
          riskStatus: 'PASSED' as const,
          effectiveExecutionPrice: marketState.currentPrice,
          estimatedFee: 0,
          adjustedQuantity: portState.holdingsQuantity,
        },
      };
      this.executionEngine.processDecision(decisionRes, this.elapsedSeconds);
    }

    this.sessionReport = this.ledger.generateSessionReport();
    this.notify();
  }

  public reset(seed?: number, scenario?: SimulationScenario): void {
    this.clearTimer();
    if (seed !== undefined) this.initialSeed = seed;
    if (scenario !== undefined) this.currentScenario = scenario;

    this.runState = 'IDLE';
    this.elapsedSeconds = 0;
    this.sessionReport = null;

    this.simulator.reset(this.initialSeed, this.currentScenario);
    this.ruleEvaluator.reset();
    this.riskManager.reset();
    this.ledger.reset(INITIAL_CAPITAL);
    this.decisionEngine.reset();
    this.executionEngine.setAgentStatus('ANALYZING');

    this.notify();
  }

  public replay(): void {
    this.reset(this.initialSeed, this.currentScenario);
    this.start();
  }

  public setScenario(scenario: SimulationScenario): void {
    if (this.runState === 'RUNNING') return;
    this.currentScenario = scenario;
    this.reset(this.initialSeed, scenario);
  }

  public setSeed(seed: number): void {
    if (this.runState === 'RUNNING') return;
    this.initialSeed = seed;
    this.reset(seed, this.currentScenario);
  }

  public setDuration(seconds: number): void {
    if (this.runState === 'RUNNING') return;
    this.maxDurationSeconds = seconds;
    this.reset(this.initialSeed, this.currentScenario);
  }

  public updateRule(id: any, updates: Partial<StrategyRuleConfig>): void {
    if (this.runState === 'RUNNING') return;
    this.ruleEvaluator.updateRuleConfig(id, updates);
    this.notify();
  }

  public updateRisk(updates: Partial<typeof DEFAULT_RISK_CONFIG>): void {
    if (this.runState === 'RUNNING') return;
    this.riskManager.updateConfig(updates);
    this.notify();
  }

  public destroy(): void {
    this.clearTimer();
    this.listeners.clear();
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextTick(): void {
    this.clearTimer();
    this.timerId = setTimeout(() => {
      this.tick();
    }, this.tickIntervalMs);
  }

  private tick(): void {
    if (this.runState !== 'RUNNING') return;

    this.elapsedSeconds++;

    const pricePoint = this.simulator.nextTick(this.elapsedSeconds);
    const marketState = this.simulator.getMarketState();

    this.ledger.updateMarketPrice(pricePoint.price);

    const isSessionEnd = this.elapsedSeconds >= this.maxDurationSeconds;

    const decisionRes = this.decisionEngine.evaluateMarket(
      marketState,
      this.ledger.getState(),
      this.elapsedSeconds,
      isSessionEnd,
      this.maxDurationSeconds
    );

    this.executionEngine.processDecision(decisionRes, this.elapsedSeconds);

    if (isSessionEnd) {
      this.runState = 'COMPLETED';
      this.executionEngine.setAgentStatus('SESSION_ENDED');
      this.sessionReport = this.ledger.generateSessionReport();
      this.clearTimer();
      this.notify();
      return;
    }

    this.notify();
    this.scheduleNextTick();
  }
}
