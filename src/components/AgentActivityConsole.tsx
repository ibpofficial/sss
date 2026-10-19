import React, { useState, useRef } from 'react';
import { Terminal, ArrowRightCircle, AlertTriangle, Ban } from 'lucide-react';
import type { DecisionObject } from '../types/orders';

interface AgentActivityConsoleProps {
  decisions: DecisionObject[];
}

type FilterType = 'ALL' | 'ORDERS' | 'RULES' | 'RISK' | 'HOLD';

export const AgentActivityConsole: React.FC<AgentActivityConsoleProps> = ({ decisions }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredDecisions = decisions.filter(d => {
    if (activeFilter === 'ORDERS') return d.decision === 'BUY' || d.decision === 'SELL';
    if (activeFilter === 'RULES') return d.ruleId !== 'NONE';
    if (activeFilter === 'RISK') return d.riskStatus !== 'PASSED' || d.ruleId === 'RULE_4_SELL_STOPLOSS';
    if (activeFilter === 'HOLD') return d.decision === 'HOLD';
    return true;
  });

  const getActionBadge = (decision: DecisionObject) => {
    if (decision.decision === 'BUY') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <ArrowRightCircle className="w-3 h-3" />
          BUY EXEC
        </span>
      );
    }
    if (decision.decision === 'SELL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
          <ArrowRightCircle className="w-3 h-3" />
          SELL EXEC
        </span>
      );
    }
    if (decision.riskStatus === 'SESSION_LOCKED') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
          <Ban className="w-3 h-3" />
          LOCKED
        </span>
      );
    }
    if (decision.riskStatus !== 'PASSED') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          RISK BLK
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
        HOLD
      </span>
    );
  };

  return (
    <div className="bg-[#121A2B] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-[280px]">
      {/* Console Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-100 tracking-wider uppercase font-mono">
            Agent Brain • Live Decision Log
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {filteredDecisions.length} events
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {(['ALL', 'ORDERS', 'RULES', 'RISK', 'HOLD'] as FilterType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === tab
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Decision Stream */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs pr-1"
      >
        {filteredDecisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
            <Terminal className="w-6 h-6 mb-1 opacity-50" />
            <span>Awaiting simulation start to begin stream...</span>
          </div>
        ) : (
          filteredDecisions.map(d => (
            <div
              key={d.id}
              className={`p-2 rounded border flex flex-col gap-1 transition-all ${
                d.decision === 'BUY'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : d.decision === 'SELL'
                  ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                  : d.riskStatus !== 'PASSED'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-[#0B1020]/40 border-slate-800/80 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-semibold">[{d.timeFormatted}]</span>
                  <span className="font-bold text-white">₹{d.observedPrice.toFixed(2)}</span>
                  {getActionBadge(d)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Pos: {d.currentPosition.toFixed(2)} units
                </div>
              </div>

              {/* Reasoning message */}
              <p className="text-[11px] leading-relaxed pl-1 text-slate-300 border-l border-slate-700/60 ml-1">
                {d.reasoning}
              </p>

              {/* Order specifics if BUY/SELL */}
              {(d.decision === 'BUY' || d.decision === 'SELL') && (
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5 bg-slate-900/60 px-2 py-0.5 rounded">
                  <span>Qty: <strong className="text-white">{d.proposedOrderQuantity}</strong></span>
                  <span>•</span>
                  <span>Fee: ₹{d.estimatedFee.toFixed(2)}</span>
                  <span>•</span>
                  <span>Cash Bal: ₹{d.updatedAccountBalance.toFixed(2)}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
