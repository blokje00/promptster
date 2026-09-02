import { describe, it, expect, beforeEach } from 'vitest';
import { createMockBase44Client, resetMockData, setMockFunctionResponse } from '../mocks/base44Mock';

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

    it('should upload a file and return { file_url } unwrapped, like the real SDK', async () => {
      // The real SDK's integrations axios instance runs with interceptResponses:
      // true, so it unwraps response.data — no {success, fileId, url} wrapper.
      // src/components/lib/uploadFile.jsx destructures `const { file_url } = ...`.
      const mockFile = new File(['content'], 'test.png', { type: 'image/png' });

      const result = await client.integrations.Core.UploadFile({
        file: mockFile,
        metadata: { type: 'profile-picture' },
      });

      expect(result).toHaveProperty('file_url');
      expect(result.file_url).toMatch(/^https?:\/\//);
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
    resetMockData(); // also clears any setMockFunctionResponse() registrations
    client = createMockBase44Client({
      appId: '68f4bcd57ca6479c7acf2f47',
      token: 'mock-token',
    });
  });

  it('invoke() returns the raw axios response shape { data, status }, unlike entities/integrations', async () => {
    // functions.invoke() runs on an axios instance with interceptResponses:
    // false (client.js), so unlike entities/integrations it does NOT unwrap
    // response.data. Production code relies on this: usePromptGeneration.jsx
    // and invokeLLM.jsx both read `response.data.result` / `response.data.ok`.
    const response = await client.functions.invoke('calculateTotal', {
      items: ['item1', 'item2'],
      discount: 0.1,
    });

    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
    expect(response.data.result).toContain('calculateTotal');
  });

  it('should call function without parameters', async () => {
    const response = await client.functions.invoke('myFunction');

    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
  });

  it('setMockFunctionResponse(name, handler) lets a test control the payload', async () => {
    setMockFunctionResponse('calculateTotal', (payload) => ({
      total: payload.items.length,
    }));

    const response = await client.functions.invoke('calculateTotal', {
      items: ['item1', 'item2'],
    });

    expect(response).toEqual({ status: 200, data: { total: 2 } });
  });

  it('a configured non-2xx response rejects with an AxiosError-like object (error.response.data.error)', async () => {
    // Mirrors src/components/lib/invokeLLM.jsx's catch block:
    //   error?.response?.data?.error
    setMockFunctionResponse('runPrompt', () => ({
      status: 500,
      data: { error: 'Something broke' },
    }));

    await expect(client.functions.invoke('runPrompt', {})).rejects.toMatchObject({
      response: { status: 500, data: { error: 'Something broke' } },
    });

    try {
      await client.functions.invoke('runPrompt', {});
      throw new Error('should have rejected');
    } catch (error) {
      expect(error.response.data.error).toBe('Something broke');
    }
  });
});

describe('Base44 Client - Service Role', () => {
  let client;

  beforeEach(() => {
    resetMockData();
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

  it('should call service role functions via invoke(), like entities.invoke()', async () => {
    const response = await client.asServiceRole.functions.invoke('adminFunction');

    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
  });
});
