import React, { useState } from 'react';
import { History, ArrowUpRight, ArrowDownRight, CheckCircle2, Shield } from 'lucide-react';
import type { Transaction } from '../types/orders';
import { formatRupees, formatUnits } from '../utils/formatting';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filtered = transactions.filter(t => {
    if (filter === 'BUY') return t.side === 'BUY';
    if (filter === 'SELL') return t.side === 'SELL';
    return true;
  });

  return (
    <div className="bg-[#121A2B] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-slate-100 tracking-wider uppercase font-mono">
            Transaction Ledger & Audits
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
            {transactions.length} Total Trades
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono">
          {(['ALL', 'BUY', 'SELL'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded transition-colors text-[11px] ${
                filter === tab
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto max-h-[320px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs">
            <Shield className="w-8 h-8 mb-2 opacity-40 text-blue-400" />
            <span>No transactions recorded yet in this session.</span>
            <span className="text-[11px] text-slate-600 mt-1">Orders will appear here as the agent executes trades.</span>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase tracking-wider bg-slate-900/40">
                <th className="py-2 px-3">Trade ID / Time</th>
                <th className="py-2 px-3">Side</th>
                <th className="py-2 px-3">Triggering Rule</th>
                <th className="py-2 px-3 text-right">Quantity</th>
                <th className="py-2 px-3 text-right">Price</th>
                <th className="py-2 px-3 text-right">Gross Value</th>
                <th className="py-2 px-3 text-right">Fee (0.1%)</th>
                <th className="py-2 px-3 text-right">Net Cashflow</th>
                <th className="py-2 px-3 text-right">Realized P/L</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-200">{tx.id}</div>
                    <div className="text-[10px] text-slate-500">{tx.timeFormatted} ({tx.sessionTime}s)</div>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      tx.side === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                      {tx.side === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {tx.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate" title={tx.reason}>
                    <div className="font-medium text-slate-100">{tx.ruleName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{tx.reason}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-100 whitespace-nowrap">
                    {formatUnits(tx.quantity)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-200 whitespace-nowrap">
                    {formatRupees(tx.price)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300 whitespace-nowrap">
                    {formatRupees(tx.grossAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">
                    {formatRupees(tx.fee)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                    tx.netCashMovement >= 0 ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {tx.netCashMovement >= 0 ? `+${formatRupees(tx.netCashMovement)}` : formatRupees(tx.netCashMovement)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                    {tx.realizedPnL !== null ? (
                      <span className={tx.realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatRupees(tx.realizedPnL, true)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      EXECUTED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
