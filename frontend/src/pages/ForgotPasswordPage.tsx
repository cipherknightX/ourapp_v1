import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/useAuth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { resetPasswordForEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address');
      return;
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await resetPasswordForEmail(trimmedEmail);
    setIsSubmitting(false);

    if (resetError) {
      setError(
        resetError.message || 'Failed to send reset link. Please try again.'
      );
    } else {
      setIsSuccess(true);
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
            {isSuccess
              ? 'Password reset link sent'
              : 'Forgot your password? No worries. Enter your email and I\u2019ll send you a reset link.'}
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

        {isSuccess ? (
          <div className="rounded-sm border border-border-subtle bg-surface-subtle/50 p-6 text-center space-y-4">
            <h2 className="text-sm font-medium text-text-main">
              Check your email
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              If an account exists for{' '}
              <strong className="text-text-main font-mono">{email}</strong>,
              you&apos;ll find a password reset link there.
            </p>
            <div className="pt-2">
              <Link to="/login">
                <Button variant="primary" size="md" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
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

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="w-full py-2.5 text-xs font-semibold"
              >
                Send reset link
              </Button>
            </div>
          </form>
        )}

        {!isSuccess && (
          <p className="text-center text-xs text-text-subtle pt-2 border-t border-border-subtle/50">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-medium text-text-main underline hover:opacity-80 transition"
            >
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
