import React, { useState, useRef } from 'react';
import type { MarketState, PricePoint } from '../types/market';
import type { PortfolioState } from '../types/portfolio';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CandlestickChart, 
  LineChart as LineChartIcon
} from 'lucide-react';
import { formatRupees, formatPercent, formatSeconds } from '../utils/formatting';

interface TradingChartProps {
  market: MarketState;
  portfolio: PortfolioState;
  elapsedSeconds: number;
  timeRemaining: number;
  maxDurationSeconds?: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  market,
  portfolio,
  elapsedSeconds,
  timeRemaining,
  maxDurationSeconds = 120,
}) => {
  const [chartType, setChartType] = useState<'line' | 'candle'>('candle');
  const [showMAs, setShowMAs] = useState(true);
  const [showTargetLines, setShowTargetLines] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const history = market.priceHistory;
  const currentPoint = history[history.length - 1] || null;
  const currentPrice = currentPoint ? currentPoint.price : market.initialPrice;
  const changeFromOpen = currentPoint ? currentPoint.price - market.initialPrice : 0;
  const changePercentFromOpen = currentPoint ? ((currentPoint.price - market.initialPrice) / market.initialPrice) * 100 : 0;
  const isUp = currentPoint ? currentPoint.direction === 'up' : true;

  // Position levels for visual TP / SL
  const hasPosition = portfolio.holdingsQuantity > 0 && portfolio.averageCostBasis > 0;
  const entryPrice = portfolio.averageCostBasis;
  const profitTargetPrice = entryPrice > 0 ? entryPrice * 1.015 : null;
  const stopLossPrice = entryPrice > 0 ? entryPrice * 0.990 : null;

  // Chart coordinate calculations
  const width = 850;
  const height = 390;
  const padding = { top: 30, right: 75, bottom: showVolume ? 75 : 45, left: 15 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const volumeHeight = showVolume ? 36 : 0;
  const volumeTop = height - padding.bottom + 8;

  // Price bounds including position targets if open
  const allPrices = history.flatMap(p => [p.high, p.low, p.maShort, p.maLong].filter(v => v > 0));
  if (hasPosition) {
    if (profitTargetPrice) allPrices.push(profitTargetPrice);
    if (stopLossPrice) allPrices.push(stopLossPrice);
  }
  const rawMin = allPrices.length > 0 ? Math.min(...allPrices) : market.initialPrice - 2;
  const rawMax = allPrices.length > 0 ? Math.max(...allPrices) : market.initialPrice + 2;
  
  const priceMargin = Math.max((rawMax - rawMin) * 0.14, 0.8);
  const minPrice = rawMin - priceMargin;
  const maxPrice = rawMax + priceMargin;
  const priceRange = maxPrice - minPrice || 1;

  // Volume bounds
  const maxVol = Math.max(...history.map(p => p.volume || 100), 1000);

  const totalSlots = Math.max(maxDurationSeconds, history.length);
  const getX = (timeSec: number) => padding.left + (timeSec / totalSlots) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - ((val - minPrice) / priceRange) * chartHeight;
  const getVolY = (vol: number) => volumeTop + volumeHeight - (vol / maxVol) * volumeHeight;

  // Paths
  const pricePath = history.reduce((acc, p, idx) => {
    const x = getX(p.timeSeconds);
    const y = getY(p.price);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaPath = history.length > 0
    ? `${pricePath} L ${getX(history[history.length - 1].timeSeconds)} ${padding.top + chartHeight} L ${getX(history[0].timeSeconds)} ${padding.top + chartHeight} Z`
    : '';

  const maShortPath = history.filter(p => p.maShort > 0).reduce((acc, p, idx) => {
    const x = getX(p.timeSeconds);
    const y = getY(p.maShort);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const maLongPath = history.filter(p => p.maLong > 0).reduce((acc, p, idx) => {
    const x = getX(p.timeSeconds);
    const y = getY(p.maLong);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Horizontal price grid lines
  const gridSteps = 5;
  const gridLines = Array.from({ length: gridSteps }).map((_, i) => {
    const p = minPrice + (priceRange / (gridSteps - 1)) * i;
    return {
      price: p,
      y: getY(p),
    };
  });

  // Time ticks across 120s (every 20 seconds)
  const timeSteps = Array.from({ length: 7 }).map((_, i) => i * 20);

  return (
    <div className="bg-[#0E1526] border border-[#17223B] rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Top Header of the Chart: Price & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 z-10">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-mono font-extrabold text-white tracking-tight">
                {formatRupees(currentPrice)}
              </span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                changeFromOpen >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {changeFromOpen >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{formatPercent(changePercentFromOpen)}</span>
                <span className="text-[10px] opacity-80">({formatRupees(changeFromOpen, true)})</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>Open: {formatRupees(market.initialPrice)}</span>
              <span>•</span>
              <span>Peak: {formatRupees(market.recentPeak)}</span>
              <span>•</span>
              <span>Trough: {formatRupees(market.recentTrough)}</span>
              <span>•</span>
              <span className="text-cyan-400">Vol: {(market.totalVolume / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        {/* View Mode & Overlay Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Chart Type Toggle */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setChartType('candle')}
              className={`p-1.5 rounded transition-colors ${chartType === 'candle' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Candlestick View"
            >
              <CandlestickChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded transition-colors ${chartType === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Line & Area View"
            >
              <LineChartIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Indicators Toggle */}
          <button
            onClick={() => setShowMAs(!showMAs)}
            className={`px-2 py-1 rounded border text-[11px] transition-colors ${
              showMAs ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            MA(5/12)
          </button>

          <button
            onClick={() => setShowTargetLines(!showTargetLines)}
            className={`px-2 py-1 rounded border text-[11px] transition-colors ${
              showTargetLines ? 'bg-purple-950/40 border-purple-500/50 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            TP/SL Levels
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2 py-1 rounded border text-[11px] transition-colors ${
              showVolume ? 'bg-blue-950/40 border-blue-500/50 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            Vol
          </button>

          <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
            SIMULATED 2-MIN FEED
          </div>
        </div>
      </div>

      {/* Main SVG Graph */}
      <div 
        ref={containerRef} 
        className="w-full relative cursor-crosshair select-none"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>

            <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#3B82F6" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Grid lines */}
          {gridLines.map((gl, i) => (
            <g key={`gl-${i}`}>
              <line
                x1={padding.left}
                y1={gl.y}
                x2={width - padding.right}
                y2={gl.y}
                stroke="#17223B"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={width - padding.right + 6}
                y={gl.y + 3.5}
                fill="#64748B"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                ₹{gl.price.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Time axis markers across 120s */}
          {timeSteps.map(t => {
            const x = getX(t);
            return (
              <g key={`time-${t}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartHeight}
                  stroke="#17223B"
                  strokeDasharray="2 4"
                  strokeWidth="0.8"
                />
                <text
                  x={x}
                  y={padding.top + chartHeight + (showVolume ? 48 : 16)}
                  fill="#64748B"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t}s
                </text>
              </g>
            );
          })}

          {/* Volume bars at bottom */}
          {showVolume && history.map((p, idx) => {
            const x = getX(p.timeSeconds);
            const barW = Math.max(2, (chartWidth / totalSlots) * 0.7);
            const volY = getVolY(p.volume || 100);
            const h = volumeTop + volumeHeight - volY;
            const isGreen = p.close >= p.open;

            return (
              <rect
                key={`vol-${idx}`}
                x={x - barW / 2}
                y={volY}
                width={barW}
                height={Math.max(1, h)}
                fill={isGreen ? "#10B981" : "#EF4444"}
                opacity={0.35}
              />
            );
          })}

          {/* Area fill in line mode */}
          {chartType === 'line' && areaPath && (
            <path d={areaPath} fill="url(#chartGradient2)" />
          )}

          {/* Candlesticks view mode */}
          {chartType === 'candle' && history.map((p, idx) => {
            const x = getX(p.timeSeconds);
            const openY = getY(p.open);
            const closeY = getY(p.close);
            const highY = getY(p.high);
            const lowY = getY(p.low);
            const isGreen = p.close >= p.open;
            const candleWidth = Math.max(3, (chartWidth / totalSlots) * 0.75);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));

            return (
              <g key={`candle-${idx}`}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={isGreen ? "#10B981" : "#EF4444"}
                  strokeWidth="1.2"
                />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isGreen ? "#10B981" : "#EF4444"}
                  rx="1"
                />
              </g>
            );
          })}

          {/* Line Chart mode */}
          {chartType === 'line' && pricePath && (
            <path
              d={pricePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              filter="url(#glow2)"
            />
          )}

          {/* MA Long line (Purple) */}
          {showMAs && maLongPath && (
            <path
              d={maLongPath}
              fill="none"
              stroke="#A855F7"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              opacity="0.85"
            />
          )}

          {/* MA Short line (Cyan) */}
          {showMAs && maShortPath && (
            <path
              d={maShortPath}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="1.75"
              opacity="0.9"
            />
          )}

          {/* HORIZONTAL POSITION LEVELS (WHEN TO BUY / WHEN TO SELL OVERLAYS) */}
          {showTargetLines && hasPosition && (
            <g>
              {/* Take-Profit Line (+1.5%) -> RULE 3 */}
              {profitTargetPrice && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(profitTargetPrice)}
                    x2={width - padding.right}
                    y2={getY(profitTargetPrice)}
                    stroke="#10B981"
                    strokeDasharray="4 3"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={width - padding.right + 2}
                    y={getY(profitTargetPrice) - 8}
                    width="70"
                    height="16"
                    fill="#065F46"
                    rx="2"
                  />
                  <text
                    x={width - padding.right + 6}
                    y={getY(profitTargetPrice) + 3}
                    fill="#6EE7B7"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    TP +1.5%
                  </text>
                </g>
              )}

              {/* Average Entry Price Line */}
              <g>
                <line
                  x1={padding.left}
                  y1={getY(entryPrice)}
                  x2={width - padding.right}
                  y2={getY(entryPrice)}
                  stroke="#F59E0B"
                  strokeDasharray="5 3"
                  strokeWidth="1.5"
                />
                <rect
                  x={width - padding.right + 2}
                  y={getY(entryPrice) - 8}
                  width="70"
                  height="16"
                  fill="#78350F"
                  rx="2"
                />
                <text
                  x={width - padding.right + 6}
                  y={getY(entryPrice) + 3}
                  fill="#FCD34D"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  ENTRY
                </text>
              </g>

              {/* Stop-Loss Line (-1.0%) -> RULE 4 */}
              {stopLossPrice && (
                <g>
                  <line
                    x1={padding.left}
                    y1={getY(stopLossPrice)}
                    x2={width - padding.right}
                    y2={getY(stopLossPrice)}
                    stroke="#EF4444"
                    strokeDasharray="4 3"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={width - padding.right + 2}
                    y={getY(stopLossPrice) - 8}
                    width="70"
                    height="16"
                    fill="#7F1D1D"
                    rx="2"
                  />
                  <text
                    x={width - padding.right + 6}
                    y={getY(stopLossPrice) + 3}
                    fill="#FCA5A5"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    SL -1.0%
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Trade Execution Markers (BUY = Green, SELL = Red) */}
          {history.map((p, idx) => {
            if (!p.hasBuyMarker && !p.hasSellMarker) return null;
            const x = getX(p.timeSeconds);
            const y = getY(p.price);

            if (p.hasBuyMarker) {
              return (
                <g key={`marker-buy-${idx}`} className="cursor-pointer">
                  <circle cx={x} cy={y} r="8.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text
                    x={x}
                    y={y + 3.5}
                    fill="#0B1020"
                    fontSize="9"
                    fontWeight="extrabold"
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    B
                  </text>
                  <polygon
                    points={`${x-4},${y+12} ${x+4},${y+12} ${x},${y+7}`}
                    fill="#10B981"
                  />
                </g>
              );
            }

            if (p.hasSellMarker) {
              return (
                <g key={`marker-sell-${idx}`} className="cursor-pointer">
                  <circle cx={x} cy={y} r="8.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text
                    x={x}
                    y={y + 3.5}
                    fill="#FFFFFF"
                    fontSize="9"
                    fontWeight="extrabold"
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    S
                  </text>
                  <polygon
                    points={`${x-4},${y-12} ${x+4},${y-12} ${x},${y-7}`}
                    fill="#EF4444"
                  />
                </g>
              );
            }
            return null;
          })}

          {/* Current Live Price Pulsing Dot */}
          {currentPoint && (
            <g>
              <circle
                cx={getX(currentPoint.timeSeconds)}
                cy={getY(currentPoint.price)}
                r="7"
                fill="#3B82F6"
                className="animate-ping opacity-75"
              />
              <circle
                cx={getX(currentPoint.timeSeconds)}
                cy={getY(currentPoint.price)}
                r="5"
                fill={isUp ? "#10B981" : "#EF4444"}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Mouse Hover Tracker */}
          {history.map((p, idx) => {
            const x = getX(p.timeSeconds);
            return (
              <rect
                key={`hit-${idx}`}
                x={x - (chartWidth / totalSlots) / 2}
                y={padding.top}
                width={chartWidth / totalSlots}
                height={chartHeight + (showVolume ? volumeHeight + 10 : 0)}
                fill="transparent"
                onMouseEnter={() => setHoveredPoint(p)}
              />
            );
          })}

          {/* Crosshair Lines */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.timeSeconds)}
                y1={padding.top}
                x2={getX(hoveredPoint.timeSeconds)}
                y2={padding.top + chartHeight + (showVolume ? volumeHeight + 8 : 0)}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={getY(hoveredPoint.price)}
                x2={width - padding.right}
                y2={getY(hoveredPoint.price)}
                stroke="#94A3B8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoveredPoint.timeSeconds)}
                cy={getY(hoveredPoint.price)}
                r="5"
                fill="#F8FAFC"
                stroke="#3B82F6"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredPoint && (
          <div 
            className="absolute top-2 left-4 bg-[#080C16]/95 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono shadow-2xl pointer-events-none backdrop-blur z-20 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-4 text-slate-400 border-b border-slate-800 pb-1">
              <span>Time: {hoveredPoint.timeSeconds}s ({hoveredPoint.timeFormatted})</span>
              <span className={hoveredPoint.direction === 'up' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {hoveredPoint.direction.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white font-bold">Price: {formatRupees(hoveredPoint.price)}</span>
              <span className="text-slate-400">{formatPercent(hoveredPoint.changePercent)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 text-[10px] text-slate-400">
              <span>O: ₹{hoveredPoint.open.toFixed(2)}</span>
              <span>H: ₹{hoveredPoint.high.toFixed(2)}</span>
              <span>L: ₹{hoveredPoint.low.toFixed(2)}</span>
              <span>C: ₹{hoveredPoint.close.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span className="text-cyan-400">MA5: ₹{hoveredPoint.maShort.toFixed(2)}</span>
              <span className="text-purple-400">MA12: ₹{hoveredPoint.maLong.toFixed(2)}</span>
              <span>Vol: {hoveredPoint.volume}</span>
            </div>
            {hoveredPoint.markerTooltip && (
              <div className="mt-1 pt-1 border-t border-slate-800 text-[11px] text-emerald-300 font-bold">
                📌 {hoveredPoint.markerTooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom 2-Minute Progress Bar */}
      <div className="mt-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>2-Minute Simulation: {formatSeconds(elapsedSeconds)} / {formatSeconds(maxDurationSeconds)}</span>
          </div>
          <span className="text-white font-semibold">
            {timeRemaining > 0 ? `${timeRemaining}s remaining` : '2-MIN SESSION COMPLETED'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 rounded-full ${
              timeRemaining <= 5 && timeRemaining > 0 ? 'bg-rose-500 animate-pulse' : 'bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400'
            }`}
            style={{ width: `${Math.min(100, (elapsedSeconds / maxDurationSeconds) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
