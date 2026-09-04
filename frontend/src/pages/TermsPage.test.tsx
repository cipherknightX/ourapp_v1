import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TermsPage } from './TermsPage';

describe('TermsPage component', () => {
  const renderTermsPage = () =>
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>
    );

  it('renders Terms of Service heading and document structure', () => {
    renderTermsPage();

    expect(
      screen.getByRole('heading', { level: 1, name: /Terms of Service/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /1\. Using SaveThisForMe/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /2\. Accounts & Security/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /4\. Content Ownership/i,
      })
    ).toBeInTheDocument();
  });

  it('renders support email mailto link', () => {
    renderTermsPage();

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
    renderTermsPage();

    const homeLinks = screen.getAllByRole('link', { name: /Home/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);

    const privacyLinks = screen.getAllByRole('link', { name: /Privacy/i });
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    expect(privacyLinks[0]).toHaveAttribute('href', '/privacy');
  });
});
