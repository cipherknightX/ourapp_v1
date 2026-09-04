import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedItemsList } from './SavedItemsList';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getSavedItems: vi.fn(),
  deleteSavedItem: vi.fn(),
  sendSavedItemToMe: vi.fn(),
}));

describe('SavedItemsList component', () => {
  const token = 'test-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when user has no saved items', async () => {
    vi.mocked(api.getSavedItems).mockResolvedValueOnce([]);

    render(<SavedItemsList token={token} />);

    expect(
      screen.getByRole('heading', { name: /Saved Library/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(/Nothing here yet/i)).toBeInTheDocument();
  });

  it('renders list of saved items with canonical View link and triggers Send to me', async () => {
    vi.mocked(api.getSavedItems).mockResolvedValueOnce([
      {
        id: 'saved-1',
        user_id: 'user-1',
        connected_instagram_id: 'conn-1',
        platform: 'instagram',
        source_url: 'https://www.instagram.com/reel/C123XYZ/',
        provider_item_id: 'C123XYZ',
        source_event_id: 'mid_1',
        caption: 'Tuscan pasta guide and recipe',
        creator_username: null,
        thumbnail_url: null,
        processing_status: 'SAVED',
        raw_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(api.sendSavedItemToMe).mockResolvedValueOnce({
      status: 'sent',
      message: 'Saved item sent to your Instagram DM',
    });

    render(<SavedItemsList token={token} />);

    // Embed container
    const embedContainer = await screen.findByTestId(
      'instagram-embed-container'
    );
    expect(embedContainer).toBeInTheDocument();

    // View action
    const viewLink = await screen.findByRole('link', { name: /View ↗/i });
    expect(viewLink).toHaveAttribute(
      'href',
      'https://www.instagram.com/reel/C123XYZ/'
    );

    // Send to me action
    const sendBtn = screen.getByRole('button', { name: /Send to me/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.sendSavedItemToMe).toHaveBeenCalledWith(token, 'saved-1');
    });
    expect(await screen.findByText('Sent ♡')).toBeInTheDocument();
  });

  it('handles item deletion with inline confirmation', async () => {
    vi.mocked(api.getSavedItems).mockResolvedValueOnce([
      {
        id: 'saved-to-delete',
        user_id: 'user-1',
        connected_instagram_id: 'conn-1',
        platform: 'instagram',
        source_url: 'https://www.instagram.com/reel/DeleteMe123/',
        provider_item_id: 'DeleteMe123',
        source_event_id: 'mid_del',
        caption: 'Temporary reel',
        creator_username: null,
        thumbnail_url: null,
        processing_status: 'SAVED',
        raw_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(api.deleteSavedItem).mockResolvedValueOnce();

    render(<SavedItemsList token={token} />);

    const deleteBtn = await screen.findByRole('button', { name: /Delete/i });
    fireEvent.click(deleteBtn);

    // Confirm button appears
    const confirmBtn = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deleteSavedItem).toHaveBeenCalledWith(
        token,
        'saved-to-delete'
      );
    });

    // Item should be removed from view
    await waitFor(() => {
      expect(screen.queryByText('Temporary reel')).not.toBeInTheDocument();
    });
  });

  it('renders generic fallback when source_url is not canonical', async () => {
    vi.mocked(api.getSavedItems).mockResolvedValueOnce([
      {
        id: 'saved-cdn',
        user_id: 'user-1',
        connected_instagram_id: 'conn-1',
        platform: 'instagram',
        source_url:
          'https://lookaside.fbsbx.com/ig_messaging_cdn/?asset_id=123',
        provider_item_id: null,
        source_event_id: 'mid_cdn',
        caption: 'Shared photo',
        creator_username: null,
        thumbnail_url: null,
        processing_status: 'SAVED',
        raw_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    render(<SavedItemsList token={token} />);

    expect(await screen.findByText('Preview unavailable')).toBeInTheDocument();
    expect(screen.getByText('Open this on Instagram')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /View ↗/i })
    ).not.toBeInTheDocument();
  });

  it('renders visual item with decoupled edge-to-edge media and editorial content container', async () => {
    vi.mocked(api.getSavedItems).mockResolvedValueOnce([
      {
        id: 'saved-layout-test',
        user_id: 'user-1',
        connected_instagram_id: 'conn-1',
        platform: 'instagram',
        source_url: 'https://www.instagram.com/reel/Layout123/',
        provider_item_id: 'Layout123',
        source_event_id: 'mid_layout',
        caption: 'Architecture design showcase',
        creator_username: null,
        thumbnail_url: null,
        processing_status: 'SAVED',
        raw_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    render(<SavedItemsList token={token} />);

    const article = await screen.findByRole('article');
    expect(article).toHaveClass('overflow-hidden');
    expect(article).not.toHaveClass('p-4');

    // Instagram embed container exists within article
    const embedContainer = screen.getByTestId('instagram-embed-container');
    expect(article).toContainElement(embedContainer);

    // Caption exists
    expect(
      screen.getAllByText('Architecture design showcase').length
    ).toBeGreaterThanOrEqual(1);

    // Action bar items all exist
    expect(screen.getByRole('link', { name: /View ↗/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Send to me/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });
});
