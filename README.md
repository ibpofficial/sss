# AUTONOMOUS QUANT TRADING DESK — 2-MINUTE LIVE SIMULATION DEMO

An institutional-grade, interactive, full-stack **Autonomous AI Quantitative Trading Terminal** demonstrating how an automated bot observes market micro-movements, evaluates quantitative rules, executes virtual orders, manages risk, and transparently logs decisions in real-time.

Built with **React 19, TypeScript, Vite, Tailwind CSS**, and a **pure TypeScript decoupled quantitative engine**.

---

## 🚀 Key 2-Minute Trading Software Features

1. **2-Minute (120-Second) Live Simulation**:
   - Seeded, deterministic market simulator with realistic stochastic fluctuations (random walk + momentum + mean-reversion).
   - High-performance financial candlestick and moving-average chart (5-period MA & 12-period MA).
   - Dynamic **Take-Profit (green)**, **Entry (amber)**, and **Stop-Loss (red)** horizontal price lines overlaid across the chart when in an active position.
   - Live 120-to-0 second countdown timer (`02:00 / 02:00`) and synchronized progress bar.

2. **Strategy Signal Radar (WHEN TO BUY & WHEN TO SELL)**:
   - Real-time gauge evaluating each rule's criteria before execution:
     - **BUY 1 (Dip & Recovery)**: Tracks drop from local peak ($\ge 1.0\%$) and reversal confirmation ticks ($\ge 2$ green ticks).
     - **BUY 2 (Golden Cross)**: Tracks MA5 vs MA12 bullish spread and confirmation ticks above MA12.
     - **SELL 1 (Take-Profit)**: Tracks position gain towards $+1.5\%$ target to sell 50% holdings.
     - **SELL 2 (Stop-Loss)**: Tracks position drawdown towards $-1.0\%$ threshold for 100% emergency exit.
     - **EXIT 3 (Capital Protection)**: Tracks remaining seconds (locks new entries at $T < 5\text{s}$, liquidates at $T = 120\text{s}$).

3. **Institutional Trading Desk Design**:
   - **Global Ticker Bar**: LTP, 24H High, 24H Low, 24H Volume, 0.1% fees, 0.05% slippage.
   - **L2 Order Book (Market Depth)**: Top 4 Bids and Asks with volume depth visualizer and spread calculation.
   - **Chart Controls**: Toggle between Candlestick and Line/Area modes, toggle MA lines, TP/SL overlays, and volume sub-chart.

4. **Virtual Trading Account & Ledger (Paper Trading)**:
   - Initial demo balance: **₹10,000.00** (**₹0 Real Money** — Broker disabled).
   - Atomically tracks 10 financial metrics: Portfolio Equity, Available Cash, Asset Quantity, Average Cost Basis, Market Value, Unrealized P/L, Realized P/L, Fees Paid, Total Return %, and Maximum Drawdown.

5. **Agent Brain / Decision Log & Transaction Ledger**:
   - Live monospace stream of reasoning with filter buttons (All, Orders, Rules, Risk, Hold).
   - Financial ledger table with trade ID, timestamps, sides, quantities, execution prices, gross amounts, fees, and realized P/L.

---

## 🧪 Automated Test Suite (18 Requirements)

```bash
npm test
```

All 18 automated tests pass via Vitest:
- Initial balance equals ₹10,000.
- Valid dip signal triggers Rule 1.
- Falling price without recovery does not trigger.
- Golden cross triggers at most one entry per crossover.
- Profit target closes 50% of position.
- Stop-loss has priority over buy signals.
- Available cash and asset quantity limits enforced.
- Transaction fees (0.1%) and P/L calculated correctly.
- Cooldown and duplicate prevention verified.
- Pause, Resume, Emergency Stop, and 120s Expiry verified.
- Drawdown and session-end reporting verified.

---

## 🛠️ How to Run Locally

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:5174/` in your browser.
