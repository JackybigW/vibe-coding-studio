import { useState } from "react";
import { Link } from "react-router-dom";
import { client } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await client.apiCall.invoke({
        url: "/api/v1/auth/forgot-password",
        method: "POST",
        data: { email },
      });
      setDone(true);
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err?.data?.detail) {
        setError(err.data.detail);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📮</div>
          <h1 className="text-white text-2xl font-bold mb-2">Reset link sent</h1>
          <p className="text-[#A1A1AA] text-sm mb-6">
            If <span className="text-white font-medium">{email}</span> is registered, you'll receive a reset link
            shortly. Check your inbox (and spam folder).
          </p>
          <Link to="/login" className="text-[#7C3AED] hover:text-[#A855F7] transition-colors text-sm font-medium">
            Back to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-lg shadow-purple-900/40">
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Atoms</span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 shadow-xl">
          <h1 className="text-white text-2xl font-bold mb-1">Forgot password?</h1>
          <p className="text-[#71717A] text-sm mb-6">
            Enter your email and we'll send a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3.5 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              id="forgot-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-purple-900/30"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-sm text-[#71717A] mt-6">
            Remember your password?{" "}
            <Link to="/login" className="text-[#A855F7] hover:text-white transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
