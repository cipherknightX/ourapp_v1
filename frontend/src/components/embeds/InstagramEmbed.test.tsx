import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstagramEmbed } from './InstagramEmbed';
import { isCanonicalInstagramUrl } from '@/lib/instagram';

describe('InstagramEmbed component', () => {
  beforeEach(() => {
    // Reset document head and window.instgrm
    document.head.innerHTML = '';
    delete (window as unknown as { instgrm?: unknown }).instgrm;
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.head.innerHTML = '';
    delete (window as unknown as { instgrm?: unknown }).instgrm;
  });

  it('validates canonical Instagram URLs accurately', () => {
    expect(
      isCanonicalInstagramUrl('https://www.instagram.com/reel/DcX1J_BB-nd/')
    ).toBe(true);
    expect(
      isCanonicalInstagramUrl('https://instagram.com/p/Dclpx6-o60q/')
    ).toBe(true);
    expect(
      isCanonicalInstagramUrl('https://www.instagram.com/tv/Dclpx6-o60q')
    ).toBe(true);

    // Non-canonical / CDN URLs
    expect(
      isCanonicalInstagramUrl(
        'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=123'
      )
    ).toBe(false);
    expect(isCanonicalInstagramUrl('https://youtube.com/watch?v=123')).toBe(
      false
    );
    expect(isCanonicalInstagramUrl('')).toBe(false);
    expect(isCanonicalInstagramUrl(null)).toBe(false);
  });

  it('renders blockquote placeholder for canonical Reel URL and invokes process()', async () => {
    const processMock = vi.fn();
    window.instgrm = {
      Embeds: {
        process: processMock,
      },
    };

    render(
      <InstagramEmbed
        url="https://www.instagram.com/reel/DcX1J_BB-nd/"
        caption="Sample Reel"
      />
    );

    const container = screen.getByTestId('instagram-embed-container');
    expect(container).toBeInTheDocument();

    const blockquote = container.querySelector('blockquote.instagram-media');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveAttribute(
      'data-instgrm-permalink',
      'https://www.instagram.com/reel/DcX1J_BB-nd/'
    );

    await waitFor(() => {
      expect(processMock).toHaveBeenCalled();
    });
  });

  it('renders blockquote placeholder for canonical Post URL', async () => {
    const processMock = vi.fn();
    window.instgrm = {
      Embeds: {
        process: processMock,
      },
    };

    render(
      <InstagramEmbed
        url="https://www.instagram.com/p/Dclpx6-o60q/"
        caption="Sample Post"
      />
    );

    const container = screen.getByTestId('instagram-embed-container');
    expect(container).toBeInTheDocument();

    const blockquote = container.querySelector('blockquote.instagram-media');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveAttribute(
      'data-instgrm-permalink',
      'https://www.instagram.com/p/Dclpx6-o60q/'
    );

    await waitFor(() => {
      expect(processMock).toHaveBeenCalled();
    });
  });

  it('returns null for non-canonical URLs and does not inject script', () => {
    const { container } = render(
      <InstagramEmbed url="https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=123" />
    );

    expect(container.firstChild).toBeNull();
    expect(
      document.querySelector('script[src="https://www.instagram.com/embed.js"]')
    ).toBeNull();
  });

  it('shares single script loader promise across multiple concurrent mounts', async () => {
    render(
      <div>
        <InstagramEmbed url="https://www.instagram.com/reel/Reel1/" />
        <InstagramEmbed url="https://www.instagram.com/reel/Reel2/" />
      </div>
    );

    const scripts = document.querySelectorAll(
      'script[src="https://www.instagram.com/embed.js"]'
    );
    expect(scripts.length).toBe(1);
  });

  it('configures embed wrapper for fluid responsive sizing and centered alignment', () => {
    render(
      <InstagramEmbed
        url="https://www.instagram.com/reel/ResponsiveReel123/"
        caption="Responsive Test"
      />
    );

    const container = screen.getByTestId('instagram-embed-container');
    expect(container).toHaveClass(
      'w-full',
      'overflow-hidden',
      'max-w-[540px]',
      'mx-auto'
    );

    const blockquote = container.querySelector('blockquote.instagram-media');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveStyle({
      maxWidth: '540px',
      minWidth: 'min(100%, 326px)',
      width: '100%',
    });
  });
});
