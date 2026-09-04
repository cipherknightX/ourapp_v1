import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/useAuth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname?: string } })?.from?.pathname ||
    '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn(email, password);
    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-surface-bg text-text-main">
      <div className="w-full max-w-md rounded-md border border-border-subtle bg-surface-panel p-8 sm:p-10 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <img
            src={logoImg}
            alt="SaveThisForMe logo"
            className="mx-auto h-9 w-9 rounded-md object-contain"
            data-testid="brand-logo"
          />
          <h1 className="font-serif text-2xl font-normal text-text-main tracking-tight sm:text-3xl">
            SaveThisForMe
          </h1>
          <p className="text-xs text-text-muted">
            Sign in to access your personal visual archive
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-sm border border-status-danger/20 bg-status-danger-bg p-3 text-xs text-status-danger"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <Input
            id="email"
            type="email"
            label="Email address"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <Input
            id="password"
            type="password"
            label="Password"
            labelRight={
              <Link
                to="/forgot-password"
                className="text-[11px] text-text-muted hover:text-text-main underline transition"
              >
                Forgot password?
              </Link>
            }
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="w-full py-2.5 text-xs font-semibold"
            >
              Sign in
            </Button>
          </div>
        </form>

        <p className="text-center text-xs text-text-subtle pt-2 border-t border-border-subtle/50">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-medium text-text-main underline hover:opacity-80 transition"
          >
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
