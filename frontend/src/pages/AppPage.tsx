import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useAuth } from '@/features/auth/useAuth';
import { ConnectedAccounts } from '@/features/instagram/ConnectedAccounts';
import { SavedItemsList } from '@/features/saved/SavedItemsList';

export function AppPage() {
  const { user, session, signOut } = useAuth();
  const [showConnections, setShowConnections] = useState(false);

  const token = session?.access_token || null;

  return (
    <div className="min-h-screen bg-surface-bg text-text-main flex flex-col">
      {/* Top Application Header */}
      <PageHeader
        userEmail={user?.email}
        onSignOut={() => signOut()}
        onToggleConnections={() => setShowConnections((prev) => !prev)}
        isConnected={true}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-2 py-6 sm:px-6 sm:py-8 md:px-8 space-y-8">
        {/* Accounts / Connection Setting (Collapsible) */}
        {showConnections && (
          <div className="animate-in fade-in duration-150 max-w-2xl mx-auto">
            <ConnectedAccounts token={token} />
          </div>
        )}

        {/* Main Saved Content Library */}
        <SavedItemsList token={token} />
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border-subtle/50 py-8 text-center text-xs text-text-subtle">
        <p className="font-serif italic text-text-muted">
          SaveThisForMe — the things you didn&apos;t want to lose.
        </p>
      </footer>
    </div>
  );
}
