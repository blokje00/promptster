import { vi } from 'vitest';

/**
 * Mock Base44 Client voor testing.
 *
 * Deze mock volgt de vorm van de echte @base44/sdk (node_modules/@base44/sdk,
 * geverifieerd tegen v0.8.44 — modules/entities.js, modules/functions.js,
 * modules/auth.js, modules/integrations.js, utils/axios-client.js):
 *
 * - `entities.<Naam>.list(sort?, limit?, skip?, fields?)` en
 *   `.filter(query?, sort?, limit?, skip?, fields?)` geven de data DIRECT terug
 *   (geen `{data: ...}` wrapper). De echte client draait op een axios-instance
 *   met `interceptResponses: true`, die in een response-interceptor al
 *   `response.data` uitpakt. `sort` is dus het 2e argument (een string als
 *   `"-updated_date"`), niet een numerieke limit.
 * - `functions.invoke(name, payload)` geeft wél de RUWE axios-response
 *   `{ data, status, headers }` terug, en verwerpt met een AxiosError-achtig
 *   object `{ message, response: { status, data } }` bij een niet-2xx status.
 *   Reden: de functions-axios-instance draait met `interceptResponses: false`
 *   (zie client.js), dus daar loopt geen unwrap- of Base44Error-interceptor.
 *   De SDK kent alleen `functions.invoke(...)` en `functions.fetch(...)` — geen
 *   `functions.<naam>()`-shorthand.
 * - `integrations.Core.UploadFile(...)` geeft (net als entities) de ruwe
 *   backend-payload terug, dus `{ file_url }` — niet een `{success, fileId}`
 *   wrapper.
 * - `auth` heeft geen `login()`. De echte SDK heeft `redirectToLogin(nextUrl)`
 *   en `loginWithProvider(provider, fromUrl)` (modules/auth.js), en die zijn
 *   het ook die de app aanroept (RouteGuard.jsx, AuthContext.jsx).
 */

// ---- Sort/filter helpers — matchen entities.X.filter(query, sort, limit) ----

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const as = String(a);
  const bs = String(b);
  if (as < bs) return -1;
  if (as > bs) return 1;
  return 0;
}

/** sortSpec: "field" (asc) of "-field" (desc), zoals de echte SDK. */
function sortByField(items, sortSpec) {
  if (!sortSpec) return [...items];
  const desc = sortSpec.startsWith('-');
  const field = desc ? sortSpec.slice(1) : sortSpec;
  return [...items].sort((a, b) => {
    const cmp = compareValues(a[field], b[field]);
    return desc ? -cmp : cmp;
  });
}

function matchesQuery(item, query) {
  return Object.entries(query || {}).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(item[key]);
    return item[key] === value;
  });
}

// ---- Mock data ----

const buildInitialMockEntities = () => ({
  Todo: [
    {
      id: '1',
      title: 'Test Todo 1',
      completed: false,
      created_by: 'test@example.com',
      created_date: '2024-01-01T00:00:00.000Z',
      updated_date: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Test Todo 2',
      completed: true,
      created_by: 'test@example.com',
      created_date: '2024-01-02T00:00:00.000Z',
      updated_date: '2024-01-02T00:00:00.000Z',
    },
  ],
  User: [{ id: '1', name: 'Test User', email: 'test@example.com', role: 'user' }],
});

let mockEntities = buildInitialMockEntities();

// Mock user voor auth + als "ingelogde gebruiker" die create()/bulkCreate()
// als created_by stampt — net als de echte API dat vanaf de sessie doet.
const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

let nextIdCounter = 1000;
const nextId = () => String((nextIdCounter += 1));

/**
 * Creëer een mock entity module
 */
const createMockEntityModule = (entityName) => ({
  list: vi.fn(async (sort, limit) => {
    let items = sortByField(mockEntities[entityName] || [], sort);
    if (limit) items = items.slice(0, limit);
    return items;
  }),

  filter: vi.fn(async (query = {}, sort, limit) => {
    let items = (mockEntities[entityName] || []).filter((item) => matchesQuery(item, query));
    items = sortByField(items, sort);
    if (limit) items = items.slice(0, limit);
    return items;
  }),

  get: vi.fn(async (id) => {
    const items = mockEntities[entityName] || [];
    const item = items.find((i) => i.id === id);
    if (!item) throw new Error(`Item with id ${id} not found`);
    return item;
  }),

  create: vi.fn(async (data) => {
    if (!mockEntities[entityName]) mockEntities[entityName] = [];
    const now = new Date().toISOString();
    const newItem = {
      id: nextId(),
      created_by: mockUser.email,
      created_date: now,
      updated_date: now,
      ...data,
    };
    mockEntities[entityName].push(newItem);
    return newItem;
  }),

  update: vi.fn(async (id, data) => {
    const items = mockEntities[entityName] || [];
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Item with id ${id} not found`);
    items[index] = { ...items[index], ...data, updated_date: new Date().toISOString() };
    return items[index];
  }),

  delete: vi.fn(async (id) => {
    const items = mockEntities[entityName] || [];
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`Item with id ${id} not found`);
    items.splice(index, 1);
    return { success: true };
  }),

  bulkCreate: vi.fn(async (dataArray) => {
    if (!mockEntities[entityName]) mockEntities[entityName] = [];
    const now = new Date().toISOString();
    const newItems = dataArray.map((data) => ({
      id: nextId(),
      created_by: mockUser.email,
      created_date: now,
      updated_date: now,
      ...data,
    }));
    mockEntities[entityName].push(...newItems);
    return newItems;
  }),
});

// ---- functions.invoke registry ----
// Per-functienaam een vaste data-payload of een handler(payload) => data | {status, data}.
let functionResponses = {};

/**
 * Configureer wat `functions.invoke(name, payload)` teruggeeft in tests.
 *
 * - `dataOrHandler` een gewone waarde: die wordt de succesvolle `data` (status 200).
 * - `dataOrHandler` een functie: ontvangt `payload`, mag een gewone waarde
 *   teruggeven (succes, status 200), of expliciet `{ status, data }` om een
 *   fout te simuleren (elke status buiten 2xx laat `invoke()` verwerpen met
 *   een AxiosError-achtig object `{ message, response: { status, data } }`).
 */
export const setMockFunctionResponse = (name, dataOrHandler) => {
  functionResponses[name] = dataOrHandler;
};

export const resetMockFunctionResponses = () => {
  functionResponses = {};
};

const resolveFunctionResult = (returned) => {
  if (returned && typeof returned === 'object' && 'status' in returned && 'data' in returned) {
    return { status: returned.status, data: returned.data };
  }
  return { status: 200, data: returned };
};

const createFunctionsModule = () => ({
  invoke: vi.fn(async (functionName, payload) => {
    const configured = functionResponses[functionName];
    let returned;
    if (typeof configured === 'function') {
      returned = await configured(payload);
    } else if (configured !== undefined) {
      returned = configured;
    } else {
      returned = { ok: true, result: `Mock result for ${functionName}` };
    }

    const { status, data } = resolveFunctionResult(returned);

    if (status >= 200 && status < 300) {
      return { data, status };
    }

    const error = new Error(
      data?.error || data?.message || `Request failed with status code ${status}`
    );
    error.response = { status, data };
    throw error;
  }),

  // De echte SDK heeft ook functions.fetch(path, init) voor directe fetch-calls;
  // niets in dit project gebruikt het, maar het bestaat als stub voor volledigheid.
  fetch: vi.fn(async () => {
    throw new Error('functions.fetch(...) is not mocked — use functions.invoke(...) instead');
  }),
});

// ---- integrations proxy ----
// Core.SendEmail/UploadFile + willekeurige packages, allemaal ongewrapt
// (net als de echte SDK: axios met interceptResponses:true pakt response.data uit).
const createIntegrationsProxy = () =>
  new Proxy(
    {
      Core: {
        SendEmail: vi.fn(async (params) => ({
          success: true,
          messageId: 'mock-email-id',
          ...params,
        })),

        // Echte backend-vorm: { file_url } — zie src/components/lib/uploadFile.jsx
        // en uploadImage.jsx die destructuren `const { file_url } = await ...UploadFile(...)`.
        UploadFile: vi.fn(async () => ({
          file_url: 'https://mock-url.com/file.png',
        })),
      },
    },
    {
      get: (target, prop) => {
        if (!target[prop]) {
          target[prop] = new Proxy(
            {},
            {
              get: (subTarget, method) => {
                if (!subTarget[method]) {
                  subTarget[method] = vi.fn(async (params) => ({
                    success: true,
                    result: `Mock result for ${String(prop)}.${String(method)}`,
                    params,
                  }));
                }
                return subTarget[method];
              },
            }
          );
        }
        return target[prop];
      },
    }
  );

/**
 * Mock Base44 Client
 */
export const createMockBase44Client = (config = {}) => {
  const entitiesProxy = new Proxy(
    {},
    {
      get: (target, prop) => {
        if (!target[prop]) {
          target[prop] = createMockEntityModule(prop);
        }
        return target[prop];
      },
    }
  );

  return {
    // Auth module
    auth: {
      isAuthenticated: vi.fn(async () => config.token != null),

      me: vi.fn(async () => {
        if (!config.token) {
          throw new Error('Not authenticated');
        }
        return mockUser;
      }),

      updateMe: vi.fn(async (data) => {
        if (!config.token) {
          throw new Error('Not authenticated');
        }
        return { ...mockUser, ...data };
      }),

      // Echte SDK-methoden (modules/auth.js) — geen login(), wel deze twee.
      redirectToLogin: vi.fn((nextUrl) => {
        console.log(`Mock redirectToLogin to: ${nextUrl}`);
      }),

      loginWithProvider: vi.fn((provider = 'google', fromUrl = '/') => {
        console.log(`Mock loginWithProvider(${provider}) redirect to: ${fromUrl}`);
      }),

      logout: vi.fn((redirectUrl) => {
        config.token = null;
      }),
    },

    // Entities module met dynamic entity creation
    entities: entitiesProxy,

    // Integrations module
    integrations: createIntegrationsProxy(),

    // Functions module — alleen invoke()/fetch(), zoals de echte SDK
    functions: createFunctionsModule(),

    // Service role variant — deelt in de mock dezelfde in-memory data/registry
    // als de user-scoped modules (de echte SDK gebruikt een aparte axios-
    // instance met een ander token, maar hetzelfde vormcontract).
    asServiceRole: {
      entities: entitiesProxy,
      integrations: createIntegrationsProxy(),
      functions: createFunctionsModule(),
    },

    // Helper methods
    setToken: vi.fn((token) => {
      config.token = token;
    }),
  };
};

/**
 * Reset alle mock data naar initiële state
 */
export const resetMockData = () => {
  mockEntities = buildInitialMockEntities();
  nextIdCounter = 1000;
  resetMockFunctionResponses();
};

/**
 * Voeg custom mock data toe
 */
export const addMockEntity = (entityName, items) => {
  mockEntities[entityName] = items;
};

/**
 * Mock voor createClient functie
 */
export const mockCreateClient = vi.fn((config) => createMockBase44Client(config));
