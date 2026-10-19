import React from 'react';
import { HelpCircle, X, Play, Cpu } from 'lucide-react';

interface PresentationGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

export const PresentationGuide: React.FC<PresentationGuideProps> = ({
  isOpen,
  onClose,
  onStartDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#121A2B] border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Demo Presentation Sequence (Demo Kaise Present Karein)
              </h2>
              <p className="text-xs text-slate-400 font-mono">Step-by-step pitch & live demonstration guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh] text-xs">
          {/* Step 1 */}
          <div className="bg-[#0B1020] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">1</span>
              <span>Account Start Karo (Initial Setup)</span>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              Audience ko dikhao ki account me <strong className="text-white">₹10,000 virtual balance</strong> hai, holdings zero hai, live simulation chart ready hai, aur top me <strong className="text-white">60-second timer</strong> hai. Yahan koi real broker connection nahi hai, 100% paper trading simulation hai.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#0B1020] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">2</span>
              <span>Agent Ko Automatic Decisions Lete Dikhao (Autonomous Engine)</span>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              "Start Agent" button dabao. Point out karo ki user ko koi BUY ya SELL button click nahi karna padta:
              <br />
              • <strong className="text-emerald-400">Rule 1:</strong> Jab price peak se ≥1.0% dip hota hai aur 2-tick recovery confirm hoti hai, tab bot automatically BUY karta hai.
              <br />
              • <strong className="text-cyan-400">Rule 2:</strong> Golden Cross (MA5 &gt; MA12) confirm hone par trend buy karta hai.
              <br />
              • <strong className="text-purple-400">Rule 3 & 4:</strong> +1.5% profit target par profit booking karta hai aur -1.0% par stop-loss execute karta hai.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0B1020] p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-1">
              <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">3</span>
              <span>Proof Dikhao Ki Agent Actually Kaam Kar Raha Hai (Transparency)</span>
            </div>
            <p className="text-slate-300 leading-relaxed pl-8">
              Neeche diye gaye <strong className="text-white">Agent Brain / Decision Log</strong> me har second ka reasoning dikhao ("Price fell 1.2% from peak, recovery confirmed, risk passed"). Saath hi <strong className="text-white">Transaction History</strong> table me trade ID, quantity, 0.1% fees, cash balance aur realized P/L live update hote hue dikhao.
            </p>
          </div>

          {/* Technical Architecture Note */}
          <div className="bg-blue-950/20 border border-blue-800/40 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs mb-1">
              <Cpu className="w-4 h-4" />
              <span>Decoupled Quantitative Architecture (Clean Separation of Concerns)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong>Market Simulator</strong>, <strong>Decision Engine</strong>, aur <strong>Execution Engine</strong> completely alag-alag modules hain. Isse kal ko simulated data ki jagah Zerodha, Upstox, ya Binance ka real WebSocket live feed connect karna ho to bina core logic badle asani se connect ho sakta hai.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">Ready to present? Click Start Agent</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onStartDemo();
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Demo Now</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
