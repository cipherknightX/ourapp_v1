import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectedAccounts } from './ConnectedAccounts';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  getConnectedInstagramAccounts: vi.fn(),
  createPendingInstagramConnection: vi.fn(),
  disconnectInstagramAccount: vi.fn(),
}));

describe('ConnectedAccounts component', () => {
  const token = 'test-jwt-token';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty disconnected state when user has no connected accounts', async () => {
    vi.mocked(api.getConnectedInstagramAccounts).mockResolvedValueOnce([]);

    render(<ConnectedAccounts token={token} />);

    expect(
      screen.getByRole('heading', { name: /Instagram Connection/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No Instagram account is currently linked/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Connect Instagram/i })
    ).toBeInTheDocument();
  });

  it('triggers connection code generation and displays pairing code', async () => {
    vi.mocked(api.getConnectedInstagramAccounts).mockResolvedValueOnce([]);
    vi.mocked(api.createPendingInstagramConnection).mockResolvedValueOnce({
      id: 'pending-1',
      user_id: 'user-1',
      connection_code: 'CONNECT-ABCD12',
      bot_username: 'save.this.for.me',
      dm_link: 'https://ig.me/m/save.this.for.me?text=CONNECT-ABCD12',
      expires_at: new Date(Date.now() + 900000).toISOString(),
      created_at: new Date().toISOString(),
    });

    render(<ConnectedAccounts token={token} />);

    const connectButton = await screen.findByRole('button', {
      name: /Connect Instagram/i,
    });
    fireEvent.click(connectButton);

    expect(await screen.findByText('CONNECT-ABCD12')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open Instagram DM/i })
    ).toHaveAttribute(
      'href',
      'https://ig.me/m/save.this.for.me?text=CONNECT-ABCD12'
    );
  });

  it('renders connected accounts and handles disconnect', async () => {
    vi.mocked(api.getConnectedInstagramAccounts).mockResolvedValueOnce([
      {
        id: 'conn-123',
        user_id: 'user-1',
        instagram_scoped_id: 'ig_scoped_888',
        display_username: 'my_ig_handle',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(api.disconnectInstagramAccount).mockResolvedValueOnce();

    render(<ConnectedAccounts token={token} />);

    expect(await screen.findByText('@my_ig_handle')).toBeInTheDocument();
    expect(screen.getByText(/ID: ig_scoped_888/i)).toBeInTheDocument();

    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(api.disconnectInstagramAccount).toHaveBeenCalledWith(
        token,
        'conn-123'
      );
    });
  });
});
