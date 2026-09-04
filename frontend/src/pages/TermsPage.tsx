import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/Button';

export const TermsPage: React.FC = () => {
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

      {/* Main Terms Document Content */}
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <header className="space-y-3 border-b border-border-subtle/80 pb-6">
            <span className="font-mono text-xs text-text-subtle">
              Legal &amp; Terms
            </span>
            <h1 className="font-serif text-3xl font-normal tracking-tight text-text-main sm:text-4xl">
              Terms of Service
            </h1>
            <p className="text-xs text-text-muted">
              Last updated: September 5, 2026
            </p>
          </header>

          <div className="mt-8 space-y-8 text-xs sm:text-sm text-text-muted leading-relaxed">
            {/* 1. Using SaveThisForMe */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                1. Using SaveThisForMe
              </h2>
              <p>
                By creating an account or using SaveThisForMe, you agree to
                these Terms of Service. SaveThisForMe provides a personal visual
                archive service to help you organize and revisit Instagram Reels
                and posts that you share to our messaging integration.
              </p>
            </section>

            {/* 2. Accounts & Access */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                2. Accounts &amp; Security
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your
                login credentials and for all activity associated with your
                account. You agree to notify us immediately if you suspect any
                unauthorized access to your account.
              </p>
            </section>

            {/* 3. Instagram Connection & Content Sending */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                3. Instagram Connection &amp; Content
              </h2>
              <p>
                To save content, you pair your Instagram account via a
                verification code and send publicly available Reels or posts to{' '}
                <span className="font-mono text-text-main">
                  @save.this.for.me
                </span>
                . You agree not to use the service to transmit spam, abusive
                messages, or unauthorized content.
              </p>
            </section>

            {/* 4. Content Ownership & Embeds */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                4. Content Ownership &amp; Third-Party Rights
              </h2>
              <p>
                SaveThisForMe does not claim ownership of any content you save.
                All saved media, audio, images, and captions remain the
                intellectual property of their respective creators and are
                subject to Instagram&apos;s Terms of Use. Visual previews in
                your library are rendered using Instagram&apos;s official embed
                player.
              </p>
            </section>

            {/* 5. Service Availability */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                5. Service Availability &amp; Limitations
              </h2>
              <p>
                We strive to maintain reliable service, but availability may
                depend on third-party infrastructure (such as Meta and
                Supabase). If an original post or Reel is deleted or made
                private by its creator on Instagram, its preview may become
                unavailable.
              </p>
            </section>

            {/* 6. Account Termination */}
            <section className="space-y-2.5">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                6. Termination &amp; Item Deletion
              </h2>
              <p>
                You may discontinue use or delete individual saved items at any
                time through your library. We reserve the right to suspend or
                terminate accounts that violate these terms or engage in abusive
                activity.
              </p>
            </section>

            {/* 7. Contact */}
            <section className="space-y-2.5 border-t border-border-subtle/80 pt-6">
              <h2 className="font-serif text-lg sm:text-xl font-medium text-text-main">
                7. Contact &amp; Questions
              </h2>
              <p>
                If you have questions regarding these Terms, please contact us
                at:
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
            <Link to="/privacy" className="hover:text-text-main transition">
              Privacy
            </Link>
            <Link to="/terms" className="text-text-main font-medium">
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
