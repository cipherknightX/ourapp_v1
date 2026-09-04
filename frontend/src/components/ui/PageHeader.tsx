import React, { useEffect, useRef, useState } from 'react';
import logoImg from '@/assets/logo.png';
import { Button } from './Button';

export interface PageHeaderProps {
  userEmail?: string | null;
  onSignOut: () => void;
  onToggleConnections: () => void;
  isConnected?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  userEmail,
  onSignOut,
  onToggleConnections,
  isConnected = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstDrawerBtnRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      wasOpenRef.current = true;
      // Focus first interactive control in the drawer
      const timer = setTimeout(() => {
        firstDrawerBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else if (wasOpenRef.current) {
      // Focus restored to trigger button when closing
      triggerRef.current?.focus();
      wasOpenRef.current = false;
    }
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface-bg/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 md:px-8">
        {/* Brand Unit with Logo */}
        <div className="flex items-center space-x-2.5 select-none">
          <img
            src={logoImg}
            alt="SaveThisForMe logo"
            className="h-6 w-6 rounded-sm object-contain shrink-0"
            data-testid="brand-logo"
          />
          <span className="font-serif text-lg font-medium tracking-tight text-text-main sm:text-xl">
            SaveThisForMe
          </span>
        </div>

        {/* Desktop Controls */}
        <div className="hidden items-center space-x-4 md:flex">
          <Button
            variant="subtle"
            size="sm"
            onClick={onToggleConnections}
            className="text-xs text-text-muted hover:text-text-main"
          >
            <span
              className={`mr-2 h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-status-active' : 'bg-text-subtle'
              }`}
            />
            <span>Accounts</span>
          </Button>

          {userEmail && (
            <span className="text-xs font-mono text-text-subtle max-w-[200px] truncate">
              {userEmail}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onSignOut}
            className="text-xs"
          >
            Sign out
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label="Toggle navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-border-base bg-surface-subtle text-text-main hover:bg-surface-elevated transition focus:outline-none focus:ring-1 focus:ring-border-focus"
          >
            {mobileMenuOpen ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="region"
          aria-label="Mobile navigation"
          className="border-t border-border-subtle bg-surface-panel px-6 py-4 space-y-4 md:hidden animate-in slide-in-from-top-2 duration-150"
        >
          {userEmail && (
            <div className="text-xs font-mono text-text-muted pb-1 border-b border-border-subtle/50">
              {userEmail}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button
              ref={firstDrawerBtnRef}
              variant="secondary"
              size="md"
              onClick={() => {
                onToggleConnections();
                setMobileMenuOpen(false);
              }}
              className="w-full justify-start text-xs"
            >
              <span
                className={`mr-2.5 h-1.5 w-1.5 rounded-full ${
                  isConnected ? 'bg-status-active' : 'bg-text-subtle'
                }`}
              />
              <span>Accounts</span>
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={onSignOut}
              className="w-full justify-start text-xs text-status-danger hover:bg-status-danger-bg"
            >
              Sign out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
