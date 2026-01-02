'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import AdminCard from '@/components/admin/AdminCard';
import TextInput from '@/components/admin/forms/TextInput';
import PasswordInput from '@/components/admin/forms/PasswordInput';

import { getSession, isAdminUser, signInWithPassword, signOut } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextUrl = searchParams.get('next') || '/admin';
  const errorParam = searchParams.get('error');

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    const checkExisting = async () => {
      const { session } = await getSession();

      // If already logged in and admin, go to admin
      if (session?.user) {
        const ok = await isAdminUser(session.user.id);
        if (!alive) return;

        if (ok) router.replace(nextUrl);
        else {
          await signOut();
          if (!alive) return;
          setError('Your account is not allowed to access admin.');
        }
      }

      if (errorParam === 'not_allowed') {
        setError('Your account is not allowed to access admin.');
      }
    };

    checkExisting();

    return () => {
      alive = false;
    };
  }, [router, nextUrl, errorParam]);

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await signInWithPassword(form.email, form.password);

    if (error || !data?.session?.user) {
      setLoading(false);
      setError(error?.message || 'Login failed.');
      return;
    }

    // allowlist check
    const ok = await isAdminUser(data.session.user.id);

    if (!ok) {
      await signOut();
      setLoading(false);
      setError('Your account is not allowed to access admin.');
      return;
    }

    setLoading(false);
    router.replace(nextUrl);
  };

  return (
    <div className="container py-5" style={{ maxWidth: 520 }}>
      <AdminCard title="Admin Login">
        <form onSubmit={onSubmit}>
          <TextInput
            label="Email"
            value={form.email}
            onChange={(v) => update('email', v)}
            placeholder="you@example.com"
            required
          />

          <PasswordInput
            label="Password"
            value={form.password}
            onChange={(v) => update('password', v)}
            placeholder="Your password"
            required
          />

          {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}

          <button className="btn btn-primary w-100 mt-3" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {/* <div className="d-flex justify-content-between align-items-center mt-3 small">
            <span className="opacity-75">No account yet?</span>
            <Link
              href={`/admin/register?next=${encodeURIComponent(nextUrl)}`}
              className="text-decoration-none"
            >
              Create account
            </Link>
          </div> */}
        </form>
      </AdminCard>
    </div>
  );
}
