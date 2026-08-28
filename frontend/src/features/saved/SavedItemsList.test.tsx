import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedItemsList } from './SavedItemsList';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getSavedItems: vi.fn(),
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

  it('renders list of saved items with URLs and captions', async () => {
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

    render(<SavedItemsList token={token} />);

    expect(
      await screen.findByText('https://www.instagram.com/reel/C123XYZ/')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tuscan pasta guide and recipe')
    ).toBeInTheDocument();
    expect(screen.getByText('SAVED')).toBeInTheDocument();
  });
});
