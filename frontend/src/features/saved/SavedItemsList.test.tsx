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
      screen.getByRole('heading', { name: /Captured Reels/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(/No saved Reels yet/i)).toBeInTheDocument();
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

  it('renders "Source unavailable" when source_url is not canonical', async () => {
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

    expect(
      await screen.findByText('Source unavailable (media asset)')
    ).toBeInTheDocument();
    expect(screen.getByText('Source unavailable')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /View ↗/i })
    ).not.toBeInTheDocument();
  });
});
