import { useCallback, useEffect, useState } from 'react';
import { InstagramEmbed } from '@/components/embeds/InstagramEmbed';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  type SavedItemRead,
  deleteSavedItem,
  getSavedItems,
  sendSavedItemToMe,
} from '@/lib/api';
import { isCanonicalInstagramUrl } from '@/lib/instagram';

interface SavedItemsListProps {
  token: string | null;
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
      setSendingId(null);
    }
  };

  return (
    <section className="space-y-6 max-w-2xl mx-auto w-full">
      {/* Library Header */}
      <div className="flex items-baseline justify-between border-b border-border-subtle pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal tracking-tight text-text-main sm:text-3xl">
            Saved Library
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {items.length > 0
              ? `${items.length} ${items.length === 1 ? 'thing' : 'things'} you've kept`
              : 'The things you didn\u2019t want to lose.'}
          </p>
        </div>
        <Button
          variant="subtle"
          size="sm"
          onClick={loadItems}
          loading={loading}
          className="text-xs text-text-muted hover:text-text-main"
        >
          Refresh
        </Button>
      </div>

      {error && (
        <ErrorState
          title="Couldn't load your library"
          description={error}
          onRetry={loadItems}
        />
      )}

      {loading && items.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-md border border-border-subtle bg-surface-panel p-6 space-y-4">
            <Skeleton className="h-80 w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="rounded-md border border-border-subtle bg-surface-panel p-6 space-y-4">
            <Skeleton className="h-80 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-8">
          {items.map((item) => {
            const hasCanonicalUrl = isCanonicalInstagramUrl(item.source_url);
            const isDeleting = deletingId === item.id;
            const isSending = sendingId === item.id;
            const feedbackText = sentFeedback[item.id];
            const isConfirming = confirmDeleteId === item.id;

            // Presentation A: Visual Items (with canonical URL & embed)
            if (hasCanonicalUrl) {
              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-md border border-border-subtle bg-surface-panel transition hover:border-border-base"
                >
                  {/* 1. Media Preview (edge-to-edge within card) */}
                  <InstagramEmbed
                    url={item.source_url}
                    caption={item.caption}
                  />

                  {/* 2. Content Container with comfortable editorial padding */}
                  <div className="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 space-y-3">
                    {/* Caption */}
                    {item.caption && (
                      <p className="text-xs leading-relaxed text-text-main sm:text-sm">
                        {item.caption}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center space-x-2 text-[11px] text-text-subtle font-mono">
                      <span className="capitalize text-text-muted">
                        {item.platform}
                      </span>
                      <span>•</span>
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </time>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border-subtle/50 pt-3">
                      <div className="flex items-center space-x-3">
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs font-medium text-text-main hover:text-text-muted transition"
                        >
                          View ↗
                        </a>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSendToMe(item.id)}
                          disabled={isSending}
                          className="text-xs"
                        >
                          {isSending
                            ? 'Sending...'
                            : feedbackText || 'Send to me'}
                        </Button>
                      </div>

                      <div>
                        {isConfirming ? (
                          <div className="flex items-center space-x-1.5">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              loading={isDeleting}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="subtle"
                              size="sm"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              aria-label="Cancel deletion"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => setConfirmDeleteId(item.id)}
                            disabled={isDeleting}
                            className="text-text-subtle hover:text-status-danger text-xs hover:bg-status-danger-bg/30 transition"
                            aria-label="Delete saved item"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            // Presentation B: Fallback / Text-Only Items (compact editorial, no large empty media box)
            return (
              <article
                key={item.id}
                className="rounded-md border border-border-subtle bg-surface-panel p-4 sm:p-6 transition hover:border-border-base space-y-3"
              >
                <div className="flex items-center space-x-2 text-[11px] text-text-subtle font-mono">
                  <span className="capitalize text-text-muted">
                    {item.platform}
                  </span>
                  <span>•</span>
                  <time dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>

                {item.caption ? (
                  <p className="text-xs leading-relaxed text-text-main sm:text-sm">
                    {item.caption}
                  </p>
                ) : (
                  <p className="text-xs italic text-text-subtle">
                    (No caption provided)
                  </p>
                )}

                <div className="rounded-sm border border-border-subtle bg-surface-subtle/30 px-3.5 py-2 text-xs text-text-muted flex items-center justify-between">
                  <span>Preview unavailable</span>
                  <span className="text-[11px] text-text-subtle">
                    Open this on Instagram
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-border-subtle/50 pt-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-[11px] text-text-subtle">
                      Source unavailable
                    </span>
                  </div>

                  <div>
                    {isConfirming ? (
                      <div className="flex items-center space-x-1.5">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          loading={isDeleting}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={isDeleting}
                          aria-label="Cancel deletion"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => setConfirmDeleteId(item.id)}
                        disabled={isDeleting}
                        className="text-text-subtle hover:text-status-danger text-xs hover:bg-status-danger-bg/30 transition"
                        aria-label="Delete saved item"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State: Integrated typographical composition */
        <div className="py-20 text-center space-y-2">
          <h3 className="font-serif text-xl font-normal text-text-main tracking-tight sm:text-2xl">
            Nothing here yet.
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
            Send a Reel to{' '}
            <span className="font-mono text-text-main">@save.this.for.me</span>{' '}
            and it&apos;ll show up here ♡
          </p>
        </div>
      )}
    </section>
  );
}
