import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { ConnectedAccounts } from '@/features/instagram/ConnectedAccounts';
import { SavedItemsList } from '@/features/saved/SavedItemsList';
import { fetchAuthMe } from '@/lib/api';

export function AppPage() {
  const { user, session, signOut } = useAuth();
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const token = session?.access_token || null;

  const handleTestApi = async () => {
    if (!token) return;
    setApiLoading(true);
    setApiError(null);
    setApiResponse(null);

    try {
      const data = await fetchAuthMe(token);
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <header className="border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold tracking-tight text-white">
            SaveThisForMe
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Instagram Capture Ready
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs text-stone-400 font-mono">
            {user?.email || 'Authenticated User'}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-stone-700 bg-stone-800/80 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-700 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Instagram Connection Section */}
        <ConnectedAccounts token={token} />

        {/* Captured Reels Library Section */}
        <SavedItemsList token={token} />

        {/* Backend API Boundary Verification Card */}
        <section className="rounded-2xl border border-stone-800/60 bg-stone-900/30 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-stone-300 mb-1">
            Backend API Boundary Verification
          </h2>
          <p className="text-xs text-stone-500 mb-3">
            Verify authenticated session against FastAPI endpoint{' '}
            <code className="text-[11px] text-emerald-400 bg-stone-950 px-1 py-0.5 rounded border border-stone-800">
              GET /api/v1/auth/me
            </code>
          </p>

          <button
            onClick={handleTestApi}
            disabled={apiLoading || !token}
            className="rounded-lg border border-stone-700 bg-stone-800/90 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-700 transition disabled:opacity-50"
          >
            {apiLoading ? 'Calling API...' : 'Test GET /api/v1/auth/me'}
          </button>

          {apiError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
            >
              Error: {apiError}
            </div>
          )}

          {apiResponse && (
            <div className="mt-3">
              <pre className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                {apiResponse}
              </pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
