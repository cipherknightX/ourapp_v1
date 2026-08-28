import { useCallback, useEffect, useState } from 'react';
import {
  type SavedItemRead,
  deleteSavedItem,
  getSavedItems,
  sendSavedItemToMe,
} from '@/lib/api';

interface SavedItemsListProps {
  token: string | null;
}

const CANONICAL_IG_REGEX =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+/i;

function isCanonicalInstagramUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return CANONICAL_IG_REGEX.test(url);
}

export function SavedItemsList({ token }: SavedItemsListProps) {
  const [items, setItems] = useState<SavedItemRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-item action state tracking
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentFeedback, setSentFeedback] = useState<Record<string, string>>({});

  const loadItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSavedItems(token);
      setItems(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load saved items'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (itemId: string) => {
    if (!token) return;
    setDeletingId(itemId);
    setError(null);
    try {
      await deleteSavedItem(token, itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSendToMe = async (itemId: string) => {
    if (!token) return;
    setSendingId(itemId);
    setError(null);
    try {
      await sendSavedItemToMe(token, itemId);
      setSentFeedback((prev) => ({ ...prev, [itemId]: 'Sent ♡' }));
      setTimeout(() => {
        setSentFeedback((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }, 3000);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to send item to Instagram'
      );
    } finally {
      setSendingId(false as unknown as null);
    }
  };

  return (
    <section className="rounded-2xl border border-stone-800/80 bg-stone-900/60 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight text-stone-100">
            Captured Reels
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Durable source archive of Reels sent via DM to SaveThisForMe
          </p>
        </div>
        <button
          onClick={loadItems}
          disabled={loading}
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
        <div className="py-8 text-center text-xs text-stone-500">
          Loading your captured items...
        </div>
      ) : items.length > 0 ? (
        <div className="divide-y divide-stone-800/60">
          {items.map((item) => {
            const hasCanonicalUrl = isCanonicalInstagramUrl(item.source_url);
            const isDeleting = deletingId === item.id;
            const isSending = sendingId === item.id;
            const feedbackText = sentFeedback[item.id];
            const isConfirming = confirmDeleteId === item.id;

            return (
              <article key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 max-w-[70%]">
                    {hasCanonicalUrl ? (
                      <span className="text-xs font-semibold text-stone-200 line-clamp-1">
                        {item.caption || 'Instagram Reel'}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400 italic">
                        Source unavailable (media asset)
                      </span>
                    )}

                    {item.caption && hasCanonicalUrl && (
                      <p className="text-xs text-stone-400 line-clamp-2">
                        {item.caption}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 text-[10px] text-stone-500 pt-1">
                      <span className="capitalize">{item.platform}</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {/* View Action */}
                    {hasCanonicalUrl ? (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-stone-700 bg-stone-800/80 px-2.5 py-1 text-xs font-medium text-stone-300 hover:bg-stone-700 hover:text-white transition"
                      >
                        View ↗
                      </a>
                    ) : (
                      <span className="px-2 py-1 text-[11px] text-stone-500 select-none">
                        Source unavailable
                      </span>
                    )}

                    {/* Send to me Action */}
                    {hasCanonicalUrl && (
                      <button
                        onClick={() => handleSendToMe(item.id)}
                        disabled={isSending}
                        className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-900/40 transition disabled:opacity-50"
                      >
                        {isSending
                          ? 'Sending...'
                          : feedbackText || 'Send to me'}
                      </button>
                    )}

                    {/* Delete Action with inline confirmation */}
                    {isConfirming ? (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          className="rounded-lg border border-stone-700 px-1.5 py-1 text-xs text-stone-400 hover:text-stone-200 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        disabled={isDeleting}
                        className="rounded-lg border border-stone-700 bg-stone-800/80 px-2.5 py-1 text-xs font-medium text-stone-400 hover:border-rose-700/50 hover:bg-rose-900/20 hover:text-rose-300 transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-stone-800/60 bg-stone-950/40 p-8 text-center">
          <p className="text-xs text-stone-400">
            No saved Reels yet. Connect your Instagram account and DM a Reel to{' '}
            <span className="text-stone-300 font-mono">@save.this.for.me</span>.
          </p>
        </div>
      )}
    </section>
  );
}
