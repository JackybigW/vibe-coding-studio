import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { client } from "@/lib/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [seconds, setSeconds] = useState(5);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    client.apiCall.invoke({
      url: "/api/v1/auth/verify-email",
      method: "POST",
      data: { token },
    }).then(res => {
      if (res?.data?.detail) throw new Error();
      setStatus("success");
    }).catch(() => {
      setStatus("error");
    });
  }, [token]);

  // Auto-redirect to login after success
  useEffect(() => {
    if (status !== "success") return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    const timer = setTimeout(() => (window.location.href = "/login"), 5000);
    return () => {
      clearInterval(id);
      clearTimeout(timer);
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-white text-lg font-medium">Verifying your email…</div>
          <p className="text-[#A1A1AA] text-sm mt-2">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {status === "success" ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-white text-2xl font-bold mb-2">Email verified!</h1>
            <p className="text-[#A1A1AA] text-sm mb-6">
              Your account is now active. Redirecting to sign in in{" "}
              <span className="text-white font-medium">{seconds}s</span>…
            </p>
            <Link
              to="/login"
              className="inline-block bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white font-semibold py-2.5 px-6 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Sign in now
            </Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-white text-2xl font-bold mb-2">Verification failed</h1>
            <p className="text-[#A1A1AA] text-sm mb-6">
              This link is invalid or has expired. Please register again or request a new link.
            </p>
            <Link
              to="/register"
              className="inline-block bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white font-semibold py-2.5 px-6 rounded-lg text-sm hover:opacity-90 transition-opacity"
            >
              Back to sign up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
