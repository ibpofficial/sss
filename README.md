# AUTONOMOUS AI TRADING AGENT — LIVE SIMULATION DEMO

A high-performance, interactive, end-to-end **Autonomous Quantitative Trading Agent Terminal** demonstrating how an algorithmic bot observes market fluctuations, evaluates quantitative rules, executes virtual orders, manages risk, and transparently logs every decision.

Built with **React 19, TypeScript, Vite, Tailwind CSS**, and a **fully decoupled pure TypeScript quantitative engine**.

---

## 🚀 Live Demonstration Features

1. **60-Second Real-Time Simulation**:
   - Seeded, deterministic market simulator with realistic stochastic fluctuations (random walk + momentum + mean-reversion).
   - High-performance financial line and moving-average chart (5-period MA & 12-period MA).
   - Execution markers (Green 'B' for BUY, Red 'S' for SELL) directly annotated on the graph with hover tooltips.
   - Live 60-to-0 second countdown timer and progress indicator.

2. **Virtual Trading Account & Ledger (Paper Trading)**:
   - Initial demo balance: **₹10,000.00**.
   - **₹0 Real Money** — Safe educational environment. Broker connection disabled.
   - Atomically tracks 10 financial metrics: Portfolio Equity, Available Cash, Asset Quantity Owned, Average Cost Basis, Market Value of Holdings, Unrealized P/L, Realized P/L, Total Fees Paid (0.1% per trade), Total Return %, and Maximum Drawdown.

3. **5 Predefined Quantitative Trading Rules**:
   - **Rule 1 — Buy The Dip**: Falls ≥1% from recent peak with 2-tick recovery confirmation. Allocates 20% of cash.
   - **Rule 2 — Buy On Confirmed Uptrend**: Golden Cross (MA5 > MA12) + price above MA12 for ≥2 updates. Allocates 15% of cash. Max 1 buy per crossover.
   - **Rule 3 — Sell On Profit Target**: Current price ≥ +1.5% above entry price. Sells 50% of open holdings.
   - **Rule 4 — Sell To Limit Losses**: Current price drops ≥ 1.0% below entry price. Emergency 100% liquidation. Highest priority over buy signals.
   - **Rule 5 — Capital Protection & Safe Exit**: Blocks new entries at T<5s; liquidates remaining open position at T=0s cleanly.

4. **Transparent Agent Brain / Decision Log**:
   - Real-time timestamped stream of reasoning for every tick (`[00:04] MARKET TICK`, `[00:12] RULE TRIGGERED`, `[00:12] RISK VALIDATION`, `[00:12] ORDER EXECUTED`).
   - Explains *why* the agent bought, sold, or held.
   - Filter tabs: All, Orders, Rules, Risk, Hold.

5. **Session-End Performance Report**:
   - Total Return %, Win Rate (% winning closed positions), Max Drawdown %, Total Fees, Rules Triggered Breakdown, and Replay capabilities.

6. **Interactive Controls**:
   - Start / Pause / Resume / Emergency Stop / Reset / Replay with same seed.
   - Market Scenario Switcher (Dip & Rebound, Bullish Breakout, Volatile Shakeout, Balanced Multi-Cycle).
   - Built-in **Presentation Guide Modal** (English & Hindi) for live demo delivery.

---

## 🏗️ Technical Architecture

The engine is strictly decoupled from the UI:

```
src/
├── types/
│   ├── market.ts          # PricePoint, MarketState, indicator types
│   ├── orders.ts          # OrderSide, Transaction, DecisionObject, AgentStatus
│   ├── portfolio.ts       # PortfolioState, RiskConfig, SessionReportData
│   └── strategy.ts        # StrategyRuleConfig, RuleEvaluationState, RuleId
├── utils/
│   ├── calculations.ts    # Paise-safe rounding, fees, slippage, weighted cost basis
│   ├── formatting.ts      # Indian Rupees (₹), percentages, units, time
│   └── deterministicRandom.ts # Seeded Mulberry32 PRNG & Box-Muller Gaussian noise
├── engine/
│   ├── marketSimulator.ts # Deterministic stochastic price feed & scenarios
│   ├── tradingRules.ts    # Pure quantitative logic for Rules 1 to 5
│   ├── riskManager.ts     # Pre-trade bounds, cooldown, loss limits, slippage
│   ├── portfolioLedger.ts # Double-entry atomic ledger & metrics calculation
│   ├── decisionEngine.ts  # Priority-based rule evaluation & structured decisions
│   ├── executionEngine.ts # Decision execution, status transitions & chart markers
│   └── sessionController.ts # 60s lifecycle scheduler, publish-subscribe state
└── components/
    ├── HeaderNav.tsx          # Brand, status, timer, controls & scenario selector
    ├── PortfolioOverview.tsx  # 6 financial balance & P/L metric cards
    ├── TradingChart.tsx       # Live SVG financial chart with MA lines & markers
    ├── StrategyRules.tsx      # Rules panel with threshold editing & toggles
    ├── AgentActivityConsole.tsx # Monospace live reasoning feed & filters
    ├── TransactionHistory.tsx # Immutable financial ledger table
    ├── SessionReport.tsx      # Session-end performance modal
    └── PresentationGuide.tsx  # Step-by-step pitch sequence modal
```

---

## 🧪 Automated Test Suite (18 Requirements)

All 18 acceptance criteria specified in Section 15 are implemented and verified via Vitest:

```bash
npm test
```

### Verified Scenarios:
1. Initial balance equals ₹10,000 and holdings are 0.
2. A valid dip signal triggers Rule 1 Buy The Dip.
3. A falling price without recovery confirmation does NOT trigger a dip purchase.
4. A confirmed moving-average crossover triggers at most one entry per crossover.
5. A profit target closes the correct portion of the position (50%).
6. A stop-loss has priority over ordinary buy signals.
7. A trade cannot exceed the available cash balance.
8. Selling cannot exceed the available asset quantity.
9. Transaction fees are deducted correctly (0.1%).
10. Realized and unrealized P/L are calculated correctly.
11. Duplicate order execution is prevented by cooldown and state tracking.
12. Pausing stops new market updates and decisions.
13. Resuming continues the same session without resetting portfolio.
14. Session expiry stops new entries and closes remaining position cleanly.
15. Emergency stop prevents subsequent automated trades.
16. A losing simulation is reported accurately without fabrication.
17. Maximum drawdown is calculated from portfolio equity.
18. Reset restores initial demo account and clears active session safely.

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Development
```bash
# 1. Clone repository & enter directory
cd d:/metad/sss

# 2. Install dependencies
npm install

# 3. Run automated test suite
npm test

# 4. Start local development server
npm run dev
```

Open `http://localhost:5174/` in your browser.

### Production Build
```bash
npm run build
npm run preview
```

---

## 🎙️ Demo Presentation Sequence (Demo Kaise Present Karein)

1. **Account Start Karo**:
   - Audience ko dikhao: **₹10,000 virtual balance**, zero holdings, live simulation chart aur 60-second countdown timer. Point out karo ki yeh 100% paper trading demo hai (₹0 real money).

2. **Agent Ko Automatic Decisions Lete Dikhao**:
   - "Start Agent" button dabao.
   - Point out karo ki user ko koi BUY ya SELL button click karne ki zaroorat nahi hai.
   - Jab price peak se dip hota hai aur 2-tick recovery confirm hoti hai, tab agent **Rule 1** se automatically buy karega.
   - Golden Cross par **Rule 2** se buy karega, aur target aane par **Rule 3** se 50% profit book karega.

3. **Proof Dikhao Ki Agent Actually Kaam Kar Raha Hai**:
   - **Agent Brain / Decision Log** me live reasoning stream dikhao ("Price fell 1.2%, recovery confirmed, risk passed").
   - **Transaction Ledger** me har trade ki quantity, execution price, 0.1% fees, net cash movement aur realized P/L live update hote hue dikhao.
   - 60 seconds khatam hone par final **Session Performance Report** modal me Total Return, Win Rate, aur Drawdown dikhao.
