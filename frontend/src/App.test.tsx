import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App component', () => {
  it('renders OurApp title and foundation indicator', async () => {
    render(<App />);
    expect(
      await screen.findByRole('heading', { level: 1, name: /OurApp/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Phase 2 — Identity & Database Ready/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Create account/i })
    ).toBeInTheDocument();
  });
});
