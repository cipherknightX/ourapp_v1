import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
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
  const [copied, setCopied] = useState(false);

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
      setCopied(false);
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

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code.trim());
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code.trim();
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-md border border-border-subtle bg-surface-panel p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-text-main">
            Accounts
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Connect Instagram to save Reels by sending DMs to{' '}
            <span className="font-mono text-text-main">@save.this.for.me</span>
          </p>
        </div>
        <Button
          variant="subtle"
          size="sm"
          onClick={loadConnections}
          loading={loading || actionLoading}
          className="text-xs"
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-sm border border-status-danger/25 bg-status-danger-bg p-3 text-xs text-status-danger"
        >
          {error}
        </div>
      )}

      {loading && connections.length === 0 ? (
        <div className="py-4 text-center text-xs text-text-subtle">
          Checking account connections...
        </div>
      ) : connections.length > 0 ? (
        <div className="space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between rounded-sm border border-border-subtle bg-surface-subtle/40 px-4 py-3"
            >
              <div className="space-y-0.5 min-w-0 pr-3">
                <div className="flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-active shrink-0" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    Instagram
                  </span>
                </div>
                <div
                  className="text-xs font-semibold text-text-main font-mono truncate max-w-[200px] sm:max-w-xs"
                  title={
                    conn.display_username
                      ? `@${conn.display_username}`
                      : undefined
                  }
                >
                  {conn.display_username
                    ? `@${conn.display_username}`
                    : conn.instagram_scoped_id
                      ? `Instagram (••••${conn.instagram_scoped_id.slice(-4)})`
                      : 'Instagram account'}
                </div>
              </div>

              <Button
                variant="subtle"
                size="sm"
                onClick={() => handleDisconnect(conn.id)}
                disabled={actionLoading}
                aria-label={`Disconnect ${
                  conn.display_username
                    ? `@${conn.display_username}`
                    : 'Instagram account'
                }`}
                className="text-xs text-text-subtle hover:text-status-danger shrink-0"
              >
                Disconnect
              </Button>
            </div>
          ))}

          <div className="pt-1">
            <Button
              variant="subtle"
              size="sm"
              onClick={handleStartConnect}
              disabled={actionLoading}
              className="text-xs text-text-muted hover:text-text-main"
            >
              + Connect another Instagram account
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-sm border border-border-subtle bg-surface-subtle/20 p-6 text-center space-y-3">
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            No Instagram account is linked yet. Connect to start saving Reels.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartConnect}
            loading={actionLoading}
          >
            Connect Instagram
          </Button>
        </div>
      )}

      {/* Pairing Box */}
      {pending && (
        <div className="mt-4 rounded-md border border-border-base bg-surface-subtle/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium tracking-wide text-text-main">
              Pairing Instructions
            </span>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setPending(null)}
              className="h-6 w-6 p-0 text-text-subtle"
            >
              ✕
            </Button>
          </div>

          <p className="text-xs font-medium text-text-main">Almost there ♡</p>
          <p className="text-xs text-text-muted">
            Send this message to{' '}
            <strong className="text-text-main font-mono">
              @{pending.bot_username}
            </strong>
            :
          </p>

          <div className="flex items-center justify-between rounded-sm border border-border-base bg-surface-panel p-3 font-mono text-sm font-bold text-text-main">
            <span>{pending.connection_code}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopyCode(pending.connection_code)}
              className="ml-3"
            >
              {copied ? 'Copied ♡' : 'Copy'}
            </Button>
          </div>

          <p className="text-[10px] text-text-subtle">Expires in 15m</p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <a
              href={pending.dm_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-sm bg-action-primary-bg px-3.5 py-1.5 text-xs font-semibold text-action-primary-text hover:bg-action-primary-hover transition"
            >
              Open Instagram DM ↗
            </a>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadConnections}
              className="text-xs"
            >
              I sent it — Check Status
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
