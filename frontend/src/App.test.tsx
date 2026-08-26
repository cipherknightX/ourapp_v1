import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App component', () => {
  it('renders OurApp title and foundation indicator', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /OurApp/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Phase 1 — Foundation Ready/i)).toBeInTheDocument();
  });
});
