import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextType } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AppPage } from '@/pages/AppPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';

const mockAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: false,
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
};

describe('Auth components and flow', () => {
  it('renders LoginPage with form inputs and submission button', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(
      screen.getByRole('heading', { name: /Sign in to OurApp/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign up/i })).toBeInTheDocument();
  });

  it('renders SignupPage with confirmation input and submission button', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/signup']}>
          <SignupPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(
      screen.getByRole('heading', { name: /Create your account/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Sign up/i })
    ).toBeInTheDocument();
  });

  it('redirects unauthenticated user from protected route to /login', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: null }}>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div>Protected Secret Content</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={<div>Login Page Redirect Target</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(
      screen.queryByText(/Protected Secret Content/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Login Page Redirect Target/i)).toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    const authenticatedContext: AuthContextType = {
      ...mockAuthContext,
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'authenticated@example.com',
      },
      session: {
        access_token: 'valid.jwt.token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      },
    };

    render(
      <AuthContext.Provider value={authenticatedContext}>
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <div>Protected Secret Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Protected Secret Content/i)).toBeInTheDocument();
  });

  it('AppPage triggers authenticated backend API call with Bearer token', async () => {
    const testToken = 'mock.jwt.token';
    const authenticatedContext: AuthContextType = {
      ...mockAuthContext,
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'authenticated@example.com',
      },
      session: {
        access_token: testToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        },
      },
    };

    // Mock global fetch
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'authenticated@example.com',
      }),
    } as Response);

    render(
      <AuthContext.Provider value={authenticatedContext}>
        <MemoryRouter>
          <AppPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const testButton = screen.getByRole('button', {
      name: /Test GET \/api\/v1\/auth\/me/i,
    });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/auth\/me$/),
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${testToken}`,
          },
        })
      );
    });

    expect(
      await screen.findByText(/FastAPI Verified Response:/i)
    ).toBeInTheDocument();

    fetchSpy.mockRestore();
  });
});
