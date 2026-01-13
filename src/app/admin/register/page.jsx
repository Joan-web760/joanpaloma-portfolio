// src/app/admin/register/page.jsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={<RegisterSkeleton />}>
      <AdminRegisterInner />
    </Suspense>
  );
}

function AdminRegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/admin") ? n : "/admin";
  }, [searchParams]);

  const disabled = process.env.NEXT_PUBLIC_DISABLE_ADMIN_REGISTER === "true";

  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

    if (disabled) return "Admin registration is disabled.";
    if (!fullName.trim()) return "Name is required.";
    if (!email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (confirmPassword !== password) return "Passwords do not match.";

    return "";
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          invite_code: inviteCode.trim() || null,
        },
        emailRedirectTo: `${siteUrl}/admin/login`,
      },
    });

    setLoading(false);

    if (signUpErr) {
      setError(signUpErr.message || "Registration failed.");
      return;
    }

    // If email confirmations are ON, session can be null
    if (data?.session) {
      setNotice("Account created. Redirecting...");
      router.replace(nextUrl);
      router.refresh();
      return;
    }

    setNotice("Account created. Please check your email to confirm, then log in at /admin/login.");
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h1 className="h4 mb-0">Admin Register</h1>
              <span className="badge text-bg-dark">/admin/register</span>
            </div>

            <p className="text-muted mb-4">
              Create your admin account (typically only once). You can disable this route after setup.
            </p>

            {disabled ? (
              <div className="alert alert-warning py-2" role="alert">
                <i className="fa-solid fa-lock me-2"></i>
                Registration is currently disabled.
              </div>
            ) : null}

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

            <form onSubmit={handleRegister} className="vstack gap-3">
              <div>
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={disabled}
                />
              </div>

              <div>
                <label className="form-label">
                  Invite Code <span className="text-muted">(optional)</span>
                </label>
                <input
                  className="form-control"
                  placeholder="Invite code if enabled"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={disabled}
                />
                <div className="form-text">
                  If you enable invite-only mode with SQL, this becomes required.
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  placeholder="admin@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={disabled}
                />
              </div>

              <div>
                <label className="form-label d-flex align-items-center justify-content-between">
                  <span>Password</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => setShowPass((s) => !s)}
                    disabled={disabled}
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

                <input
                  className="form-control"
                  type={showPass ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={disabled}
                />
              </div>

              <div>
                <label className="form-label d-flex align-items-center justify-content-between">
                  <span>Confirm Password</span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => setShowConfirm((s) => !s)}
                    disabled={disabled}
                  >
                    {showConfirm ? (
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

                <input
                  className="form-control"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={disabled}
                />
              </div>

              <button className="btn btn-primary w-100" type="submit" disabled={loading || disabled}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    Creating account...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus me-2"></i>
                    Create Admin Account
                  </>
                )}
              </button>

              <div className="text-center small text-muted">
                Redirect target: <code>{nextUrl}</code>
              </div>

              <div className="text-center">
                <a className="small text-decoration-none" href="/admin/login">
                  Already have an account? Go to Login
                </a>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-3 small text-muted">
          Disable this route after setup using <code>NEXT_PUBLIC_DISABLE_ADMIN_REGISTER=true</code>.
        </div>
      </div>
    </div>
  );
}

function RegisterSkeleton() {
  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 p-md-5">
            <div className="text-muted">Loading...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
