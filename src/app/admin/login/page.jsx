// src/app/admin/login/page.jsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AdminLoginInner />
    </Suspense>
  );
}

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/admin") ? n : "/admin";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      if (data?.user) router.replace(nextUrl);
    })();

    return () => {
      alive = false;
    };
  }, [router, nextUrl]);

  const validate = () => {
    setError("");
    setNotice("");

    if (!email.trim()) return "Email is required.";
    if (!password) return "Password is required.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email.";

    return "";
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authErr) {
      setError(authErr.message || "Login failed.");
      return;
    }

    if (data?.session) {
      router.replace(nextUrl);
      router.refresh();
      return;
    }

    setError("Login failed. No session returned.");
  };

  const handleForgotPassword = async () => {
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError("Enter your email first so we can send the reset link.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }

    setLoading(true);

    const redirectTo = `${siteUrl}/admin/login`;

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (resetErr) {
      setError(resetErr.message || "Failed to send reset email.");
      return;
    }

    setNotice("Password reset email sent. Please check your inbox.");
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h1 className="h4 mb-0">Admin Login</h1>
              <span className="badge text-bg-dark">/admin</span>
            </div>

            <p className="text-muted mb-4">Sign in to manage your portfolio content.</p>

            {error ? (
              <div className="alert alert-danger py-2" role="alert">
                <i className="fa-solid fa-triangle-exclamation me-2"></i>
                {error}
              </div>
            ) : null}

            {notice ? (
              <div className="alert alert-success py-2" role="alert">
                <i className="fa-solid fa-circle-check me-2"></i>
                {notice}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="vstack gap-3">
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="admin@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="form-label d-flex align-items-center justify-content-between">
                  <span>Password</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => setShowPass((s) => !s)}
                  >
                    {showPass ? (
                      <>
                        <i className="fa-regular fa-eye-slash me-1"></i> Hide
                      </>
                    ) : (
                      <>
                        <i className="fa-regular fa-eye me-1"></i> Show
                      </>
                    )}
                  </button>
                </label>

                <div className="input-group">
                  <input
                    className="form-control"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    title="Send password reset email"
                  >
                    <i className="fa-solid fa-unlock-keyhole me-2"></i>
                    Forgot
                  </button>
                </div>

                <div className="form-text">Use “Forgot” to send a reset link to your email.</div>
              </div>

              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket me-2"></i>
                    Sign In
                  </>
                )}
              </button>

              <div className="text-center small text-muted">
                Redirect target: <code>{nextUrl}</code>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-3 small text-muted">
          Tip: Disable <code>/admin/register</code> after initial setup.
        </div>
      </div>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <div className="text-muted">Loading...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
