import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/useAuth';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setIsSubmitting(false);

    if (updateError) {
      setError(
        updateError.message || 'Failed to update password. Please try again.'
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
              ? 'Your password has been changed'
              : 'Choose a new password for your account'}
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
              Password updated ♡
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Your password has been updated successfully. You can now continue
              to your library.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() =>
                  navigate(session ? '/app' : '/login', { replace: true })
                }
              >
                {session ? 'Go to my library' : 'Sign in'}
              </Button>
            </div>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-4 pt-1">
            <Input
              id="password"
              type="password"
              label="New password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              helperText="Minimum 6 characters"
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm new password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="w-full py-2.5 text-xs font-semibold"
              >
                Update password
              </Button>
            </div>
          </form>
        )}

        {!isSuccess && (
          <p className="text-center text-xs text-text-subtle pt-2 border-t border-border-subtle/50">
            Never mind?{' '}
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
