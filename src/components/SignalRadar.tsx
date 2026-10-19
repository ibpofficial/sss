import React from 'react';
import { 
  Radar, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import type { MarketState } from '../types/market';
import type { PortfolioState } from '../types/portfolio';
import type { StrategyRuleConfig } from '../types/strategy';
import { formatRupees, formatPercent } from '../utils/formatting';

interface SignalRadarProps {
  market: MarketState;
  portfolio: PortfolioState;
  ruleConfigs: StrategyRuleConfig[];
  timeRemaining: number;
}

export const SignalRadar: React.FC<SignalRadarProps> = ({
  market,
  portfolio,
  ruleConfigs,
  timeRemaining,
}) => {
  const rule1 = ruleConfigs.find(r => r.id === 'RULE_1_BUY_DIP');
  const rule2 = ruleConfigs.find(r => r.id === 'RULE_2_BUY_UPTREND');
  const rule3 = ruleConfigs.find(r => r.id === 'RULE_3_SELL_PROFIT');
  const rule4 = ruleConfigs.find(r => r.id === 'RULE_4_SELL_STOPLOSS');

  // Rule 1 calculations
  const dropFromPeak = market.recentPeak > 0
    ? ((market.recentPeak - market.currentPrice) / market.recentPeak) * 100
    : 0;
  const dipThreshold = rule1?.dipThresholdPercent ?? 1.0;
  const dipConfirmNeeded = rule1?.dipConsecutiveRecovery ?? 2;
  const dipReady = dropFromPeak >= dipThreshold && market.consecutiveUp >= dipConfirmNeeded;

  // Rule 2 calculations
  const currentPoint = market.priceHistory[market.priceHistory.length - 1];
  const maSpread = currentPoint ? currentPoint.maShort - currentPoint.maLong : 0;
  const isMaBullish = maSpread > 0;
  const uptrendConfirmNeeded = rule2?.uptrendConsecutiveAbove ?? 2;
  const uptrendReady = isMaBullish && market.consecutiveAboveMaLong >= uptrendConfirmNeeded;

  // Position-dependent calculations (Rules 3 & 4)
  const hasPosition = portfolio.holdingsQuantity > 0 && portfolio.averageCostBasis > 0;
  const positionGainPercent = hasPosition
    ? ((market.currentPrice - portfolio.averageCostBasis) / portfolio.averageCostBasis) * 100
    : 0;
  const profitTarget = rule3?.profitTargetPercent ?? 1.5;
  const stopLossTarget = rule4?.stopLossPercent ?? 1.0;

  const profitReady = hasPosition && positionGainPercent >= profitTarget;
  const stopLossBreached = hasPosition && positionGainPercent <= -stopLossTarget;

  return (
    <div className="bg-[#0E1526] border border-[#17223B] rounded-xl p-3 shadow-md flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <Radar className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Strategy Signal Radar • When To Buy & When To Sell
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          Live Rules Condition Evaluator
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
        {/* BUY SIGNAL 1: DIP & RECOVERY */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors ${
          dipReady 
            ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200 shadow-sm shadow-emerald-500/10' 
            : 'bg-[#0B1020]/70 border-slate-800/80 text-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 mb-1">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>BUY 1: Dip & Recovery</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                dipReady ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {dipReady ? 'TRIGGER READY' : 'SCANNING'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
              <span>Drop from Peak:</span>
              <span className={dropFromPeak >= dipThreshold ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                -{dropFromPeak.toFixed(2)}% (need ≥{dipThreshold}%)
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
              <span>Recovery Confirm:</span>
              <span className={market.consecutiveUp >= dipConfirmNeeded ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                {market.consecutiveUp}/{dipConfirmNeeded} green ticks
              </span>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1">
            Action: Buy 20% cash upon recovery
          </div>
        </div>

        {/* BUY SIGNAL 2: GOLDEN CROSS UPTREND */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors ${
          uptrendReady 
            ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200 shadow-sm shadow-cyan-500/10' 
            : 'bg-[#0B1020]/70 border-slate-800/80 text-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 mb-1">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>BUY 2: Golden Cross</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                uptrendReady ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {uptrendReady ? 'TRIGGER READY' : 'SCANNING'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
              <span>MA5 vs MA12:</span>
              <span className={isMaBullish ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                {isMaBullish ? `+₹${maSpread.toFixed(2)} BULL` : `-₹${Math.abs(maSpread).toFixed(2)} BEAR`}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
              <span>Confirmation:</span>
              <span className={market.consecutiveAboveMaLong >= uptrendConfirmNeeded ? 'text-cyan-400 font-bold' : 'text-slate-300'}>
                {market.consecutiveAboveMaLong}/{uptrendConfirmNeeded} ticks above MA12
              </span>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1">
            Action: Buy 15% cash on confirmed cross
          </div>
        </div>

        {/* SELL SIGNAL 1: PROFIT TARGET */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors ${
          profitReady 
            ? 'bg-purple-950/30 border-purple-500/50 text-purple-200 shadow-sm shadow-purple-500/10' 
            : 'bg-[#0B1020]/70 border-slate-800/80 text-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 mb-1">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Target className="w-3.5 h-3.5" />
                <span>SELL 1: Profit Target</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                profitReady ? 'bg-purple-500/20 text-purple-300 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {profitReady ? 'TARGET HIT' : hasPosition ? 'TRACKING' : 'NO POSITION'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
              <span>Target Gain:</span>
              <span className="text-purple-300">≥+{profitTarget.toFixed(2)}%</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
              <span>Current Open P/L:</span>
              <span className={positionGainPercent >= profitTarget ? 'text-emerald-400 font-bold' : positionGainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {hasPosition ? formatPercent(positionGainPercent) : '—'}
              </span>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1">
            Action: Sells 50% position to lock gains
          </div>
        </div>

        {/* SELL SIGNAL 2: STOP-LOSS & SAFE EXIT */}
        <div className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors ${
          stopLossBreached 
            ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 shadow-sm shadow-rose-500/10' 
            : 'bg-[#0B1020]/70 border-slate-800/80 text-slate-300'
        }`}>
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 mb-1">
              <span className="flex items-center gap-1.5 text-rose-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SELL 2: Stop-Loss</span>
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                stopLossBreached ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>
                {stopLossBreached ? 'BREACHED' : 'SAFE'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
              <span>Stop-Loss Trigger:</span>
              <span className="text-rose-300">≤-{stopLossTarget.toFixed(2)}%</span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
              <span>Session Exit Lock:</span>
              <span className={timeRemaining <= 5 && timeRemaining > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {timeRemaining <= 5 ? `LOCKED (T-${timeRemaining}s)` : `${timeRemaining}s active`}
              </span>
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 border-t border-slate-800/60 pt-1">
            Action: Priority 100% emergency exit
          </div>
        </div>
      </div>
    </div>
  );
};
