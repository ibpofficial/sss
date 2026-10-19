import React from 'react';
import { 
  Award, 
  RotateCcw, 
  X, 
  AlertCircle,
  BarChart3
} from 'lucide-react';
import type { SessionReportData } from '../types/portfolio';
import { formatRupees, formatPercent } from '../utils/formatting';

interface SessionReportProps {
  report: SessionReportData;
  isOpen: boolean;
  onClose: () => void;
  onReplay: () => void;
  onReset: () => void;
}

export const SessionReport: React.FC<SessionReportProps> = ({
  report,
  isOpen,
  onClose,
  onReplay,
  onReset,
}) => {
  if (!isOpen) return null;

  const isProfitable = report.finalTotalPnL >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121A2B] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isProfitable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                60-Second Session Performance Report
              </h2>
              <p className="text-xs text-slate-400 font-mono">Autonomous Execution Engine Results</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Main Profit / Loss Hero Card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isProfitable 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
          }`}>
            <div>
              <span className="text-xs uppercase font-mono tracking-wider opacity-80">Final Total Session Return</span>
              <div className="text-3xl font-mono font-extrabold text-white mt-1">
                {formatRupees(report.finalTotalPnL, true)}
              </div>
              <span className="text-sm font-mono font-semibold">
                {formatPercent(report.returnPercent)} on initial ₹10,000 capital
              </span>
            </div>

            <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Final Portfolio Equity</span>
              <div className="text-2xl font-mono font-bold text-slate-100 mt-1">
                {formatRupees(report.finalEquity)}
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                All open positions liquidated cleanly
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0B1020] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Win Rate</span>
              <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                {report.winRate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {report.winningTrades}W / {report.losingTrades}L
              </span>
            </div>

            <div className="bg-[#0B1020] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Total Trades</span>
              <div className="text-lg font-mono font-bold text-slate-100 mt-0.5">
                {report.totalTrades}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {report.closedTradesCount} closed positions
              </span>
            </div>

            <div className="bg-[#0B1020] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Total Fees Paid</span>
              <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                {formatRupees(report.totalFees)}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                0.1% transaction fee
              </span>
            </div>

            <div className="bg-[#0B1020] p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400">Max Drawdown</span>
              <div className="text-lg font-mono font-bold text-rose-400 mt-0.5">
                -{report.maxDrawdownPercent.toFixed(2)}%
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                from peak equity
              </span>
            </div>
          </div>

          {/* Rule Breakdown */}
          <div className="bg-[#0B1020] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-200 uppercase font-mono">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Strategy Rule Activations in Session</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              {Object.keys(report.rulesTriggeredCounts).length === 0 ? (
                <span className="text-slate-500">No rule triggers recorded.</span>
              ) : (
                Object.entries(report.rulesTriggeredCounts).map(([ruleName, count]) => (
                  <div key={ruleName} className="flex items-center justify-between text-slate-300 py-1 border-b border-slate-800/60 last:border-0">
                    <span className="truncate pr-2">{ruleName}</span>
                    <span className="font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/40">
                      {count} trades
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Financial Safety Notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="leading-relaxed">
              <strong>Simulated Paper Trading Disclaimer:</strong> This 60-second demonstration runs in a closed simulation using virtual money (₹10,000 initial). Past simulated performance does not guarantee future or live-market profitability. Real-world deployment requires extended backtesting, live tick feeds, liquidity models, and slippage management.
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onReplay();
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Replay Same Seed</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
