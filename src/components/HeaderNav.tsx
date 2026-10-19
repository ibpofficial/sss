import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldAlert, 
  Repeat, 
  Brain, 
  ShieldCheck, 
  Clock, 
  HelpCircle,
  FileText
} from 'lucide-react';
import type { SimulationRunState } from '../engine/sessionController';
import type { AgentStatus } from '../types/orders';
import type { SimulationScenario } from '../engine/marketSimulator';
import type { MarketState } from '../types/market';
import { formatSeconds, formatRupees } from '../utils/formatting';

interface HeaderNavProps {
  runState: SimulationRunState;
  timeRemaining: number;
  agentStatus: AgentStatus;
  currentScenario: SimulationScenario;
  market: MarketState;
  maxDurationSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEmergencyStop: () => void;
  onReset: () => void;
  onReplay: () => void;
  onScenarioChange: (scenario: SimulationScenario) => void;
  onOpenReport: () => void;
  onOpenGuide: () => void;
  hasReport: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  runState,
  timeRemaining,
  agentStatus,
  currentScenario,
  market,
  maxDurationSeconds,
  onStart,
  onPause,
  onResume,
  onEmergencyStop,
  onReset,
  onReplay,
  onScenarioChange,
  onOpenReport,
  onOpenGuide,
  hasReport,
}) => {
  const getStatusBadge = () => {
    switch (agentStatus) {
      case 'BUYING':
        return { text: 'BUYING', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-400' };
      case 'SELLING':
        return { text: 'SELLING', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40', dot: 'bg-purple-400' };
      case 'HOLDING':
        return { text: 'HOLDING', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40', dot: 'bg-blue-400' };
      case 'RISK PAUSED':
        return { text: 'RISK PAUSED', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', dot: 'bg-rose-400' };
      case 'SESSION_ENDED':
        return { text: 'SESSION COMPLETED', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-400' };
      case 'ANALYZING':
      default:
        return { text: 'ANALYZING MARKET', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', dot: 'bg-cyan-400' };
    }
  };

  const status = getStatusBadge();
  const isRunning = runState === 'RUNNING';
  const isPaused = runState === 'PAUSED';

  return (
    <div className="border-b border-[#17223B] bg-[#080C16] sticky top-0 z-40">
      {/* Top Global Financial Ticker Bar */}
      <div className="bg-[#050811] border-b border-slate-900/80 px-4 py-1 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-white">QUANT-SIM/INR</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-bold">{formatRupees(market.currentPrice)}</span>
            <span className={market.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              ({market.changePercent >= 0 ? '+' : ''}{market.changePercent.toFixed(2)}%)
            </span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">24H High: <strong className="text-slate-200">₹{market.dayHigh.toFixed(2)}</strong></span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">24H Low: <strong className="text-slate-200">₹{market.dayLow.toFixed(2)}</strong></span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="hidden md:inline">24H Vol: <strong className="text-slate-200">{(market.totalVolume / 1000).toFixed(1)}k</strong></span>
          <span className="text-slate-600 hidden lg:inline">|</span>
          <span className="hidden lg:inline text-cyan-400">Fee: 0.1% • Slip: 0.05%</span>
        </div>

        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300">
            2-MINUTE LIVE DEMO MODE
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
            VIRTUAL LEDGER ACTIVE
          </span>
        </div>
      </div>

      {/* Main Terminal Header Bar */}
      <header className="px-4 py-2.5 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Bot Status */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-white text-sm">AUTONOMOUS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 font-mono border border-blue-800/60 font-bold">
                QUANT DESK v3.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Algorithmic Execution Terminal • 2-Min Paper Simulation</p>
          </div>

          {/* Status Badge */}
          <div className={`ml-2 hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${status.bg}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot} animate-ping`} />
            <span className="tracking-wide">{status.text}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>₹0 REAL MONEY</span>
          </div>
        </div>

        {/* Center: 2-Minute Timer & Market Scenario Selector */}
        <div className="flex items-center gap-3">
          {/* 2-Minute Timer Box (02:00) */}
          <div className="flex items-center gap-2 bg-[#0E1526] border border-[#17223B] rounded-lg px-3 py-1 shadow-inner">
            <Clock className={`w-4 h-4 ${timeRemaining <= 5 && timeRemaining > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold font-mono">2-Min Timer</span>
              <span className={`font-mono text-sm font-bold ${timeRemaining <= 5 && timeRemaining > 0 ? 'text-rose-400' : 'text-white'}`}>
                {formatSeconds(timeRemaining)} / {formatSeconds(maxDurationSeconds)}
              </span>
            </div>
          </div>

          {/* Market Scenario Dropdown */}
          <div className="hidden md:flex flex-col">
            <label className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5 font-mono">Market Scenario</label>
            <select
              value={currentScenario}
              onChange={(e) => onScenarioChange(e.target.value as SimulationScenario)}
              disabled={isRunning}
              className="bg-[#0E1526] text-xs font-medium text-slate-200 border border-[#17223B] rounded px-2 py-1 outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer font-mono"
            >
              <option value="DIP_AND_REBOUND">2-Min Dip & Rebound (Default)</option>
              <option value="BULLISH_BREAKOUT">Bullish Golden Cross Rally</option>
              <option value="VOLATILE_STOPLOSS">Volatile Shakeout (Stop-Loss)</option>
              <option value="BALANCED_CYCLE">Balanced Multi-Cycle Walk</option>
            </select>
          </div>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-1.5">
          {!isRunning && !isPaused ? (
            <button
              onClick={onStart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-95"
              title="Start 2-minute autonomous trading simulation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Agent</span>
            </button>
          ) : isRunning ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/50 text-xs font-semibold transition-all active:scale-95"
              title="Pause simulation"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/50 text-xs font-semibold transition-all active:scale-95"
              title="Resume simulation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          {/* Emergency Stop Button */}
          <button
            onClick={onEmergencyStop}
            disabled={!isRunning && !isPaused}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            title="Emergency Stop: Halt bot and immediately liquidate position"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Emergency Stop</span>
          </button>

          {/* Reset / Replay Buttons */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all active:scale-95"
            title="Reset account to initial ₹10,000 balance"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onReplay}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs transition-all active:scale-95"
            title="Replay simulation with identical seed"
          >
            <Repeat className="w-4 h-4" />
          </button>

          {hasReport && (
            <button
              onClick={onOpenReport}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700/60 hover:bg-blue-900/60 text-blue-300 text-xs font-medium transition-all"
              title="View session-end performance report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          )}

          <button
            onClick={onOpenGuide}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-amber-300 text-xs transition-all active:scale-95"
            title="Demo Presentation Sequence (Hindi / English Guide)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>
    </div>
  );
};
