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
      screen.getByRole('heading', { name: /Accounts/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/No Instagram account is linked yet/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Connect Instagram/i })
    ).toBeInTheDocument();
  });

  it('triggers connection code generation, displays pairing code, and copies to clipboard', async () => {
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

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ConnectedAccounts token={token} />);

    const connectButton = await screen.findByRole('button', {
      name: /Connect Instagram/i,
    });
    fireEvent.click(connectButton);

    expect(await screen.findByText('Almost there ♡')).toBeInTheDocument();
    expect(screen.getByText('CONNECT-ABCD12')).toBeInTheDocument();
    expect(screen.getByText(/Expires in 15m/i)).toBeInTheDocument();

    // Copy action
    const copyButton = screen.getByRole('button', { name: /^Copy$/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('CONNECT-ABCD12');
    });
    expect(await screen.findByText('Copied ♡')).toBeInTheDocument();

    // Link and Check status buttons
    expect(
      screen.getByRole('link', { name: /Open Instagram DM/i })
    ).toHaveAttribute(
      'href',
      'https://ig.me/m/save.this.for.me?text=CONNECT-ABCD12'
    );
    expect(
      screen.getByRole('button', { name: /I sent it — Check Status/i })
    ).toBeInTheDocument();
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
    expect(screen.getAllByText(/Instagram/i).length).toBeGreaterThanOrEqual(1);

    const disconnectBtn = screen.getByRole('button', {
      name: /Disconnect @my_ig_handle/i,
    });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(api.disconnectInstagramAccount).toHaveBeenCalledWith(
        token,
        'conn-123'
      );
    });
  });

  it('renders multiple accounts with different usernames as visually distinguishable items', async () => {
    vi.mocked(api.getConnectedInstagramAccounts).mockResolvedValueOnce([
      {
        id: 'conn-alpha-uuid',
        user_id: 'user-secret-uuid-1',
        instagram_scoped_id: '1890698772336939',
        display_username: 'first_account',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'conn-beta-uuid',
        user_id: 'user-secret-uuid-1',
        instagram_scoped_id: '1890698772336940',
        display_username: 'second_account',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    render(<ConnectedAccounts token={token} />);

    expect(await screen.findByText('@first_account')).toBeInTheDocument();
    expect(screen.getByText('@second_account')).toBeInTheDocument();

    // Verify distinct disconnect buttons
    expect(
      screen.getByRole('button', { name: /Disconnect @first_account/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Disconnect @second_account/i })
    ).toBeInTheDocument();

    // Verify internal database UUIDs are never exposed
    expect(screen.queryByText(/conn-alpha-uuid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conn-beta-uuid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/user-secret-uuid-1/i)).not.toBeInTheDocument();
  });

  it('displays clean restrained fallback when display_username is null/missing without exposing database UUIDs', async () => {
    vi.mocked(api.getConnectedInstagramAccounts).mockResolvedValueOnce([
      {
        id: 'db-row-uuid-9999',
        user_id: 'internal-user-uuid-8888',
        instagram_scoped_id: '98765432101234',
        display_username: null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    render(<ConnectedAccounts token={token} />);

    // Shows restrained fallback
    expect(
      await screen.findByText(/Instagram \(••••1234\)/i)
    ).toBeInTheDocument();

    // Accessible disconnect button exists
    expect(
      screen.getByRole('button', { name: /Disconnect/i })
    ).toBeInTheDocument();

    // Absolute assurance that raw internal database UUIDs are NOT in DOM
    expect(screen.queryByText(/db-row-uuid-9999/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/internal-user-uuid-8888/i)
    ).not.toBeInTheDocument();
  });
});
