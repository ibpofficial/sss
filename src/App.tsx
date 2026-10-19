import { useState, useEffect, useRef } from 'react';
import { SessionController } from './engine/sessionController';
import type { SessionSnapshot } from './engine/sessionController';
import type { SimulationScenario } from './engine/marketSimulator';
import type { StrategyRuleConfig, RuleId } from './types/strategy';
import { HeaderNav } from './components/HeaderNav';
import { PortfolioOverview } from './components/PortfolioOverview';
import { TradingChart } from './components/TradingChart';
import { SignalRadar } from './components/SignalRadar';
import { MarketDepth } from './components/MarketDepth';
import { StrategyRules } from './components/StrategyRules';
import { AgentActivityConsole } from './components/AgentActivityConsole';
import { TransactionHistory } from './components/TransactionHistory';
import { SessionReport } from './components/SessionReport';
import { PresentationGuide } from './components/PresentationGuide';

export function App() {
  const controllerRef = useRef<SessionController | null>(null);

  if (!controllerRef.current) {
    // 2-minute default session duration (120 seconds)
    controllerRef.current = new SessionController(42, 'DIP_AND_REBOUND', 120);
  }

  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => controllerRef.current!.getSnapshot());
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const unsubscribe = controller.subscribe((newSnap) => {
      setSnapshot(newSnap);
      if (newSnap.runState === 'COMPLETED' && newSnap.sessionReport) {
        setIsReportOpen(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleStart = () => controllerRef.current?.start();
  const handlePause = () => controllerRef.current?.pause();
  const handleResume = () => controllerRef.current?.resume();
  const handleEmergencyStop = () => controllerRef.current?.emergencyStop();
  const handleReset = () => {
    controllerRef.current?.reset();
    setIsReportOpen(false);
  };
  const handleReplay = () => {
    controllerRef.current?.replay();
    setIsReportOpen(false);
  };
  const handleScenarioChange = (scenario: SimulationScenario) => {
    controllerRef.current?.setScenario(scenario);
  };
  const handleUpdateRule = (id: RuleId, updates: Partial<StrategyRuleConfig>) => {
    controllerRef.current?.updateRule(id, updates);
  };

  return (
    <div className="min-h-screen bg-[#080C16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Trading Desk Navigation & Global Ticker */}
      <HeaderNav
        runState={snapshot.runState}
        timeRemaining={snapshot.timeRemaining}
        agentStatus={snapshot.agentStatus}
        currentScenario={snapshot.scenario}
        market={snapshot.market}
        maxDurationSeconds={snapshot.maxDurationSeconds}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onEmergencyStop={handleEmergencyStop}
        onReset={handleReset}
        onReplay={handleReplay}
        onScenarioChange={handleScenarioChange}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        hasReport={!!snapshot.sessionReport}
      />

      {/* Account Metrics Bar */}
      <PortfolioOverview portfolio={snapshot.portfolio} />

      {/* Main Quantitative Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-2.5 space-y-3">
        {/* Signal Radar: Real-Time WHEN TO BUY & WHEN TO SELL status */}
        <SignalRadar
          market={snapshot.market}
          portfolio={snapshot.portfolio}
          ruleConfigs={snapshot.ruleConfigs}
          timeRemaining={snapshot.timeRemaining}
        />

        {/* Central Grid: Chart (8 cols) + Order Book Depth (4 cols) on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Main Chart Column */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <TradingChart
              market={snapshot.market}
              portfolio={snapshot.portfolio}
              elapsedSeconds={snapshot.elapsedSeconds}
              timeRemaining={snapshot.timeRemaining}
              maxDurationSeconds={snapshot.maxDurationSeconds}
            />
          </div>

          {/* Market Depth & Order Book Column */}
          <div className="lg:col-span-4 h-full">
            <MarketDepth market={snapshot.market} />
          </div>
        </div>

        {/* Middle Split: Strategy Rules Panel (6 cols) & Live Decision Stream (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          <div className="lg:col-span-6 h-full">
            <StrategyRules
              ruleConfigs={snapshot.ruleConfigs}
              ruleStates={snapshot.ruleStates}
              runState={snapshot.runState}
              onUpdateRule={handleUpdateRule}
            />
          </div>

          <div className="lg:col-span-6 h-full">
            <AgentActivityConsole decisions={snapshot.portfolio.decisions} />
          </div>
        </div>

        {/* Lower Section: Transaction History & Virtual Ledger */}
        <div className="w-full">
          <TransactionHistory transactions={snapshot.portfolio.transactions} />
        </div>
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-slate-900 bg-[#050811] py-2 px-4 text-center text-[10px] text-slate-500 font-mono">
        AUTONOMOUS QUANT TRADING DESK • 2-MINUTE REAL-TIME PAPER TRADING DEMO • ₹10,000 DEMO FUNDS • NO BROKER CONNECTION • DETERMINISTIC ENGINE
      </footer>

      {/* Session End Performance Report Modal */}
      {snapshot.sessionReport && (
        <SessionReport
          report={snapshot.sessionReport}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          onReplay={handleReplay}
          onReset={handleReset}
        />
      )}

      {/* Presentation Pitch Guide Modal */}
      <PresentationGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onStartDemo={handleStart}
      />
    </div>
  );
}

export default App;
