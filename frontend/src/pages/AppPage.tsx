import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { fetchAuthMe } from '@/lib/api';

export function AppPage() {
  const { user, session, signOut } = useAuth();
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleTestApi = async () => {
    setApiLoading(true);
    setApiError(null);
    setApiResponse(null);

    try {
      const token = session?.access_token;
      if (!token) {
        throw new Error('No active session token found');
      }

      const data = await fetchAuthMe(token);
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top navigation bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-bold text-white">OurApp</span>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            Phase 2 Authenticated
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-xs text-slate-400 font-mono">
            {user?.email || 'Authenticated User'}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main container */}
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* User Identity Card */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-2">
            User Identity
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Authoritative identity derived from verified Supabase session token.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-1">User ID (sub)</span>
              <span className="text-emerald-400 break-all">{user?.id}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block mb-1">Email</span>
              <span className="text-slate-200">{user?.email}</span>
            </div>
          </div>
        </section>

        {/* Backend API Verification Card */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-2">
            Backend API Boundary Verification
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Test sending the authenticated JWT Bearer token to FastAPI endpoint{' '}
            <code className="text-xs text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              GET /api/v1/auth/me
            </code>
            .
          </p>

          <button
            onClick={handleTestApi}
            disabled={apiLoading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50"
          >
            {apiLoading ? 'Calling API...' : 'Test GET /api/v1/auth/me'}
          </button>

          {apiError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400"
            >
              Error: {apiError}
            </div>
          )}

          {apiResponse && (
            <div className="mt-4">
              <span className="text-xs text-slate-400 block mb-1">
                FastAPI Verified Response:
              </span>
              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                {apiResponse}
              </pre>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
