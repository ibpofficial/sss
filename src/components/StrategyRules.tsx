import React, { useState } from 'react';
import { 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Ban,
  Clock
} from 'lucide-react';
import type { StrategyRuleConfig, RuleEvaluationState, RuleId } from '../types/strategy';
import type { SimulationRunState } from '../engine/sessionController';

interface StrategyRulesProps {
  ruleConfigs: StrategyRuleConfig[];
  ruleStates: RuleEvaluationState[];
  runState: SimulationRunState;
  onUpdateRule: (id: RuleId, updates: Partial<StrategyRuleConfig>) => void;
}

export const StrategyRules: React.FC<StrategyRulesProps> = ({
  ruleConfigs,
  ruleStates,
  runState,
  onUpdateRule,
}) => {
  const [expandedRule, setExpandedRule] = useState<RuleId | null>(null);
  const isLocked = runState === 'RUNNING';

  const getRuleIcon = (id: RuleId) => {
    switch (id) {
      case 'RULE_1_BUY_DIP':
        return <TrendingDown className="w-4 h-4 text-emerald-400" />;
      case 'RULE_2_BUY_UPTREND':
        return <TrendingUp className="w-4 h-4 text-cyan-400" />;
      case 'RULE_3_SELL_PROFIT':
        return <Target className="w-4 h-4 text-purple-400" />;
      case 'RULE_4_SELL_STOPLOSS':
        return <Ban className="w-4 h-4 text-rose-400" />;
      case 'RULE_5_EXIT_SAFE':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
    }
  };

  const getStatusBadge = (state?: RuleEvaluationState) => {
    if (!state) return null;
    if (state.status === 'TRIGGERED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
          TRIGGERED ({state.timesTriggered}x)
        </span>
      );
    }
    if (state.status === 'DISABLED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-500 border border-slate-700">
          DISABLED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30">
        MONITORING
      </span>
    );
  };

  return (
    <div className="bg-[#121A2B] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">Agent Strategy Rules</h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          {isLocked ? (
            <span className="text-amber-400 font-semibold">🔒 Active Session (Locked)</span>
          ) : (
            <span className="text-emerald-400">⚙️ Configurable</span>
          )}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        The autonomous bot evaluates these 5 quantitative rules in priority order on every price tick:
      </p>

      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[460px]">
        {ruleConfigs.map(cfg => {
          const evalState = ruleStates.find(s => s.id === cfg.id);
          const isExpanded = expandedRule === cfg.id;

          return (
            <div
              key={cfg.id}
              className={`rounded-lg border transition-all ${
                evalState?.status === 'TRIGGERED' 
                  ? 'border-emerald-500/50 bg-emerald-950/10 shadow-sm shadow-emerald-500/10' 
                  : 'border-slate-800 bg-[#0B1020]/60 hover:border-slate-700'
              }`}
            >
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1">
                  <div className="p-1.5 rounded bg-slate-800/80 mt-0.5">
                    {getRuleIcon(cfg.id)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100">{cfg.name}</span>
                      {getStatusBadge(evalState)}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{cfg.tagline}</p>
                    {evalState?.lastActivationTime !== null && evalState?.lastActivationTime !== undefined && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Last activated at {evalState.lastActivationTime}s</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cfg.enabled}
                      disabled={isLocked}
                      onChange={(e) => onUpdateRule(cfg.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
                  </label>
                  <button
                    onClick={() => setExpandedRule(isExpanded ? null : cfg.id)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-900/40 text-xs">
                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{cfg.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                    {cfg.id === 'RULE_1_BUY_DIP' && (
                      <>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Dip Drop Threshold</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="5.0"
                              disabled={isLocked}
                              value={cfg.dipThresholdPercent}
                              onChange={(e) => onUpdateRule(cfg.id, { dipThresholdPercent: parseFloat(e.target.value) || 1.0 })}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Cash Allocation</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="5"
                              min="5"
                              max="50"
                              disabled={isLocked}
                              value={cfg.dipInvestPercent}
                              onChange={(e) => onUpdateRule(cfg.id, { dipInvestPercent: parseInt(e.target.value) || 20 })}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </div>
                      </>
                    )}

                    {cfg.id === 'RULE_2_BUY_UPTREND' && (
                      <>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Above MA Confirmation</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="5"
                              disabled={isLocked}
                              value={cfg.uptrendConsecutiveAbove}
                              onChange={(e) => onUpdateRule(cfg.id, { uptrendConsecutiveAbove: parseInt(e.target.value) || 2 })}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                            />
                            <span className="text-slate-400">ticks</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Cash Allocation</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="5"
                              min="5"
                              max="40"
                              disabled={isLocked}
                              value={cfg.uptrendInvestPercent}
                              onChange={(e) => onUpdateRule(cfg.id, { uptrendInvestPercent: parseInt(e.target.value) || 15 })}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </div>
                      </>
                    )}

                    {cfg.id === 'RULE_3_SELL_PROFIT' && (
                      <>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Profit Target</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="10.0"
                              disabled={isLocked}
                              value={cfg.profitTargetPercent}
                              onChange={(e) => onUpdateRule(cfg.id, { profitTargetPercent: parseFloat(e.target.value) || 1.5 })}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-0.5">Position To Sell</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="10"
                              min="10"
                              max="100"
                              disabled={isLocked}
                              value={cfg.profitSellPercent}
                              onChange={(e) => onUpdateRule(cfg.id, { profitSellPercent: parseInt(e.target.value) || 50 })}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                            />
                            <span className="text-slate-400">%</span>
                          </div>
                        </div>
                      </>
                    )}

                    {cfg.id === 'RULE_4_SELL_STOPLOSS' && (
                      <div>
                        <label className="text-slate-400 block mb-0.5">Stop-Loss Threshold</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="5.0"
                            disabled={isLocked}
                            value={cfg.stopLossPercent}
                            onChange={(e) => onUpdateRule(cfg.id, { stopLossPercent: parseFloat(e.target.value) || 1.0 })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                          />
                          <span className="text-slate-400">% below entry</span>
                        </div>
                      </div>
                    )}

                    {cfg.id === 'RULE_5_EXIT_SAFE' && (
                      <div>
                        <label className="text-slate-400 block mb-0.5">Entry Lock Buffer</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="3"
                            max="15"
                            disabled={isLocked}
                            value={cfg.exitSecondsRemaining}
                            onChange={(e) => onUpdateRule(cfg.id, { exitSecondsRemaining: parseInt(e.target.value) || 5 })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 w-16 text-white text-xs disabled:opacity-50"
                          />
                          <span className="text-slate-400">seconds remaining</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
