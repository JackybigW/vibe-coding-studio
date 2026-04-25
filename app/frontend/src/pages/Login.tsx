import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { client } from "@/lib/api";
import { authApi } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import GoogleLogo from "@/components/GoogleLogo";
import { Loader2 } from "lucide-react";

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = (error as { response?: { data?: { detail?: string } } }).response;
    if (maybeResponse?.data?.detail) {
      return maybeResponse.data.detail;
    }

    const maybeData = (error as { data?: { detail?: string } }).data;
    if (maybeData?.detail) {
      return maybeData.detail;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false);
  const [isCheckingGoogle, setIsCheckingGoogle] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    authApi
      .getProviders()
      .then((providers) => {
        if (!cancelled) {
          setIsGoogleEnabled(providers.google);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingGoogle(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Sign in failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsGoogleLoading(true);
    try {
      await login();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Google sign in failed"));
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-lg shadow-purple-900/40">
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">Atoms</span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 shadow-xl">
          <h1 className="text-white text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-[#71717A] text-sm mb-6">Sign in to your Atoms account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                Email
              </label>
              <input
                id="email"
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-[#A1A1AA]">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3.5 py-3 text-red-400 text-sm">
                <div className="mb-1">{error}</div>
                {error.toLowerCase().includes("verify") && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await client.apiCall.invoke({
                          url: "/api/v1/auth/resend-verification",
                          method: "POST",
                          data: { email },
                        });
                        alert("Verification link sent! Check your inbox.");
                      } catch {
                        alert("Failed to resend. Please try again later.");
                      }
                    }}
                    className="text-[#A855F7] hover:text-white font-medium underline underline-offset-2 transition-colors mt-1"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-purple-900/30"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#27272A]" />
            <span className="text-xs uppercase tracking-[0.24em] text-[#52525B]">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-[#27272A]" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-[#3F3F46] bg-[#09090B] text-white hover:bg-[#111114]"
            onClick={handleGoogleSignIn}
            disabled={isCheckingGoogle || isGoogleLoading || !isGoogleEnabled}
          >
            {isCheckingGoogle || isGoogleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isCheckingGoogle ? "Checking Google sign-in…" : "Redirecting…"}
              </>
            ) : (
              <>
                <GoogleLogo />
                Continue with Google
              </>
            )}
          </Button>

          {!isCheckingGoogle && !isGoogleEnabled && (
            <p className="mt-3 text-center text-xs text-[#71717A]">
              Google sign-in is not configured in this environment yet.
            </p>
          )}

          <p className="text-center text-sm text-[#71717A] mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#A855F7] hover:text-white transition-colors font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
