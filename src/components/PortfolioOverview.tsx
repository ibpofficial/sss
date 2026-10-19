import React from 'react';
import { 
  Wallet, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Activity,
  Layers
} from 'lucide-react';
import type { PortfolioState } from '../types/portfolio';
import { formatRupees, formatPercent, formatUnits } from '../utils/formatting';

interface PortfolioOverviewProps {
  portfolio: PortfolioState;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ portfolio }) => {
  const totalPnL = portfolio.totalEquity - portfolio.initialCash;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 px-4 pt-3 pb-1 max-w-7xl mx-auto">
      {/* 1. Total Portfolio Equity */}
      <div className="bg-[#121A2B] border border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Portfolio Equity</span>
          <Wallet className="w-3.5 h-3.5 text-blue-400" />
        </div>
        <div className="text-lg font-mono font-bold text-white tracking-tight">
          {formatRupees(portfolio.totalEquity)}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] font-mono">
          <span className={totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {formatPercent(portfolio.totalReturnPercent)}
          </span>
          <span className="text-slate-500">from ₹10k</span>
        </div>
      </div>

      {/* 2. Available Cash */}
      <div className="bg-[#121A2B] border border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Available Cash</span>
          <Coins className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-lg font-mono font-bold text-slate-100 tracking-tight">
          {formatRupees(portfolio.cash)}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          {portfolio.initialCash > 0 ? ((portfolio.cash / portfolio.totalEquity) * 100).toFixed(0) : '100'}% in Cash
        </div>
      </div>

      {/* 3. Holdings Quantity & Avg Cost */}
      <div className="bg-[#121A2B] border border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Asset Holdings</span>
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="text-lg font-mono font-bold text-cyan-400 tracking-tight">
          {formatUnits(portfolio.holdingsQuantity)} <span className="text-xs font-normal text-slate-400">units</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
          Avg: {portfolio.averageCostBasis > 0 ? formatRupees(portfolio.averageCostBasis) : '₹0.00'}
        </div>
      </div>

      {/* 4. Unrealized P/L */}
      <div className="bg-[#121A2B] border border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Unrealized P/L</span>
          {portfolio.unrealizedPnL >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className={`text-lg font-mono font-bold tracking-tight ${portfolio.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatRupees(portfolio.unrealizedPnL, true)}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Holdings Val: {formatRupees(portfolio.marketValueOfHoldings)}
        </div>
      </div>

      {/* 5. Realized P/L */}
      <div className="bg-[#121A2B] border border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Realized P/L</span>
          <Activity className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className={`text-lg font-mono font-bold tracking-tight ${portfolio.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatRupees(portfolio.realizedPnL, true)}
        </div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          Closed trades profit
        </div>
      </div>

      {/* 6. Total Fees & Max Drawdown */}
      <div className="bg-[#121A2B] border border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider">Fees & Drawdown</span>
          <Receipt className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="text-lg font-mono font-bold text-slate-200 tracking-tight">
          {formatRupees(portfolio.totalFeesPaid)}
        </div>
        <div className="text-[11px] text-rose-400 font-mono mt-0.5">
          Max DD: -{portfolio.maxDrawdown.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};
