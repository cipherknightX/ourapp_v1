import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App component', () => {
  it('renders SaveThisForMe title and navigation links', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /For the things worth coming back to/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId('brand-logo')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Sign in/i }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole('link', { name: /Create account/i }).length
    ).toBeGreaterThanOrEqual(1);
  });
});
