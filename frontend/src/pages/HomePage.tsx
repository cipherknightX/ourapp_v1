import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Button } from '@/components/ui/Button';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-surface-bg text-text-main flex flex-col selection:bg-surface-subtle">
      {/* 1. Public Navigation Header */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-bg/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 md:px-8">
          {/* Brand Unit */}
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

          {/* Navigation Actions */}
          <nav className="flex items-center space-x-2 sm:space-x-3">
            <a
              href="https://www.instagram.com/save.this.for.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center text-xs font-medium text-text-muted hover:text-text-main transition px-2 py-1"
            >
              See us on Instagram ↗
            </a>
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

      {/* Main Landing Flow */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <section className="mx-auto max-w-4xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20 sm:pb-16 text-center">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h1 className="font-serif text-3xl font-normal tracking-tight text-text-main sm:text-5xl sm:leading-[1.15]">
              For the things worth{' '}
              <span className="whitespace-nowrap">coming back to.</span>
            </h1>
            <p className="font-serif italic text-base sm:text-lg text-text-muted">
              Save it now. Find it later ♡
            </p>
            <p className="text-sm leading-relaxed text-text-muted sm:text-base max-w-lg mx-auto">
              Send a Reel to{' '}
              <span className="font-mono font-medium text-text-main">
                @save.this.for.me
              </span>{' '}
              and we&apos;ll remember it for you in your private visual library.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button
                variant="primary"
                size="md"
                className="px-5 py-2 text-xs sm:text-sm font-medium"
              >
                Start saving
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="secondary"
                size="md"
                className="px-4 py-2 text-xs sm:text-sm font-medium"
              >
                See how it works
              </Button>
            </a>
          </div>
        </section>

        {/* 3. Product Demo Video Placeholder */}
        <section
          id="demo"
          className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 sm:pb-24"
          aria-label="Product demo preview"
        >
          <div className="overflow-hidden rounded-md border border-border-subtle bg-surface-panel shadow-sm">
            <div
              className="relative aspect-video w-full bg-surface-subtle/30 flex items-center justify-center"
              data-testid="demo-video-placeholder"
            >
              <video
                controls
                playsInline
                preload="none"
                aria-label="SaveThisForMe product walkthrough demo"
                className="h-full w-full object-cover"
              >
                <source
                  src="/demo/save-this-for-me-demo.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>

              {/* Minimal preview fallback overlay before video playback begins */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-surface-subtle/20">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-surface-panel/90 text-text-main shadow-xs">
                  <svg
                    className="h-4 w-4 translate-x-0.5 text-text-main fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="font-serif text-sm font-medium text-text-main sm:text-base">
                  Product Walkthrough Demo
                </p>
                <p className="mt-1 max-w-xs text-xs text-text-muted">
                  See how Reels sent in Instagram DMs arrive automatically in
                  your library.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. How It Works Section */}
        <section
          id="how-it-works"
          className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20 border-t border-border-subtle/60"
        >
          <div className="text-center space-y-2 max-w-md mx-auto">
            <h2 className="font-serif text-2xl font-normal tracking-tight text-text-main sm:text-3xl">
              How it works
            </h2>
            <p className="text-xs text-text-muted sm:text-sm leading-relaxed">
              Three quiet steps to keep what inspires you without extra apps or
              complicated folders.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {/* Step 1 */}
            <div className="rounded-md border border-border-subtle/80 bg-surface-panel p-5 sm:p-6 space-y-2.5">
              <span className="font-mono text-xs text-text-subtle font-medium">
                01 — Connect
              </span>
              <h3 className="font-serif text-base font-medium text-text-main sm:text-lg">
                Connect your account
              </h3>
              <p className="text-xs leading-relaxed text-text-muted sm:text-sm">
                Pair your Instagram once with a quick verification code. No
                passwords required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-md border border-border-subtle/80 bg-surface-panel p-5 sm:p-6 space-y-2.5">
              <span className="font-mono text-xs text-text-subtle font-medium">
                02 — Send
              </span>
              <h3 className="font-serif text-base font-medium text-text-main sm:text-lg">
                Send as you scroll
              </h3>
              <p className="text-xs leading-relaxed text-text-muted sm:text-sm">
                Whenever you find a Reel worth keeping, share it to{' '}
                <span className="font-mono text-text-main">
                  @save.this.for.me
                </span>{' '}
                in your DMs.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-md border border-border-subtle/80 bg-surface-panel p-5 sm:p-6 space-y-2.5">
              <span className="font-mono text-xs text-text-subtle font-medium">
                03 — Remember
              </span>
              <h3 className="font-serif text-base font-medium text-text-main sm:text-lg">
                Revisit whenever you need
              </h3>
              <p className="text-xs leading-relaxed text-text-muted sm:text-sm">
                Come back to your calm visual archive to watch, search, or send
                items back to your Instagram.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Trust / Connection Section */}
        <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14 text-center border-t border-border-subtle/60 space-y-2.5">
          <h2 className="font-serif text-xl sm:text-2xl font-normal tracking-tight text-text-main">
            Your connection, kept simple.
          </h2>
          <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Your Instagram connection is used to receive and save the Reels you
            send to{' '}
            <span className="font-mono text-text-main">@save.this.for.me</span>.
          </p>
        </section>

        {/* 6. Product Philosophy Section */}
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 text-center border-t border-border-subtle/60 space-y-2">
          <blockquote className="font-serif text-lg font-normal italic text-text-main sm:text-2xl leading-relaxed max-w-xl mx-auto">
            &ldquo;No downloading. No folders. Just send it.&rdquo;
          </blockquote>
          <p className="text-xs text-text-muted sm:text-sm max-w-md mx-auto leading-relaxed">
            Built for the things you didn&apos;t want to lose — preserved
            quietly in one visual place.
          </p>
        </section>

        {/* 7. Understated Bottom CTA */}
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20 text-center border-t border-border-subtle/60 space-y-4">
          <h2 className="font-serif text-2xl font-normal tracking-tight text-text-main sm:text-3xl">
            Ready to keep what matters?
          </h2>
          <p className="text-xs text-text-muted sm:text-sm max-w-md mx-auto">
            Create your account in seconds and start saving content from
            Instagram today.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button
                variant="primary"
                size="md"
                className="px-5 py-2 text-xs sm:text-sm font-medium"
              >
                Start saving
              </Button>
            </Link>
            <a
              href="https://www.instagram.com/save.this.for.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium text-text-muted hover:text-text-main transition px-3 py-2"
            >
              See us on Instagram ↗
            </a>
          </div>
        </section>
      </main>

      {/* 8. Refined Product Footer */}
      <footer className="border-t border-border-subtle bg-surface-bg/80 py-10 text-xs text-text-muted">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 md:px-8">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2.5">
              <img
                src={logoImg}
                alt="SaveThisForMe logo"
                className="h-5 w-5 rounded-xs object-contain"
              />
              <span className="font-serif text-sm font-medium text-text-main">
                SaveThisForMe
              </span>
            </div>
            <p className="font-serif italic text-text-muted text-xs">
              For the things worth coming back to. Save it now. Find it later ♡
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
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
            <Link to="/terms" className="hover:text-text-main transition">
              Terms
            </Link>
            <Link to="/login" className="hover:text-text-main transition">
              Sign in
            </Link>
            <Link to="/signup" className="hover:text-text-main transition">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
