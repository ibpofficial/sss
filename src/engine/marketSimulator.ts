import type { PricePoint, MarketState, OrderBookLevel } from '../types/market';
import { createRNG, gaussianRandom } from '../utils/deterministicRandom';
import { calculateMovingAverage, roundPaise } from '../utils/calculations';
import { formatSeconds } from '../utils/formatting';

export type SimulationScenario = 'DIP_AND_REBOUND' | 'BULLISH_BREAKOUT' | 'VOLATILE_STOPLOSS' | 'BALANCED_CYCLE';

export interface MarketSimulatorConfig {
  initialPrice: number; // default ₹100.00
  seed: number;
  scenario: SimulationScenario;
  volatility: number; // e.g. 0.006 (0.6% per step)
}

export class MarketSimulator {
  private config: MarketSimulatorConfig;
  private rng: () => number;
  private currentPrice: number;
  private previousPrice: number;
  private history: PricePoint[] = [];
  private stepCount: number = 0;
  private recentPeak: number;
  private recentTrough: number;
  private dayHigh: number;
  private dayLow: number;
  private totalVolume: number = 0;
  private consecutiveUp: number = 0;
  private consecutiveDown: number = 0;
  private previousMaShort: number = 0;
  private previousMaLong: number = 0;
  private lastMaCross: 'bullish' | 'bearish' | null = null;
  private consecutiveAboveMaLong: number = 0;
  private consecutiveBelowMaLong: number = 0;

  constructor(config: MarketSimulatorConfig) {
    this.config = config;
    this.rng = createRNG(config.seed);
    this.currentPrice = config.initialPrice;
    this.previousPrice = config.initialPrice;
    this.recentPeak = config.initialPrice;
    this.recentTrough = config.initialPrice;
    this.dayHigh = config.initialPrice;
    this.dayLow = config.initialPrice;
    
    // Seed initial point
    this.recordPoint(0, this.currentPrice, this.currentPrice, this.currentPrice, this.currentPrice, 120);
  }

  public reset(seed?: number, scenario?: SimulationScenario): void {
    if (seed !== undefined) this.config.seed = seed;
    if (scenario !== undefined) this.config.scenario = scenario;
    this.rng = createRNG(this.config.seed);
    this.currentPrice = this.config.initialPrice;
    this.previousPrice = this.config.initialPrice;
    this.history = [];
    this.stepCount = 0;
    this.recentPeak = this.config.initialPrice;
    this.recentTrough = this.config.initialPrice;
    this.dayHigh = this.config.initialPrice;
    this.dayLow = this.config.initialPrice;
    this.totalVolume = 0;
    this.consecutiveUp = 0;
    this.consecutiveDown = 0;
    this.previousMaShort = 0;
    this.previousMaLong = 0;
    this.lastMaCross = null;
    this.consecutiveAboveMaLong = 0;
    this.consecutiveBelowMaLong = 0;

    this.recordPoint(0, this.currentPrice, this.currentPrice, this.currentPrice, this.currentPrice, 120);
  }

  /**
   * Generates next simulated market price for second `timeSeconds` (0 to 120)
   */
  public nextTick(timeSeconds: number): PricePoint {
    this.stepCount++;
    this.previousPrice = this.currentPrice;

    const baseNoise = gaussianRandom(this.rng) * this.config.volatility;
    let bias = 0;
    
    // 2-MINUTE (120-SECOND) DRIFT CURVES
    if (this.config.scenario === 'DIP_AND_REBOUND') {
      // Wave 1: Initial dip and recovery (0-25s) -> Rule 1 triggers ~16-20s
      if (timeSeconds > 2 && timeSeconds <= 16) {
        bias = -0.0022; // gentle drop of ~1.2%
      } else if (timeSeconds > 16 && timeSeconds <= 24) {
        bias = 0.0036; // 2+ green ticks confirming recovery
      } 
      // Wave 2: Uptrend expansion and Golden Cross (25-55s) -> Rule 2 buy ~36s, Rule 3 sell ~48s
      else if (timeSeconds > 24 && timeSeconds <= 55) {
        bias = 0.0026; // steady uptrend driving past profit target
      } 
      // Wave 3: Mid-session cooling & second dip setup (55-80s)
      else if (timeSeconds > 55 && timeSeconds <= 72) {
        bias = -0.0018; // healthy pullback
      } else if (timeSeconds > 72 && timeSeconds <= 80) {
        bias = 0.0032; // secondary bounce
      } 
      // Wave 4: Late session trend & consolidation (80-120s)
      else if (timeSeconds > 80 && timeSeconds <= 110) {
        bias = 0.0015; // gradual rise
      } else {
        bias = -0.0004; // safe consolidation into exit
      }
    } else if (this.config.scenario === 'BULLISH_BREAKOUT') {
      // Accumulation base (0-16s)
      if (timeSeconds <= 16) {
        bias = 0.0008;
      } 
      // Golden Cross rally (17-50s) -> Rule 2 Golden Cross Buy ~22s, Rule 3 Profit Take ~45s
      else if (timeSeconds > 16 && timeSeconds <= 50) {
        bias = 0.0034;
      } 
      // Pullback & Dip buy (51-85s) -> Rule 1 Dip Buy ~68s
      else if (timeSeconds > 50 && timeSeconds <= 66) {
        bias = -0.0020;
      } else if (timeSeconds > 66 && timeSeconds <= 76) {
        bias = 0.0035;
      } 
      // Final bull extension (77-120s)
      else if (timeSeconds > 76 && timeSeconds <= 108) {
        bias = 0.0022;
      } else {
        bias = -0.0005;
      }
    } else if (this.config.scenario === 'VOLATILE_STOPLOSS') {
      // Dip and early buy (0-20s)
      if (timeSeconds > 2 && timeSeconds <= 14) {
        bias = -0.0022;
      } else if (timeSeconds > 14 && timeSeconds <= 20) {
        bias = 0.0034; // Dip buy triggers
      } 
      // Sudden steep sell-off breaching -1.0% stop-loss (21-42s) -> Rule 4 Stop Loss fires!
      else if (timeSeconds > 20 && timeSeconds <= 42) {
        bias = -0.0042; // steep drop breaking stop loss threshold
      } 
      // Bottom out and recovery (43-85s)
      else if (timeSeconds > 42 && timeSeconds <= 75) {
        bias = 0.0038;
      } else if (timeSeconds > 75 && timeSeconds <= 110) {
        bias = 0.0016;
      } else {
        bias = 0.0002;
      }
    } else {
      // BALANCED_CYCLE: Multi-wave stochastic walk with mean reversion
      const mean = this.config.initialPrice;
      const distFromMean = (this.currentPrice - mean) / mean;
      const meanReversion = -distFromMean * 0.06;
      const momentum = (this.currentPrice - this.previousPrice) / this.previousPrice * 0.22;
      bias = meanReversion + momentum;
      
      if (timeSeconds >= 10 && timeSeconds <= 20) bias -= 0.0020;
      else if (timeSeconds >= 21 && timeSeconds <= 32) bias += 0.0028;
      else if (timeSeconds >= 50 && timeSeconds <= 70) bias += 0.0022;
      else if (timeSeconds >= 80 && timeSeconds <= 95) bias -= 0.0018;
      else if (timeSeconds >= 96 && timeSeconds <= 112) bias += 0.0020;
    }

    const priceDeltaPercent = bias + baseNoise;
    let nextPrice = roundPaise(this.currentPrice * (1 + priceDeltaPercent));
    
    if (nextPrice < 1.0) nextPrice = 1.0;

    const open = this.currentPrice;
    const close = nextPrice;
    const high = roundPaise(Math.max(open, close) + Math.abs(gaussianRandom(this.rng) * 0.12));
    const low = roundPaise(Math.min(open, close) - Math.abs(gaussianRandom(this.rng) * 0.12));
    
    // Generate tick volume (e.g. 150 to 800 units)
    const tickVol = Math.round(250 + Math.abs(gaussianRandom(this.rng) * 350));
    this.totalVolume += tickVol;

    this.currentPrice = close;
    if (high > this.dayHigh) this.dayHigh = high;
    if (low < this.dayLow) this.dayLow = low;

    return this.recordPoint(timeSeconds, open, high, low, close, tickVol);
  }

  private recordPoint(
    timeSeconds: number, 
    open: number, 
    high: number, 
    low: number, 
    close: number, 
    volume: number
  ): PricePoint {
    const prices = this.history.map(h => h.price).concat(close);
    const maShort = calculateMovingAverage(prices, 5);
    const maLong = calculateMovingAverage(prices, 12);

    const change = roundPaise(close - this.previousPrice);
    const changePercent = this.previousPrice > 0 
      ? roundPaise(((close - this.previousPrice) / this.previousPrice) * 100) 
      : 0;

    let direction: 'up' | 'down' | 'flat' = 'flat';
    if (close > this.previousPrice) {
      direction = 'up';
      this.consecutiveUp++;
      this.consecutiveDown = 0;
    } else if (close < this.previousPrice) {
      direction = 'down';
      this.consecutiveDown++;
      this.consecutiveUp = 0;
    } else {
      this.consecutiveUp = 0;
      this.consecutiveDown = 0;
    }

    if (close > this.recentPeak) {
      this.recentPeak = close;
    }
    if (close < this.recentTrough) {
      this.recentTrough = close;
    }

    if (this.previousMaShort > 0 && this.previousMaLong > 0) {
      if (this.previousMaShort <= this.previousMaLong && maShort > maLong) {
        this.lastMaCross = 'bullish';
      } else if (this.previousMaShort >= this.previousMaLong && maShort < maLong) {
        this.lastMaCross = 'bearish';
      }
    }
    this.previousMaShort = maShort;
    this.previousMaLong = maLong;

    if (close > maLong) {
      this.consecutiveAboveMaLong++;
      this.consecutiveBelowMaLong = 0;
    } else if (close < maLong) {
      this.consecutiveBelowMaLong++;
      this.consecutiveAboveMaLong = 0;
    } else {
      this.consecutiveAboveMaLong = 0;
      this.consecutiveBelowMaLong = 0;
    }

    const point: PricePoint = {
      index: this.history.length,
      timeSeconds,
      timeFormatted: formatSeconds(timeSeconds),
      price: close,
      open,
      high,
      low,
      close,
      volume,
      change,
      changePercent,
      maShort,
      maLong,
      direction
    };

    this.history.push(point);
    return point;
  }

  /**
   * Generates a simulated realistic L2 Order Book around the current market price
   */
  public generateOrderBook(): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
    const p = this.currentPrice;
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 1; i <= 5; i++) {
      const bidPrice = roundPaise(p - i * 0.05);
      const bidQty = Math.round(50 + (this.rng() * 120));
      bidTotal += bidQty;
      bids.push({ price: bidPrice, quantity: bidQty, total: bidTotal });

      const askPrice = roundPaise(p + i * 0.05);
      const askQty = Math.round(50 + (this.rng() * 120));
      askTotal += askQty;
      asks.push({ price: askPrice, quantity: askQty, total: askTotal });
    }

    return { bids, asks };
  }

  public getMarketState(): MarketState {
    const initialPrice = this.config.initialPrice;
    const changePercent = initialPrice > 0 
      ? roundPaise(((this.currentPrice - initialPrice) / initialPrice) * 100) 
      : 0;

    const { bids, asks } = this.generateOrderBook();

    return {
      currentPrice: this.currentPrice,
      previousPrice: this.previousPrice,
      initialPrice,
      changePercent,
      priceHistory: [...this.history],
      recentPeak: this.recentPeak,
      recentTrough: this.recentTrough,
      dayHigh: this.dayHigh,
      dayLow: this.dayLow,
      totalVolume: this.totalVolume,
      bids,
      asks,
      consecutiveUp: this.consecutiveUp,
      consecutiveDown: this.consecutiveDown,
      lastMaCross: this.lastMaCross,
      consecutiveAboveMaLong: this.consecutiveAboveMaLong,
      consecutiveBelowMaLong: this.consecutiveBelowMaLong,
      activeScenarioName: this.config.scenario
    };
  }

  public markTradeOnHistory(timeSeconds: number, side: 'BUY' | 'SELL', tooltip: string): void {
    const point = this.history.find(p => p.timeSeconds === timeSeconds) || this.history[this.history.length - 1];
    if (point) {
      if (side === 'BUY') {
        point.hasBuyMarker = true;
      } else {
        point.hasSellMarker = true;
      }
      point.markerTooltip = tooltip;
    }
  }
}
