import { vi } from 'vitest';

/**
 * Mock Base44 Client voor testing
 * Deze mock simuleert de Base44 SDK zonder echte API calls te maken
 */

// Mock data voor entities
const mockEntities = {
  Todo: {
    items: [
      { id: '1', title: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
      { id: '2', title: 'Test Todo 2', completed: true, createdAt: new Date().toISOString() },
    ],
  },
  User: {
    items: [
      { id: '1', name: 'Test User', email: 'test@example.com', role: 'user' },
    ],
  },
};

// Mock user voor auth
const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
};

/**
 * Creëer een mock entity module
 */
const createMockEntityModule = (entityName) => ({
  list: vi.fn(async () => {
    const entity = mockEntities[entityName];
    return entity ? entity.items : [];
  }),
  
  filter: vi.fn(async (filters, limit) => {
    const entity = mockEntities[entityName];
    if (!entity) return [];
    
    let items = [...entity.items];
    
    // Simpele filter implementatie
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        items = items.filter(item => {
          if (Array.isArray(value)) {
            return value.includes(item[key]);
          }
          return item[key] === value;
        });
      });
    }
    
    // Limit toepassen
    if (limit) {
      items = items.slice(0, limit);
    }
    
    return items;
  }),
  
  get: vi.fn(async (id) => {
    const entity = mockEntities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    
    const item = entity.items.find(i => i.id === id);
    if (!item) throw new Error(`Item with id ${id} not found`);
    
    return item;
  }),
  
  create: vi.fn(async (data) => {
    const entity = mockEntities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    
    const newItem = {
      id: String(entity.items.length + 1),
      ...data,
      createdAt: new Date().toISOString(),
    };
    
    entity.items.push(newItem);
    return newItem;
  }),
  
  update: vi.fn(async (id, data) => {
    const entity = mockEntities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    
    const index = entity.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error(`Item with id ${id} not found`);
    
    entity.items[index] = { ...entity.items[index], ...data };
    return entity.items[index];
  }),
  
  delete: vi.fn(async (id) => {
    const entity = mockEntities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    
    const index = entity.items.findIndex(i => i.id === id);
    if (index === -1) throw new Error(`Item with id ${id} not found`);
    
    entity.items.splice(index, 1);
    return { success: true };
  }),
  
  bulkCreate: vi.fn(async (items) => {
    const entity = mockEntities[entityName];
    if (!entity) throw new Error(`Entity ${entityName} not found`);
    
    const newItems = items.map((data, index) => ({
      id: String(entity.items.length + index + 1),
      ...data,
      createdAt: new Date().toISOString(),
    }));
    
    entity.items.push(...newItems);
    return newItems;
  }),
});

/**
 * Mock Base44 Client
 */
export const createMockBase44Client = (config = {}) => {
  const entitiesProxy = new Proxy({}, {
    get: (target, prop) => {
      if (!target[prop]) {
        target[prop] = createMockEntityModule(prop);
      }
      return target[prop];
    }
  });

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
      
      login: vi.fn((returnUrl = '/') => {
        // Simuleer login redirect
        console.log(`Mock login redirect to: ${returnUrl}`);
      }),
    },
    
    // Entities module met dynamic entity creation
    entities: entitiesProxy,
    
    // Integrations module
    integrations: new Proxy({
      Core: {
        SendEmail: vi.fn(async (params) => ({
          success: true,
          messageId: 'mock-email-id',
          ...params,
        })),
        
        UploadFile: vi.fn(async (params) => ({
          success: true,
          fileId: 'mock-file-id',
          url: 'https://mock-url.com/file.png',
          ...params,
        })),
      },
    }, {
      get: (target, prop) => {
        if (!target[prop]) {
          // Create dynamic integration package
          target[prop] = new Proxy({}, {
            get: (subTarget, method) => {
              if (!subTarget[method]) {
                subTarget[method] = vi.fn(async (params) => ({
                  success: true,
                  result: `Mock result for ${String(prop)}.${String(method)}`,
                  params,
                }));
              }
              return subTarget[method];
            }
          });
        }
        return target[prop];
      }
    }),
    
    // Functions module
    functions: new Proxy({}, {
      get: (target, prop) => {
        if (!target[prop]) {
          target[prop] = vi.fn(async (params) => ({
            success: true,
            result: `Mock result for ${String(prop)}`,
            params,
          }));
        }
        return target[prop];
      }
    }),
    
    // Service role variant
    asServiceRole: {
      entities: entitiesProxy,
      integrations: new Proxy({}, {
        get: (target, prop) => {
          if (!target[prop]) {
            target[prop] = vi.fn(async (params) => ({
              success: true,
              result: `Mock service role result`,
              params,
            }));
          }
          return target[prop];
        }
      }),
      functions: new Proxy({}, {
        get: (target, prop) => {
          if (!target[prop]) {
            target[prop] = vi.fn(async (params) => ({
              success: true,
              result: `Mock service role function result`,
              params,
            }));
          }
          return target[prop];
        }
      }),
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
  mockEntities.Todo.items = [
    { id: '1', title: 'Test Todo 1', completed: false, createdAt: new Date().toISOString() },
    { id: '2', title: 'Test Todo 2', completed: true, createdAt: new Date().toISOString() },
  ];
  
  mockEntities.User.items = [
    { id: '1', name: 'Test User', email: 'test@example.com', role: 'user' },
  ];
};

/**
 * Voeg custom mock data toe
 */
export const addMockEntity = (entityName, items) => {
  mockEntities[entityName] = { items };
};

/**
 * Mock voor createClient functie
 */
export const mockCreateClient = vi.fn((config) => createMockBase44Client(config));
