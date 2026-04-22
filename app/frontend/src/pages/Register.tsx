import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { client } from "@/lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/auth/register",
        method: "POST",
        data: { email, password, name: name || undefined },
      });
      if (res?.data?.detail) throw new Error(res.data.detail);
      setDone(true);
    } catch (err: any) {
      if (err?.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err?.data?.detail) {
        setError(err.data.detail);
      } else {
        setError(err instanceof Error ? err.message : "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-white text-2xl font-bold mb-2">Check your inbox</h1>
          <p className="text-[#A1A1AA] text-sm mb-6">
            We sent a verification link to <span className="text-white font-medium">{email}</span>.<br />
            Click it to activate your account.
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
          <h1 className="text-white text-2xl font-bold mb-1">Create an account</h1>
          <p className="text-[#71717A] text-sm mb-6">Start building with AI for free</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Name <span className="text-[#52525B]">(optional)</span>
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jacky"
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3.5 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-purple-900/30"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#71717A] mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#A855F7] hover:text-white transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
