import { useCallback, useEffect, useState } from 'react';
import { type SavedItemRead, getSavedItems } from '@/lib/api';

interface SavedItemsListProps {
  token: string | null;
}

export function SavedItemsList({ token }: SavedItemsListProps) {
  const [items, setItems] = useState<SavedItemRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          {items.map((item) => (
            <article key={item.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-stone-200 hover:text-emerald-400 transition underline line-clamp-1"
                  >
                    {item.source_url}
                  </a>
                  {item.caption && (
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

                <div className="shrink-0">
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                    {item.processing_status}
                  </span>
                </div>
              </div>
            </article>
          ))}
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
