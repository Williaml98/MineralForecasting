import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../app/(auth)/login/page';
import api from '../lib/axios';

jest.mock('../lib/axios');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../store/authStore', () => ({
  useAuthStore: () => ({ setUser: jest.fn() }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

/**
 * Tests for the LoginPage component.
 */
describe('LoginPage', () => {
  it('renders login form fields', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText(/you@bfmining.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/you@bfmining.com/i);
    await userEvent.type(emailInput, 'notanemail');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('calls API on valid form submit', async () => {
    mockedApi.post = jest.fn().mockResolvedValue({ data: { data: { mustChangePassword: false } } });
    mockedApi.get = jest.fn().mockResolvedValue({ data: { data: null } });

    render(<LoginPage />);
    await userEvent.type(screen.getByPlaceholderText(/you@bfmining.com/i), 'admin@test.com');
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'Password@1');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    });
  });
});
