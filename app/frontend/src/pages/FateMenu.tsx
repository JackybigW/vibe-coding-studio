import { useState, useEffect, useRef } from "react";
import { client } from "@/lib/api";

interface Food {
  id: number;
  name: string;
  emoji: string;
  tagline: string;
}

const ALL_EMOJIS = ["🍲", "🥩", "🍣", "🍜", "🌶️", "🍔", "🍕", "🍗", "🍝", "🥟"];

type Phase = "idle" | "spinning" | "result";

export default function FateMenu() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Food | null>(null);
  const [spinEmoji, setSpinEmoji] = useState("🎲");
  const [spinIdx, setSpinIdx] = useState(0);
  const spinRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchRef = useRef<Promise<Food | null> | null>(null);

  const fetchFood = async (): Promise<Food | null> => {
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/fate-menu/random",
        method: "GET",
        data: {},
      });
      return res?.data ?? null;
    } catch {
      return null;
    }
  };

  const handleDecide = async () => {
    if (phase === "spinning") return;
    setPhase("spinning");
    setResult(null);

    // Kick off fetch immediately
    fetchRef.current = fetchFood();

    // Spin animation — cycle emojis rapidly
    let idx = 0;
    spinRef.current = setInterval(() => {
      idx = (idx + 1) % ALL_EMOJIS.length;
      setSpinIdx(idx);
      setSpinEmoji(ALL_EMOJIS[idx]);
    }, 80);

    // Wait at least 1.8s for dramatic effect, then settle
    const [food] = await Promise.all([
      fetchRef.current,
      new Promise((r) => setTimeout(r, 1800)),
    ]);

    if (spinRef.current) clearInterval(spinRef.current);

    if (food) {
      setSpinEmoji(food.emoji);
      setResult(food);
      setTimeout(() => setPhase("result"), 150);
    } else {
      setPhase("idle");
    }
  };

  useEffect(() => {
    return () => {
      if (spinRef.current) clearInterval(spinRef.current);
    };
  }, []);

  const handleReset = () => {
    setPhase("idle");
    setResult(null);
    setSpinEmoji("🎲");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FF8C00 0%, #FFB347 40%, #FFD700 100%)",
      }}
    >
      {/* Floating background blobs */}
      <div className="absolute top-10 left-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
        style={{ background: "#FF6B00" }} />
      <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full opacity-20 blur-3xl"
        style={{ background: "#FF4500" }} />
      <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full opacity-15 blur-xl"
        style={{ background: "#FFE033" }} />

      {/* Title */}
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-tight mb-2">
          🎰 命运菜单
        </h1>
        <p className="text-white/80 text-lg font-medium">
          今天吃什么？让命运帮你决定！
        </p>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Idle / spinning state */}
        {phase !== "result" && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6">
            {/* Slot display */}
            <div
              className="w-32 h-32 rounded-2xl flex items-center justify-center text-6xl shadow-inner transition-transform"
              style={{
                background: "linear-gradient(135deg, #FFF3CC, #FFE08A)",
                transform: phase === "spinning" ? "scale(1.05)" : "scale(1)",
              }}
            >
              <span
                key={spinIdx}
                className={phase === "spinning" ? "animate-spin-fast" : ""}
                style={{
                  display: "inline-block",
                  animation: phase === "spinning"
                    ? "slotFlip 0.08s steps(1) infinite"
                    : "none",
                }}
              >
                {spinEmoji}
              </span>
            </div>

            {phase === "idle" && (
              <p className="text-gray-400 text-sm">点击下方按钮，开始你的美食冒险！</p>
            )}
            {phase === "spinning" && (
              <p className="text-orange-500 font-bold text-sm animate-pulse">
                命运正在转动中...
              </p>
            )}

            <button
              onClick={handleDecide}
              disabled={phase === "spinning"}
              className="w-full py-4 rounded-2xl text-white text-xl font-black shadow-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: phase === "spinning"
                  ? "#FFB347"
                  : "linear-gradient(135deg, #FF8C00, #FF4500)",
                boxShadow: phase === "spinning"
                  ? "none"
                  : "0 6px 20px rgba(255, 100, 0, 0.4)",
              }}
            >
              {phase === "spinning" ? "🎰 转动中..." : "🎲 帮我决定！"}
            </button>
          </div>
        )}

        {/* Result state */}
        {phase === "result" && result && (
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5"
            style={{
              animation: "slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          >
            {/* Food emoji */}
            <div
              className="w-32 h-32 rounded-2xl flex items-center justify-center text-6xl shadow-inner"
              style={{ background: "linear-gradient(135deg, #FFF3CC, #FFE08A)" }}
            >
              {result.emoji}
            </div>

            {/* Food name */}
            <div className="text-center">
              <h2 className="text-3xl font-black text-gray-800 mb-1">
                {result.name}
              </h2>
              <p className="text-orange-500 font-semibold text-sm px-4 leading-relaxed">
                {result.tagline}
              </p>
            </div>

            {/* Decision stamp */}
            <div
              className="px-4 py-2 rounded-full text-white text-xs font-bold tracking-wider"
              style={{ background: "linear-gradient(135deg, #FF8C00, #FF4500)" }}
            >
              ✨ 命运已决定！
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-2xl border-2 border-orange-300 text-orange-500 font-bold text-sm transition-all active:scale-95 hover:bg-orange-50"
              >
                🔄 再抽一次
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #FF8C00, #FF4500)",
                  boxShadow: "0 4px 12px rgba(255, 100, 0, 0.35)",
                }}
              >
                ✅ 就这个！
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-white/50 text-xs z-10">
        今天的幸运美食由命运守护神亲自选定 🌟
      </p>

      <style>{`
        @keyframes slotFlip {
          0% { opacity: 1; transform: translateY(0); }
          50% { opacity: 0.3; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
