import { useCallback, useEffect, useState } from 'react';
import {
  type ConnectedInstagramRead,
  type PendingConnectionRead,
  createPendingInstagramConnection,
  disconnectInstagramAccount,
  getConnectedInstagramAccounts,
} from '@/lib/api';

interface ConnectedAccountsProps {
  token: string | null;
}

export function ConnectedAccounts({ token }: ConnectedAccountsProps) {
  const [connections, setConnections] = useState<ConnectedInstagramRead[]>([]);
  const [pending, setPending] = useState<PendingConnectionRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getConnectedInstagramAccounts(token);
      setConnections(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load connections'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleStartConnect = async () => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      const pendingData = await createPendingInstagramConnection(token);
      setPending(pendingData);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to start connection'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!token) return;
    setActionLoading(true);
    setError(null);
    try {
      await disconnectInstagramAccount(token, connectionId);
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-stone-800/80 bg-stone-900/60 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-stone-100">
            Instagram Connection
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Connect your Instagram account to save Reels by sending DMs to{' '}
            <span className="text-stone-200 font-mono">@save.this.for.me</span>
          </p>
        </div>
        <button
          onClick={loadConnections}
          disabled={loading || actionLoading}
          className="text-xs text-stone-400 hover:text-stone-200 underline transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-xs text-stone-500">
          Checking connected accounts...
        </div>
      ) : connections.length > 0 ? (
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950/70 p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-stone-200">
                    {conn.display_username
                      ? `@${conn.display_username}`
                      : 'Instagram Account Connected'}
                  </span>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
                <p className="text-[11px] font-mono text-stone-500">
                  ID: {conn.instagram_scoped_id}
                </p>
              </div>

              <button
                onClick={() => handleDisconnect(conn.id)}
                disabled={actionLoading}
                className="rounded-lg border border-stone-700 bg-stone-800/80 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-rose-900/30 hover:border-rose-700/50 hover:text-rose-300 transition disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ))}

          <div className="pt-2">
            <button
              onClick={handleStartConnect}
              disabled={actionLoading}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition"
            >
              + Connect another Instagram account
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-800/60 bg-stone-950/40 p-6 text-center">
          <p className="text-xs text-stone-400 mb-4">
            No Instagram account is currently linked. Connect to start saving
            Reels.
          </p>
          <button
            onClick={handleStartConnect}
            disabled={actionLoading}
            className="rounded-lg bg-stone-100 px-4 py-2 text-xs font-medium text-stone-900 hover:bg-white transition disabled:opacity-50"
          >
            {actionLoading ? 'Generating code...' : 'Connect Instagram'}
          </button>
        </div>
      )}

      {/* Pairing Modal / Drawer */}
      {pending && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Pairing Instructions
            </span>
            <button
              onClick={() => setPending(null)}
              className="text-xs text-stone-400 hover:text-stone-200"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-stone-300 mb-3">
            Send the pairing code below in a direct message (DM) to{' '}
            <strong className="text-white">@{pending.bot_username}</strong>:
          </p>

          <div className="flex items-center justify-between rounded-lg bg-stone-950 border border-stone-800 p-3 mb-4 font-mono text-sm text-emerald-400 font-bold tracking-wider">
            <span>{pending.connection_code}</span>
            <span className="text-[10px] font-sans font-normal text-stone-500">
              Expires in 15m
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={pending.dm_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-stone-950 hover:bg-emerald-400 transition"
            >
              Open Instagram DM ↗
            </a>
            <button
              onClick={loadConnections}
              className="rounded-lg border border-stone-700 bg-stone-800/80 px-3 py-1.5 text-xs font-medium text-stone-300 hover:bg-stone-700 transition"
            >
              I Sent It (Check Status)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
