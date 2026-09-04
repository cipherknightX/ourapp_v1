import React, { useEffect, useRef, useState } from 'react';
import {
  isCanonicalInstagramUrl,
  loadInstagramEmbedScript,
} from '@/lib/instagram';

interface InstagramEmbedProps {
  url: string;
  caption?: string | null;
}

export const InstagramEmbed: React.FC<InstagramEmbedProps> = ({
  url,
  caption,
}) => {
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isValid = isCanonicalInstagramUrl(url);

  useEffect(() => {
    if (!isValid) return;

    let isMounted = true;

    loadInstagramEmbedScript()
      .then(() => {
        if (!isMounted) return;
        try {
          if (window.instgrm?.Embeds?.process) {
            window.instgrm.Embeds.process();
          }
        } catch {
          if (isMounted) {
            setLoadError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url, isValid]);

  if (!isValid) {
    return null;
  }

  if (loadError) {
    return (
      <div className="my-2 rounded-sm border border-border-subtle bg-surface-subtle/40 p-3 text-xs text-text-muted">
        <span>Preview unavailable. </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-main underline hover:opacity-80 transition"
        >
          Open this on Instagram ↗
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex w-full justify-center overflow-hidden bg-surface-subtle/20 max-w-[540px] mx-auto"
      data-testid="instagram-embed-container"
    >
      <blockquote
        className="instagram-media w-full"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: 'transparent',
          border: 0,
          borderRadius: '12px',
          margin: '0 auto',
          maxWidth: '540px',
          minWidth: 'min(100%, 326px)',
          padding: 0,
          width: '100%',
        }}
      >
        <div className="p-4 text-xs text-text-subtle">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-text-main transition"
          >
            {caption || 'View on Instagram'}
          </a>
        </div>
      </blockquote>
    </div>
  );
};
