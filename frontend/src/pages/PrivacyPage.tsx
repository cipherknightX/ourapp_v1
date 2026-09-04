import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/Button';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-bg text-text-main flex flex-col selection:bg-surface-subtle">
      {/* Navigation Header */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 md:px-8">
          <Link
            to="/"
            className="flex items-center space-x-2.5 select-none hover:opacity-90 transition"
            aria-label="SaveThisForMe Home"
          >
            <img
              src={logoImg}
              alt="SaveThisForMe logo"
              className="h-6 w-6 rounded-sm object-contain shrink-0"
              data-testid="brand-logo"
            />
            <span className="font-serif text-lg font-medium tracking-tight text-text-main sm:text-xl">
              SaveThisForMe
            </span>
          </Link>

          <nav className="flex items-center space-x-2 sm:space-x-3">
            <Link to="/">
              <Button
                variant="subtle"
                size="sm"
                className="text-xs text-text-muted hover:text-text-main"
              >
                ← Home
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="subtle"
                size="sm"
                className="text-xs text-text-muted hover:text-text-main"
              >
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" className="text-xs">
                Create account
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Privacy Document Content */}
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <header className="space-y-3 border-b border-border-subtle/80 pb-6">
            <span className="font-mono text-xs text-text-subtle">
              Legal &amp; Privacy
            </span>
            <h1 className="font-serif text-3xl font-normal tracking-tight text-text-main sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="text-xs text-text-muted">
              Last updated: September 5, 2026
            </p>
          </header>

          <div className="mt-8 space-y-8 text-xs sm:text-sm text-text-muted leading-relaxed">
            {/* 1. Overview */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                1. What SaveThisForMe Is
              </h2>
              <p>
                SaveThisForMe is a personal visual archive service that allows
                you to keep and revisit Instagram Reels and posts that you send
                to{' '}
                <span className="font-mono text-text-main">
                  @save.this.for.me
                </span>
                . This Privacy Policy explains how information is collected,
                stored, and used when you interact with our website and
                messaging integration.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section className="space-y-3">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                2. Information We Collect
              </h2>
              <p>
                We collect only the information necessary to provide the archive
                service:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
                <li>
                  <strong className="text-text-main">
                    Account Information:
                  </strong>{' '}
                  When you sign up, we store your email address and encrypted
                  password managed through Supabase Authentication.
                </li>
                <li>
                  <strong className="text-text-main">
                    Instagram Connection:
                  </strong>{' '}
                  When you pair your Instagram account via a verification code,
                  we associate your Instagram-scoped user ID and optional
                  username with your account. We do not collect or request your
                  Instagram password.
                </li>
                <li>
                  <strong className="text-text-main">Saved Content:</strong>{' '}
                  When you send a message or shared Reel to @save.this.for.me,
                  our webhook records the canonical Instagram URL, caption,
                  timestamp, and platform identifier.
                </li>
              </ul>
            </section>

            {/* 3. How We Use Information */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                3. How Information Is Used
              </h2>
              <p>Your information is used strictly to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
                <li>
                  Display your saved Reels and posts in your personal library.
                </li>
                <li>
                  Enable the &ldquo;Send to me&rdquo; feature to deliver saved
                  items back to your Instagram DMs upon your request.
                </li>
                <li>
                  Authenticate your login sessions and secure your account.
                </li>
              </ul>
            </section>

            {/* 4. Third-Party Services */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                4. Third-Party Services
              </h2>
              <p>
                SaveThisForMe relies on the following infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-text-muted">
                <li>
                  <strong className="text-text-main">Supabase:</strong> For
                  secure authentication and database persistence.
                </li>
                <li>
                  <strong className="text-text-main">
                    Meta / Instagram Platform:
                  </strong>{' '}
                  Webhook ingestion and official client-side embeds (
                  <span className="font-mono text-[11px]">embed.js</span>) to
                  display public Reels and posts.
                </li>
              </ul>
            </section>

            {/* 5. Data Storage & Deletion */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                5. Data Storage, Retention &amp; Deletion
              </h2>
              <p>
                Your saved items are retained in your private library as long as
                your account exists. You can delete individual saved items at
                any time directly in your library, which permanently removes the
                item record from the database.
              </p>
            </section>

            {/* 6. Contact & Support */}
            <section className="space-y-2.5 border-t border-border-subtle/80 pt-6">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                6. Contact &amp; Questions
              </h2>
              <p>
                If you have questions about this Privacy Policy or your data,
                please contact us at:
              </p>
              <p>
                <a
                  href="mailto:savethisforme.inbox@gmail.com"
                  className="font-mono text-text-main underline hover:text-text-muted transition"
                >
                  savethisforme.inbox@gmail.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface-bg/80 py-8 text-xs text-text-muted">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 md:px-8">
          <div className="flex items-center space-x-2.5">
            <img
              src={logoImg}
              alt="SaveThisForMe logo"
              className="h-5 w-5 rounded-xs object-contain"
            />
            <span className="font-serif text-sm font-medium text-text-main">
              SaveThisForMe
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a
              href="https://www.instagram.com/save.this.for.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-main transition"
            >
              Instagram ↗
            </a>
            <a
              href="mailto:savethisforme.inbox@gmail.com"
              className="hover:text-text-main transition"
            >
              Support
            </a>
            <Link to="/privacy" className="text-text-main font-medium">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-text-main transition">
              Terms
            </Link>
            <Link to="/login" className="hover:text-text-main transition">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
