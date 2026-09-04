declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

const CANONICAL_IG_REGEX =
  /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|reels|p|tv)\/[A-Za-z0-9_-]+/i;

export function isCanonicalInstagramUrl(
  url: string | null | undefined
): boolean {
  if (!url) return false;
  return CANONICAL_IG_REGEX.test(url.trim());
}

let instagramScriptPromise: Promise<void> | null = null;

/**
 * Concurrency-safe loader for official Instagram embed script.
 * Uses a single shared Promise so multiple mounting components share the same script tag.
 */
export function loadInstagramEmbedScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.instgrm?.Embeds?.process) {
    return Promise.resolve();
  }

  if (instagramScriptPromise) {
    return instagramScriptPromise;
  }

  instagramScriptPromise = new Promise<void>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.instagram.com/embed.js"]'
    );

    if (existingScript) {
      if (window.instgrm?.Embeds?.process) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });
        existingScript.addEventListener('error', () => resolve(), {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.instagram.com/embed.js';
    script.onload = () => resolve();
    script.onerror = () => {
      // Resolve cleanly even on failure so component doesn't crash
      resolve();
    };
    document.head.appendChild(script);
  });

  return instagramScriptPromise;
}
