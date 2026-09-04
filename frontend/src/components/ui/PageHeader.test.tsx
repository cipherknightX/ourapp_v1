import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader component', () => {
  it('renders the brand logo and wordmark', () => {
    render(
      <PageHeader
        onSignOut={vi.fn()}
        onToggleConnections={vi.fn()}
        userEmail="user@example.com"
      />
    );

    const logo = screen.getByTestId('brand-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', 'SaveThisForMe logo');
    expect(screen.getByText('SaveThisForMe')).toBeInTheDocument();
  });

  it('renders user email and handles desktop controls', () => {
    const onSignOut = vi.fn();
    const onToggleConnections = vi.fn();

    render(
      <PageHeader
        onSignOut={onSignOut}
        onToggleConnections={onToggleConnections}
        userEmail="user@example.com"
        isConnected={true}
      />
    );

    expect(screen.getByText('user@example.com')).toBeInTheDocument();

    const accountsBtn = screen.getByRole('button', { name: /Accounts/i });
    fireEvent.click(accountsBtn);
    expect(onToggleConnections).toHaveBeenCalledTimes(1);

    const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
    fireEvent.click(signOutBtn);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('toggles mobile menu and handles mobile drawer actions', () => {
    const onSignOut = vi.fn();
    const onToggleConnections = vi.fn();

    render(
      <PageHeader
        onSignOut={onSignOut}
        onToggleConnections={onToggleConnections}
        userEmail="mobile@example.com"
      />
    );

    const toggleBtn = screen.getByLabelText(/Toggle navigation menu/i);
    expect(toggleBtn).toBeInTheDocument();

    // Open mobile drawer
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Click mobile Accounts button
    const mobileAccountsBtn = screen.getAllByRole('button', {
      name: /Accounts/i,
    })[1];
    fireEvent.click(mobileAccountsBtn);
    expect(onToggleConnections).toHaveBeenCalledTimes(1);
  });

  it('manages focus and handles Escape key navigation in mobile drawer', async () => {
    render(
      <PageHeader
        onSignOut={vi.fn()}
        onToggleConnections={vi.fn()}
        userEmail="mobile@example.com"
      />
    );

    const toggleBtn = screen.getByLabelText(/Toggle navigation menu/i);

    // Open drawer
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Press Escape to close drawer
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
  });
});
