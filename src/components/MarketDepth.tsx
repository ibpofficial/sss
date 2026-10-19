import React from 'react';
import type { MarketState } from '../types/market';
import { Layers, Activity } from 'lucide-react';
import { formatRupees } from '../utils/formatting';

interface MarketDepthProps {
  market: MarketState;
}

export const MarketDepth: React.FC<MarketDepthProps> = ({ market }) => {
  const maxBidTotal = market.bids[market.bids.length - 1]?.total || 100;
  const maxAskTotal = market.asks[market.asks.length - 1]?.total || 100;
  const maxDepth = Math.max(maxBidTotal, maxAskTotal, 1);

  const bestBid = market.bids[0]?.price || market.currentPrice - 0.05;
  const bestAsk = market.asks[0]?.price || market.currentPrice + 0.05;
  const spread = Math.max(0, bestAsk - bestBid);

  return (
    <div className="bg-[#0E1526] border border-[#17223B] rounded-xl p-3 shadow-md flex flex-col h-full font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            Order Book • L2 Depth
          </h4>
        </div>
        <div className="text-[10px] text-slate-400">
          Spread: <span className="text-slate-200 font-semibold">₹{spread.toFixed(2)}</span>
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-3 text-[10px] uppercase text-slate-500 pb-1 border-b border-slate-800/60">
        <span>Price (₹)</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sell Orders - Red) */}
      <div className="space-y-0.5 py-1">
        {market.asks.slice(0, 4).reverse().map((ask, i) => (
          <div key={`ask-${i}`} className="relative grid grid-cols-3 text-[10px] py-0.5 items-center">
            <div
              className="absolute right-0 top-0 bottom-0 bg-rose-500/15 rounded-sm pointer-events-none"
              style={{ width: `${(ask.total / maxDepth) * 100}%` }}
            />
            <span className="text-rose-400 font-semibold z-10">₹{ask.price.toFixed(2)}</span>
            <span className="text-right text-slate-300 z-10">{ask.quantity}</span>
            <span className="text-right text-slate-400 z-10">{ask.total}</span>
          </div>
        ))}
      </div>

      {/* Current Mid Price Band */}
      <div className="py-1.5 my-1 px-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-extrabold text-white text-sm">
            {formatRupees(market.currentPrice)}
          </span>
        </div>
        <span className={`text-[10px] font-bold ${
          market.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {market.changePercent >= 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
        </span>
      </div>

      {/* Bids (Buy Orders - Green) */}
      <div className="space-y-0.5 py-1">
        {market.bids.slice(0, 4).map((bid, i) => (
          <div key={`bid-${i}`} className="relative grid grid-cols-3 text-[10px] py-0.5 items-center">
            <div
              className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 rounded-sm pointer-events-none"
              style={{ width: `${(bid.total / maxDepth) * 100}%` }}
            />
            <span className="text-emerald-400 font-semibold z-10">₹{bid.price.toFixed(2)}</span>
            <span className="text-right text-slate-300 z-10">{bid.quantity}</span>
            <span className="text-right text-slate-400 z-10">{bid.total}</span>
          </div>
        ))}
      </div>

      {/* 24h Stats Summary */}
      <div className="mt-auto pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[10px] text-slate-400">
        <div>
          <span>24h High: </span>
          <span className="text-slate-200 font-semibold">₹{market.dayHigh.toFixed(2)}</span>
        </div>
        <div className="text-right">
          <span>24h Low: </span>
          <span className="text-slate-200 font-semibold">₹{market.dayLow.toFixed(2)}</span>
        </div>
        <div className="col-span-2 text-right text-slate-500">
          Vol: {(market.totalVolume / 1000).toFixed(1)}K units
        </div>
      </div>
    </div>
  );
};
