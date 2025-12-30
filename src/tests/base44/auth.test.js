import { describe, it, expect, beforeEach } from 'vitest';
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

    it('should call login redirect', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      client.auth.login('/dashboard');
      
      expect(client.auth.login).toHaveBeenCalledWith('/dashboard');
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
  });
});
