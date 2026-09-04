import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';

describe('HomePage component', () => {
  const renderHomePage = () =>
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

  it('renders brand identity in header and footer', () => {
    renderHomePage();

    const logos = screen.getAllByAltText('SaveThisForMe logo');
    expect(logos.length).toBeGreaterThanOrEqual(1);

    const brandTitles = screen.getAllByText('SaveThisForMe');
    expect(brandTitles.length).toBeGreaterThanOrEqual(1);
  });

  it('renders hero headline, copy, and @save.this.for.me handle', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /For the things worth coming back to/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/Save it now\. Find it later ♡/i).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      screen.getAllByText(/@save\.this\.for\.me/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders primary CTAs linking to signup and how-it-works', () => {
    renderHomePage();

    // Start saving CTA in hero
    const startSavingLinks = screen.getAllByRole('link', {
      name: /Start saving/i,
    });
    expect(startSavingLinks.length).toBeGreaterThanOrEqual(1);
    expect(startSavingLinks[0]).toHaveAttribute('href', '/signup');

    // See how it works secondary CTA
    const howItWorksLink = screen.getByRole('link', {
      name: /See how it works/i,
    });
    expect(howItWorksLink).toHaveAttribute('href', '#how-it-works');
  });

  it('renders sign in and create account navigation links', () => {
    renderHomePage();

    const signInLinks = screen.getAllByRole('link', { name: /Sign in/i });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    expect(signInLinks[0]).toHaveAttribute('href', '/login');

    const createAccountLinks = screen.getAllByRole('link', {
      name: /Create account/i,
    });
    expect(createAccountLinks.length).toBeGreaterThanOrEqual(1);
    expect(createAccountLinks[0]).toHaveAttribute('href', '/signup');
  });

  it('renders official Instagram links pointing to @save.this.for.me', () => {
    renderHomePage();

    const instagramLinks = screen.getAllByRole('link', {
      name: /Instagram/i,
    });
    expect(instagramLinks.length).toBeGreaterThanOrEqual(1);

    instagramLinks.forEach((link) => {
      expect(link).toHaveAttribute(
        'href',
        'https://www.instagram.com/save.this.for.me'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('renders demo video placeholder container with local asset source', () => {
    renderHomePage();

    const videoContainer = screen.getByTestId('demo-video-placeholder');
    expect(videoContainer).toBeInTheDocument();

    const video = screen.getByLabelText(
      'SaveThisForMe product walkthrough demo'
    );
    expect(video).toBeInTheDocument();

    const source = video.querySelector('source');
    expect(source).toHaveAttribute('src', '/demo/save-this-for-me-demo.mp4');
    expect(source).toHaveAttribute('type', 'video/mp4');
  });

  it('renders three-step how-it-works explanation', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', { level: 2, name: /How it works/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/01 — Connect/i)).toBeInTheDocument();
    expect(screen.getByText(/02 — Send/i)).toBeInTheDocument();
    expect(screen.getByText(/03 — Remember/i)).toBeInTheDocument();
  });

  it('renders product philosophy, brand statements, and trust section', () => {
    renderHomePage();

    expect(
      screen.getAllByText(/For the things worth coming back to/i).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByText(/No downloading\. No folders\. Just send it\./i)
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/Save it now\. Find it later ♡/i).length
    ).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Your connection, kept simple\./i,
      })
    ).toBeInTheDocument();
  });

  it('renders support contact and legal navigation in footer', () => {
    renderHomePage();

    const supportLink = screen.getByRole('link', { name: /Support/i });
    expect(supportLink).toHaveAttribute(
      'href',
      'mailto:savethisforme.inbox@gmail.com'
    );

    const privacyLink = screen.getByRole('link', { name: /Privacy/i });
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = screen.getByRole('link', { name: /Terms/i });
    expect(termsLink).toHaveAttribute('href', '/terms');
  });
});
