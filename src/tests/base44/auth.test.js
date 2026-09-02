import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockBase44Client } from '../mocks/base44Mock';

describe('Base44 Client - Authentication', () => {
  let client;

  describe('Without authentication', () => {
    beforeEach(() => {
      client = createMockBase44Client({
        appId: '68f4bcd57ca6479c7acf2f47',
      });
    });

    it('should return false for isAuthenticated', async () => {
      const isAuth = await client.auth.isAuthenticated();
      expect(isAuth).toBe(false);
    });

    it('should throw error when calling me() without token', async () => {
      await expect(client.auth.me()).rejects.toThrow('Not authenticated');
    });

    // The real SDK has no auth.login() — RouteGuard.jsx calls
    // base44.auth.loginWithProvider('google', path) for unauthenticated users,
    // and AuthContext.jsx calls base44.auth.redirectToLogin(url) directly.
    it('should call loginWithProvider like RouteGuard.jsx does', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      client.auth.loginWithProvider('google', '/dashboard');

      expect(client.auth.loginWithProvider).toHaveBeenCalledWith('google', '/dashboard');
      consoleSpy.mockRestore();
    });

    it('should call redirectToLogin like AuthContext.jsx does', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      client.auth.redirectToLogin('https://app.example.com/checks');

      expect(client.auth.redirectToLogin).toHaveBeenCalledWith('https://app.example.com/checks');
      consoleSpy.mockRestore();
    });
  });

  describe('With authentication', () => {
    beforeEach(() => {
      client = createMockBase44Client({
        appId: '68f4bcd57ca6479c7acf2f47',
        token: 'mock-token',
      });
    });

    it('should return true for isAuthenticated', async () => {
      const isAuth = await client.auth.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it('should return user data from me()', async () => {
      const user = await client.auth.me();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user.email).toBe('test@example.com');
    });

    it('should update user data', async () => {
      const updated = await client.auth.updateMe({
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe('test@example.com');
    });

    it('should set token dynamically', async () => {
      const newClient = createMockBase44Client({
        appId: '68f4bcd57ca6479c7acf2f47',
      });

      let isAuth = await newClient.auth.isAuthenticated();
      expect(isAuth).toBe(false);

      newClient.setToken('new-token');

      isAuth = await newClient.auth.isAuthenticated();
      expect(isAuth).toBe(true);
    });

    it('should clear the token on logout, like Header.jsx / AuthContext.jsx expect', async () => {
      client.auth.logout('https://app.example.com/');

      expect(client.auth.logout).toHaveBeenCalledWith('https://app.example.com/');
      const isAuth = await client.auth.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });
});
