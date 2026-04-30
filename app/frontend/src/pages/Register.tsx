import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
    if (password !== confirm) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
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
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("auth.registrationFailed")));
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
      setError(getErrorMessage(err, t("auth.googleFailed")));
    } finally {
      setIsGoogleLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-white text-2xl font-bold mb-2">{t("auth.checkInbox")}</h1>
          <p className="text-[#A1A1AA] text-sm mb-6">
            {t("auth.verificationEmailSent")} <span className="text-white font-medium">{email}</span>.<br />
            {t("auth.activateAccount")}
          </p>
          <Link to="/login" className="text-[#7C3AED] hover:text-[#A855F7] transition-colors text-sm font-medium">
            {t("auth.backToSignIn")}
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
            <span className="text-white font-bold text-base">V</span>
          </div>
          <span className="whitespace-nowrap text-white font-semibold text-lg tracking-tight">
            Vibe Coding Studio
          </span>
        </div>

        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-8 shadow-xl">
          <h1 className="text-white text-2xl font-bold mb-1">{t("auth.createAccountTitle")}</h1>
          <p className="text-[#71717A] text-sm mb-6">{t("auth.registerSubtitle")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                {t("auth.name")} <span className="text-[#52525B]">{t("auth.optional")}</span>
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
                {t("auth.email")}
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
                {t("auth.password")}
              </label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="w-full bg-[#09090B] border border-[#3F3F46] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-[#A1A1AA] mb-1.5">
                {t("auth.confirmPassword")}
              </label>
              <input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("auth.confirmPasswordPlaceholder")}
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
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#27272A]" />
            <span className="text-xs uppercase tracking-[0.24em] text-[#52525B]">
              {t("auth.orContinueWith")}
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
                {isCheckingGoogle ? t("auth.checkingGoogle") : t("auth.redirecting")}
              </>
            ) : (
              <>
                <GoogleLogo />
                {t("auth.continueWithGoogle")}
              </>
            )}
          </Button>

          {!isCheckingGoogle && !isGoogleEnabled && (
            <p className="mt-3 text-center text-xs text-[#71717A]">
              {t("auth.googleUnavailable")}
            </p>
          )}

          <p className="text-center text-sm text-[#71717A] mt-6">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link to="/login" className="text-[#A855F7] hover:text-white transition-colors font-medium">
              {t("auth.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
