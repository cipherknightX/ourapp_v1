import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextType } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { AppPage } from '@/pages/AppPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SignupPage } from '@/pages/SignupPage';

const mockAuthContext: AuthContextType = {
  user: null,
  session: null,
  loading: false,
  signUp: vi.fn().mockResolvedValue({ error: null }),
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
  updatePassword: vi.fn().mockResolvedValue({ error: null }),
};

describe('Auth components and flow', () => {
  it('renders LoginPage with form inputs, forgot password link, brand logo, and submission button', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const logo = screen.getByTestId('brand-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', 'SaveThisForMe logo');
    expect(screen.getByText(/SaveThisForMe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Forgot password\?/i })
    ).toHaveAttribute('href', '/forgot-password');
    expect(
      screen.getByRole('button', { name: /^Sign in$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Create account/i })
    ).toBeInTheDocument();
  });

  it('renders ForgotPasswordPage and handles empty or invalid email validation', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/forgot-password']}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const logo = screen.getByTestId('brand-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', 'SaveThisForMe logo');
    expect(screen.getByText(/Forgot your password\?/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Send reset link/i });
    const form = submitBtn.closest('form')!;

    // Submit with empty email
    fireEvent.submit(form);
    expect(
      await screen.findByText(/Please enter your email address/i)
    ).toBeInTheDocument();

    // Enter invalid email
    const emailInput = screen.getByLabelText(/Email address/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.submit(form);

    expect(
      await screen.findByText(/Please enter a valid email address/i)
    ).toBeInTheDocument();
  });

  it('submits valid email on ForgotPasswordPage, calls resetPasswordForEmail, and shows success state', async () => {
    const resetPasswordMock = vi.fn().mockResolvedValue({ error: null });
    render(
      <AuthContext.Provider
        value={{ ...mockAuthContext, resetPasswordForEmail: resetPasswordMock }}
      >
        <MemoryRouter initialEntries={['/forgot-password']}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const emailInput = screen.getByLabelText(/Email address/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send reset link/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('user@example.com');
    });

    expect(await screen.findByText(/Check your email/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Back to sign in/i })
    ).toBeInTheDocument();
  });

  it('displays error message when resetPasswordForEmail fails', async () => {
    const resetPasswordMock = vi
      .fn()
      .mockResolvedValue({ error: new Error('Rate limit exceeded') });

    render(
      <AuthContext.Provider
        value={{ ...mockAuthContext, resetPasswordForEmail: resetPasswordMock }}
      >
        <MemoryRouter initialEntries={['/forgot-password']}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const emailInput = screen.getByLabelText(/Email address/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send reset link/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(await screen.findByText(/Rate limit exceeded/i)).toBeInTheDocument();
  });

  it('renders ResetPasswordPage and enforces password length and mismatch checks', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/reset-password']}>
          <ResetPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const logo = screen.getByTestId('brand-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', 'SaveThisForMe logo');
    expect(
      screen.getByText(/Choose a new password for your account/i)
    ).toBeInTheDocument();

    const newPassInput = screen.getByLabelText(/^New password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm new password/i);
    const submitBtn = screen.getByRole('button', { name: /Update password/i });
    const form = submitBtn.closest('form')!;

    // Test mismatched passwords
    fireEvent.change(newPassInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'different123' } });
    fireEvent.submit(form);

    expect(
      await screen.findByText(/Passwords do not match/i)
    ).toBeInTheDocument();

    // Test short password
    fireEvent.change(newPassInput, { target: { value: '12345' } });
    fireEvent.change(confirmPassInput, { target: { value: '12345' } });
    fireEvent.submit(form);

    expect(
      await screen.findByText(/Password must be at least 6 characters/i)
    ).toBeInTheDocument();
  });

  it('submits valid password on ResetPasswordPage and displays success state', async () => {
    const updatePasswordMock = vi.fn().mockResolvedValue({ error: null });

    render(
      <AuthContext.Provider
        value={{ ...mockAuthContext, updatePassword: updatePasswordMock }}
      >
        <MemoryRouter initialEntries={['/reset-password']}>
          <ResetPasswordPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const newPassInput = screen.getByLabelText(/^New password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm new password/i);
    const submitBtn = screen.getByRole('button', { name: /Update password/i });
    const form = submitBtn.closest('form')!;

    fireEvent.change(newPassInput, { target: { value: 'validPassword123' } });
    fireEvent.change(confirmPassInput, {
      target: { value: 'validPassword123' },
    });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(updatePasswordMock).toHaveBeenCalledWith('validPassword123');
    });

    expect(await screen.findByText(/Password updated ♡/i)).toBeInTheDocument();
  });

  it('renders SignupPage with confirmation input and submission button', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter initialEntries={['/signup']}>
          <SignupPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const logo = screen.getByTestId('brand-logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('alt', 'SaveThisForMe logo');
    expect(screen.getByText(/SaveThisForMe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Create account/i })
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

  it('renders AppPage header and handles sign out interaction', async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const authenticatedContext: AuthContextType = {
      ...mockAuthContext,
      signOut: signOutMock,
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'authenticated@example.com',
      },
      session: {
        access_token: 'mock.jwt.token',
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
        <MemoryRouter>
          <AppPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('authenticated@example.com')).toBeInTheDocument();
    const signOutBtn = screen.getByRole('button', { name: /Sign out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalled();
    });
  });
});
