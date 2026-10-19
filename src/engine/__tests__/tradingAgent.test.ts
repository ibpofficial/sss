import { describe, it, expect, beforeEach } from 'vitest';
import { PortfolioLedger, INITIAL_CAPITAL } from '../portfolioLedger';
import { MarketSimulator } from '../marketSimulator';
import { TradingRuleEvaluator, DEFAULT_RULES_CONFIG } from '../tradingRules';
import { RiskManager, DEFAULT_RISK_CONFIG } from '../riskManager';
import { DecisionEngine } from '../decisionEngine';
import { ExecutionEngine } from '../executionEngine';
import { SessionController } from '../sessionController';

describe('Autonomous AI Trading Agent - Automated Verification Tests (18 Requirements)', () => {
  let ledger: PortfolioLedger;
  let ruleEvaluator: TradingRuleEvaluator;
  let riskManager: RiskManager;
  let simulator: MarketSimulator;
  let decisionEngine: DecisionEngine;
  let executionEngine: ExecutionEngine;

  beforeEach(() => {
    ledger = new PortfolioLedger(INITIAL_CAPITAL);
    ruleEvaluator = new TradingRuleEvaluator(DEFAULT_RULES_CONFIG);
    riskManager = new RiskManager(DEFAULT_RISK_CONFIG);
    simulator = new MarketSimulator({
      initialPrice: 100.0,
      seed: 42,
      scenario: 'DIP_AND_REBOUND',
      volatility: 0.005,
    });
    decisionEngine = new DecisionEngine(ruleEvaluator, riskManager);
    executionEngine = new ExecutionEngine(ledger, riskManager, simulator);
  });

  // Test 1: Initial balance equals ₹10,000
  it('1. Initial balance equals ₹10,000 and holdings are 0', () => {
    const state = ledger.getState();
    expect(state.cash).toBe(10000.0);
    expect(state.initialCash).toBe(10000.0);
    expect(state.holdingsQuantity).toBe(0);
    expect(state.totalEquity).toBe(10000.0);
    expect(state.realizedPnL).toBe(0);
    expect(state.unrealizedPnL).toBe(0);
  });

  // Test 2: Valid dip signal triggers the correct rule
  it('2. A valid dip signal triggers Rule 1 Buy The Dip', () => {
    const market = simulator.getMarketState();
    market.recentPeak = 100.0;
    market.currentPrice = 98.8; // 1.2% dip
    market.consecutiveUp = 2; // Confirmed 2 green ticks

    const ruleRes = ruleEvaluator.evaluateRule1BuyDip(market, ledger.getState(), 10);
    expect(ruleRes.triggered).toBe(true);
    expect(ruleRes.ruleId).toBe('RULE_1_BUY_DIP');
    expect(ruleRes.proposedAction).toBe('BUY');
    expect(ruleRes.quantity).toBeGreaterThan(0);
  });

  // Test 3: Falling price without recovery confirmation does NOT trigger a dip purchase
  it('3. A falling price without recovery confirmation does not trigger a dip purchase', () => {
    const market = simulator.getMarketState();
    market.recentPeak = 100.0;
    market.currentPrice = 98.0; // 2% dip
    market.consecutiveUp = 0; // Still falling!
    market.consecutiveDown = 3;

    const ruleRes = ruleEvaluator.evaluateRule1BuyDip(market, ledger.getState(), 10);
    expect(ruleRes.triggered).toBe(false);
    expect(ruleRes.proposedAction).toBe('HOLD');
    expect(ruleRes.reason).toContain('NOT confirmed');
  });

  // Test 4: Confirmed moving-average crossover triggers at most one entry per crossover
  it('4. A confirmed moving-average crossover triggers at most one entry per crossover', () => {
    const market = simulator.getMarketState();
    market.consecutiveAboveMaLong = 2;
    // Mock priceHistory with MA5 > MA12
    market.priceHistory = [
      {
        index: 0,
        timeSeconds: 10,
        timeFormatted: '00:10',
        price: 102,
        open: 101,
        high: 103,
        low: 100,
        close: 102,
        change: 1,
        changePercent: 0.98,
        maShort: 101.5,
        maLong: 100.2, // Bullish cross
        direction: 'up',
      },
    ];

    const firstEval = ruleEvaluator.evaluateRule2Uptrend(market, ledger.getState(), 10);
    expect(firstEval.triggered).toBe(true);
    expect(firstEval.ruleId).toBe('RULE_2_BUY_UPTREND');

    // Immediate second evaluation on same crossover should be blocked
    const secondEval = ruleEvaluator.evaluateRule2Uptrend(market, ledger.getState(), 11);
    expect(secondEval.triggered).toBe(false);
    expect(secondEval.reason).toContain('already acted upon');
  });

  // Test 5: Profit target closes the correct portion of the position
  it('5. A profit target closes the correct portion of the position (50%)', () => {
    // Buy 20 units at ₹100
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 20, 100, 2, 5, 'Dip Buy');
    const portState = ledger.getState();
    expect(portState.holdingsQuantity).toBe(20);

    // Market moves up to ₹102 (+2% > 1.5% target)
    const market = simulator.getMarketState();
    market.currentPrice = 102.0;

    const evalRes = ruleEvaluator.evaluateRule3ProfitTarget(market, portState, 20);
    expect(evalRes.triggered).toBe(true);
    expect(evalRes.ruleId).toBe('RULE_3_SELL_PROFIT');
    expect(evalRes.proposedAction).toBe('SELL');
    // 50% of 20 units = 10 units
    expect(evalRes.quantity).toBe(10);
  });

  // Test 6: Stop-loss has priority over ordinary buy signals
  it('6. A stop-loss has priority over ordinary buy signals', () => {
    // Open position: 20 units @ ₹100
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 20, 100, 2, 5, 'Dip buy');

    // Price drops to ₹98.5 (1.5% drop > 1.0% stop-loss threshold)
    // Simultaneously fabricate a dip recovery signal
    const market = simulator.getMarketState();
    market.currentPrice = 98.5;
    market.recentPeak = 101.0;
    market.consecutiveUp = 2; // Dip condition would otherwise trigger

    const decisionRes = decisionEngine.evaluateMarket(market, ledger.getState(), 15);
    expect(decisionRes.decision.ruleId).toBe('RULE_4_SELL_STOPLOSS');
    expect(decisionRes.decision.decision).toBe('SELL');
    expect(decisionRes.decision.proposedOrderQuantity).toBe(20); // Full liquidation
  });

  // Test 7: Trade cannot exceed the available cash balance
  it('7. A trade cannot exceed the available cash balance', () => {
    const portState = ledger.getState();
    // Try to buy 200 units at ₹100 = ₹20,000 (exceeds ₹10,000 cash)
    const riskCheck = riskManager.validateOrder('BUY', 200, 100, portState, 10);
    // Adjusted quantity should not exceed cash capacity
    expect(riskCheck.adjustedQuantity * 100).toBeLessThanOrEqual(portState.cash);
  });

  // Test 8: Selling cannot exceed the available asset quantity
  it('8. Selling cannot exceed the available asset quantity', () => {
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 10, 100, 1, 5, 'Dip Buy');
    const portState = ledger.getState();
    expect(portState.holdingsQuantity).toBe(10);

    // Request sell of 50 units
    const riskCheck = riskManager.validateOrder('SELL', 50, 102, portState, 10);
    expect(riskCheck.adjustedQuantity).toBe(10); // Capped to 10
  });

  // Test 9: Transaction fees are deducted correctly
  it('9. Transaction fees are deducted correctly (0.1%)', () => {
    // Buy 10 units at ₹100 = gross ₹1,000. Fee at 0.1% = ₹1.00
    const tx = ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 10, 100, 1.0, 5, 'Test');
    expect(tx.fee).toBe(1.0);
    expect(tx.grossAmount).toBe(1000.0);
    expect(tx.netCashMovement).toBe(-1001.0);
    expect(ledger.getState().cash).toBe(8999.0);
    expect(ledger.getState().totalFeesPaid).toBe(1.0);
  });

  // Test 10: Realized and unrealized P/L are calculated correctly
  it('10. Realized and unrealized P/L are calculated correctly', () => {
    // Buy 10 units @ ₹100 (Cost basis = ₹100)
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 10, 100, 1.0, 5, 'Buy');
    
    // Price moves to ₹105: Unrealized PnL = 10 * (105 - 100) = ₹50
    ledger.updateMarketPrice(105);
    expect(ledger.getState().unrealizedPnL).toBe(50.0);

    // Sell 5 units @ ₹105. Gross = 525, Fee = 0.53, Net = 524.47, Cost = 500
    // Realized PnL = 524.47 - 500 = 24.47
    const tx = ledger.executeSell('RULE_3_SELL_PROFIT', 'Rule 3', 5, 105, 0.53, 10, 'Sell');
    expect(tx.realizedPnL).toBe(24.47);
    expect(ledger.getState().realizedPnL).toBe(24.47);
    expect(ledger.getState().holdingsQuantity).toBe(5);
  });

  // Test 11: Duplicate order execution is prevented
  it('11. Duplicate order execution is prevented by cooldown and state tracking', () => {
    const market = simulator.getMarketState();
    market.recentPeak = 100;
    market.currentPrice = 98.8;
    market.consecutiveUp = 2;

    const res1 = decisionEngine.evaluateMarket(market, ledger.getState(), 10);
    executionEngine.processDecision(res1, 10);

    // Immediately at the exact same second or within 2s cooldown
    const res2 = decisionEngine.evaluateMarket(market, ledger.getState(), 11);
    // Should be blocked by cooldown or duplicate price protection
    expect(res2.decision.decision).toBe('HOLD');
  });

  // Test 12: Pausing stops new market updates and decisions
  it('12. Pausing stops new market updates and decisions', () => {
    const session = new SessionController();
    session.start();
    expect(session.getSnapshot().runState).toBe('RUNNING');
    session.pause();
    expect(session.getSnapshot().runState).toBe('PAUSED');
    session.destroy();
  });

  // Test 13: Resuming continues the same session without resetting the portfolio
  it('13. Resuming continues the same session without resetting portfolio', () => {
    const session = new SessionController();
    session.start();
    session.pause();
    const snapPaused = session.getSnapshot();
    session.resume();
    const snapResumed = session.getSnapshot();
    expect(snapResumed.portfolio.cash).toBe(snapPaused.portfolio.cash);
    expect(snapResumed.elapsedSeconds).toBe(snapPaused.elapsedSeconds);
    session.destroy();
  });

  // Test 14: Session expiry stops new entries and closes any remaining position once
  it('14. Session expiry stops new entries and closes remaining position cleanly', () => {
    // Give portfolio an open position
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 15, 100, 1.5, 10, 'Dip Buy');
    expect(ledger.getState().holdingsQuantity).toBe(15);

    const market = simulator.getMarketState();
    market.currentPrice = 101.0;

    // Simulate session end (time = 60s, isSessionEnd = true)
    const decisionRes = decisionEngine.evaluateMarket(market, ledger.getState(), 60, true);
    expect(decisionRes.decision.ruleId).toBe('RULE_5_EXIT_SAFE');
    expect(decisionRes.decision.decision).toBe('SELL');
    expect(decisionRes.decision.proposedOrderQuantity).toBe(15);

    // Process the decision
    executionEngine.processDecision(decisionRes, 60);
    expect(ledger.getState().holdingsQuantity).toBe(0);

    // Check that evaluating again does not execute duplicate sell
    const decisionRes2 = decisionEngine.evaluateMarket(market, ledger.getState(), 60, true);
    expect(decisionRes2.decision.decision).toBe('HOLD');
  });

  // Test 15: Emergency stop prevents subsequent automated trades
  it('15. Emergency stop prevents subsequent automated trades', () => {
    riskManager.triggerEmergencyStop();
    const riskCheck = riskManager.validateOrder('BUY', 10, 100, ledger.getState(), 10);
    expect(riskCheck.allowed).toBe(false);
    expect(riskCheck.riskStatus).toBe('EMERGENCY_STOP');
  });

  // Test 16: A losing simulation is reported accurately
  it('16. A losing simulation is reported accurately without fabrication', () => {
    // Buy 20 units @ ₹100
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 20, 100, 2.0, 10, 'Buy');
    // Sell 20 units @ ₹98 (Loss of ₹40 + fees)
    ledger.executeSell('RULE_4_SELL_STOPLOSS', 'Rule 4', 20, 98, 1.96, 20, 'Stop loss');

    const report = ledger.generateSessionReport();
    expect(report.finalTotalPnL).toBeLessThan(0);
    expect(report.losingTrades).toBe(1);
    expect(report.winningTrades).toBe(0);
    expect(report.winRate).toBe(0);
    expect(report.returnPercent).toBeLessThan(0);
  });

  // Test 17: Maximum drawdown is calculated from portfolio equity
  it('17. Maximum drawdown is calculated from portfolio equity', () => {
    // Buy 50 units @ ₹100 = ₹5,000 invested. Cash = ₹4,995
    ledger.executeBuy('RULE_1_BUY_DIP', 'Rule 1', 50, 100, 5.0, 5, 'Buy');
    
    // Price jumps to ₹110 -> Holdings = ₹5,500, Cash = ₹4,995, Equity = ₹10,495 (Peak)
    ledger.updateMarketPrice(110);
    expect(ledger.getState().peakEquity).toBe(10495.0);

    // Price crashes to ₹90 -> Holdings = ₹4,500, Cash = ₹4,995, Equity = ₹9,495
    ledger.updateMarketPrice(90);
    const expectedDrawdown = ((10495 - 9495) / 10495) * 100;
    expect(ledger.getState().maxDrawdown).toBeCloseTo(expectedDrawdown, 1);
  });

  // Test 18: Reset restores initial demo account and clears session safely
  it('18. Reset restores initial demo account and clears active session safely', () => {
    const session = new SessionController();
    session.start();
    session.reset();
    const snap = session.getSnapshot();
    expect(snap.portfolio.cash).toBe(10000.0);
    expect(snap.portfolio.holdingsQuantity).toBe(0);
    expect(snap.portfolio.transactions.length).toBe(0);
    expect(snap.elapsedSeconds).toBe(0);
    expect(snap.timeRemaining).toBe(60);
    expect(snap.runState).toBe('IDLE');
    session.destroy();
  });
});
