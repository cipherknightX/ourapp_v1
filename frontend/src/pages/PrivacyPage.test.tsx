import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PrivacyPage } from './PrivacyPage';

describe('PrivacyPage component', () => {
  const renderPrivacyPage = () =>
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>
    );

  it('renders Privacy Policy heading and document structure', () => {
    renderPrivacyPage();

    expect(
      screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /1\. What SaveThisForMe Is/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /2\. Information We Collect/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /3\. How Information Is Used/i,
      })
    ).toBeInTheDocument();
  });

  it('renders support email mailto link', () => {
    renderPrivacyPage();

    const emailLinks = screen.getAllByRole('link', {
      name: /savethisforme\.inbox@gmail\.com/i,
    });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
    expect(emailLinks[0]).toHaveAttribute(
      'href',
      'mailto:savethisforme.inbox@gmail.com'
    );
  });

  it('renders navigation links back to home and other legal pages', () => {
    renderPrivacyPage();

    const homeLinks = screen.getAllByRole('link', { name: /Home/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);

    const termsLinks = screen.getAllByRole('link', { name: /Terms/i });
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
    expect(termsLinks[0]).toHaveAttribute('href', '/terms');
  });
});
