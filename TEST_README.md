# Base44 Testomgeving

Deze testomgeving is opgezet voor het testen van je Base44 applicatie.

## 📁 Structuur

```
src/tests/
  ├── setup.js                    # Test configuratie
  ├── mocks/
  │   └── base44Mock.js          # Mock Base44 SDK client
  ├── base44/
  │   ├── entities.test.js       # Tests voor entities
  │   ├── auth.test.js           # Tests voor authenticatie
  │   └── integrations.test.js   # Tests voor integrations & functions
  └── components/
      └── example.test.jsx       # Voorbeeld component tests
```

## 🚀 Gebruik

### Tests Draaien

```bash
# Alle tests uitvoeren (watch mode)
npm test

# Tests eenmalig uitvoeren
npm run test:run

# Tests met UI interface
npm run test:ui

# Tests met coverage rapport
npm run test:coverage
```

### Environment Variabelen

Er zijn drie environment bestanden aangemaakt:

- **`.env.example`** - Template met alle mogelijke variabelen
- **`.env.development`** - Voor development met echte API
- **`.env.test`** - Voor testing met mock data

Kopieer `.env.example` naar `.env` en vul je echte waarden in voor development:

```bash
cp .env.example .env
```

## 🧪 Mock Base44 Client

De mock client (`src/tests/mocks/base44Mock.js`) simuleert de Base44 SDK zonder echte API calls te maken.

### Gebruik in Tests

```javascript
import { createMockBase44Client } from '../mocks/base44Mock';

const client = createMockBase44Client({
  appId: '68f4bcd57ca6479c7acf2f47',
  token: 'mock-token',
});

// Gebruik zoals normale Base44 client
const todos = await client.entities.Todo.list();
```

### Features van Mock Client

- ✅ Alle entity operaties (list, filter, get, create, update, delete, bulkCreate)
- ✅ Authenticatie (isAuthenticated, me, updateMe, login)
- ✅ Integrations (Core.SendEmail, Core.UploadFile, custom integrations)
- ✅ Functions (custom functions)
- ✅ Service Role operaties
- ✅ Dynamische entity creation (werkt met elke entity naam)

## 📝 Test Voorbeelden

### Entity Tests

```javascript
it('should create a new Todo', async () => {
  const newTodo = await client.entities.Todo.create({
    title: 'New Task',
    completed: false,
  });
  
  expect(newTodo).toHaveProperty('id');
  expect(newTodo.title).toBe('New Task');
});
```

### Auth Tests

```javascript
it('should authenticate user', async () => {
  const isAuth = await client.auth.isAuthenticated();
  expect(isAuth).toBe(true);
  
  const user = await client.auth.me();
  expect(user.email).toBe('test@example.com');
});
```

### Component Tests

```javascript
import { render, screen } from '@testing-library/react';

it('should display todos', async () => {
  const mockClient = createMockBase44Client({
    token: 'mock-token',
  });
  
  render(<Dashboard client={mockClient} />);
  
  const todo = await screen.findByText('Test Todo 1');
  expect(todo).toBeInTheDocument();
});
```

## 🔧 Custom Mock Data

Voeg je eigen mock entities toe:

```javascript
import { addMockEntity, resetMockData } from '../mocks/base44Mock';

beforeEach(() => {
  resetMockData();
  
  addMockEntity('Product', [
    { id: '1', name: 'Product A', price: 99.99 },
    { id: '2', name: 'Product B', price: 149.99 },
  ]);
});

it('should list products', async () => {
  const products = await client.entities.Product.list();
  expect(products).toHaveLength(2);
});
```

## 🔄 Testing met Echte API

Als je tests wilt draaien tegen de echte Base44 API:

1. Vul in `.env.test` je echte `VITE_BASE44_AUTH_TOKEN` in
2. Zet `VITE_USE_MOCK_DATA=false`
3. Update je test setup om de echte client te gebruiken

```javascript
import { createClient } from '@base44/sdk';

const client = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  token: import.meta.env.VITE_BASE44_AUTH_TOKEN,
});
```

## 📚 Vitest Features

- **Watch mode** - Tests worden automatisch herhaald bij code wijzigingen
- **UI mode** - Grafische interface voor test resultaten
- **Coverage** - Code coverage rapporten
- **Fast** - Snel en efficiënt door Vite
- **Jest compatible** - Vertrouwde API als je Jest kent

## 🛠️ Tips

1. **Isolatie**: Gebruik `beforeEach` en `resetMockData()` om tests geïsoleerd te houden
2. **Async/Await**: Alle Base44 operaties zijn async, gebruik altijd `await`
3. **Type Safety**: De mock client ondersteunt TypeScript type hints
4. **Custom Entities**: De mock werkt met elke entity naam dynamisch

## 📖 Meer Info

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Base44 SDK Docs](https://www.npmjs.com/package/@base44/sdk)
