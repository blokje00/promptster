import { describe, it, expect, beforeEach } from 'vitest';
import { createMockBase44Client } from '../mocks/base44Mock';

describe('Base44 Client - Integrations', () => {
  let client;

  beforeEach(() => {
    client = createMockBase44Client({
      appId: '68f4bcd57ca6479c7acf2f47',
      token: 'mock-token',
    });
  });

  describe('Core integrations', () => {
    it('should send email', async () => {
      const result = await client.integrations.Core.SendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        body: 'This is a test',
      });
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('messageId');
      expect(result.to).toBe('user@example.com');
    });

    it('should upload file', async () => {
      const mockFile = new File(['content'], 'test.png', { type: 'image/png' });
      
      const result = await client.integrations.Core.UploadFile({
        file: mockFile,
        metadata: { type: 'profile-picture' },
      });
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('url');
    });
  });

  describe('Custom integrations', () => {
    it('should call custom integration endpoint', async () => {
      const result = await client.integrations.CustomPackage.CustomEndpoint({
        param1: 'value1',
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBeTruthy();
    });
  });
});

describe('Base44 Client - Functions', () => {
  let client;

  beforeEach(() => {
    client = createMockBase44Client({
      appId: '68f4bcd57ca6479c7acf2f47',
      token: 'mock-token',
    });
  });

  it('should call custom function', async () => {
    const result = await client.functions.calculateTotal({
      items: ['item1', 'item2'],
      discount: 0.1,
    });
    
    expect(result.success).toBe(true);
    expect(result).toHaveProperty('result');
    expect(result.params.items).toHaveLength(2);
  });

  it('should call function without parameters', async () => {
    const result = await client.functions.myFunction();
    
    expect(result.success).toBe(true);
  });
});

describe('Base44 Client - Service Role', () => {
  let client;

  beforeEach(() => {
    client = createMockBase44Client({
      appId: '68f4bcd57ca6479c7acf2f47',
      token: 'mock-token',
      serviceToken: 'mock-service-token',
    });
  });

  it('should access entities with service role', async () => {
    const users = await client.asServiceRole.entities.User.list();
    
    expect(Array.isArray(users)).toBe(true);
  });

  it('should call service role functions', async () => {
    const result = await client.asServiceRole.functions.adminFunction();
    
    expect(result.success).toBe(true);
  });
});
