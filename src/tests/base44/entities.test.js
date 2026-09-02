import { describe, it, expect, beforeEach } from 'vitest';
import { createMockBase44Client, resetMockData, addMockEntity } from '../mocks/base44Mock';

describe('Base44 Client - Entities', () => {
  let client;

  beforeEach(() => {
    resetMockData();
    client = createMockBase44Client({
      appId: '68f4bcd57ca6479c7acf2f47',
      token: 'mock-token',
    });
  });

  describe('List entities', () => {
    it('should list all Todo items', async () => {
      const todos = await client.entities.Todo.list();

      expect(todos).toHaveLength(2);
      expect(todos[0]).toHaveProperty('id');
      expect(todos[0]).toHaveProperty('title');
    });

    it('should list all User items', async () => {
      const users = await client.entities.User.list();

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('test@example.com');
    });

    it('should sort like the real SDK (2nd arg is a sort string, not a limit)', async () => {
      const todos = await client.entities.Todo.list('-created_date');

      expect(todos.map((t) => t.id)).toEqual(['2', '1']);
    });
  });

  describe('Filter entities', () => {
    it('should filter Todos by completed status', async () => {
      const completedTodos = await client.entities.Todo.filter({ completed: true });

      expect(completedTodos).toHaveLength(1);
      expect(completedTodos[0].completed).toBe(true);
    });

    it('should limit results using the 3rd positional argument', async () => {
      const todos = await client.entities.Todo.filter({}, undefined, 1);

      expect(todos).toHaveLength(1);
    });

    it('filter(query, sort) sorts by field like the real SDK (production shape)', async () => {
      // Mirrors src/api/createEntityApi.js (listMine):
      //   base44.entities[entityName].filter({ created_by: email }, sort)
      addMockEntity('Item', [
        { id: 'a', created_by: 'u@example.com', updated_date: '2024-01-01T00:00:00.000Z' },
        { id: 'b', created_by: 'u@example.com', updated_date: '2024-03-01T00:00:00.000Z' },
        { id: 'c', created_by: 'other@example.com', updated_date: '2024-02-01T00:00:00.000Z' },
      ]);

      const results = await client.entities.Item.filter({ created_by: 'u@example.com' }, '-updated_date');

      expect(results.map((r) => r.id)).toEqual(['b', 'a']);
    });
  });

  describe('Get entity by ID', () => {
    it('should get a specific Todo', async () => {
      const todo = await client.entities.Todo.get('1');

      expect(todo.id).toBe('1');
      expect(todo.title).toBe('Test Todo 1');
    });

    it('should throw error for non-existent ID', async () => {
      await expect(client.entities.Todo.get('999')).rejects.toThrow();
    });
  });

  describe('Create entity', () => {
    it('should create a new Todo', async () => {
      const newTodo = await client.entities.Todo.create({
        title: 'New Test Todo',
        completed: false,
      });

      expect(newTodo).toHaveProperty('id');
      expect(newTodo.title).toBe('New Test Todo');
      expect(newTodo.completed).toBe(false);

      // Verify it's in the list
      const todos = await client.entities.Todo.list();
      expect(todos).toHaveLength(3);
    });

    it('should stamp created_by like the real API does from the session', async () => {
      const newTodo = await client.entities.Todo.create({ title: 'Stamped' });

      expect(newTodo.created_by).toBe('test@example.com');
    });
  });

  describe('Update entity', () => {
    it('should update an existing Todo', async () => {
      const updated = await client.entities.Todo.update('1', {
        completed: true,
      });

      expect(updated.id).toBe('1');
      expect(updated.completed).toBe(true);
    });

    it('should throw error when updating non-existent entity', async () => {
      await expect(
        client.entities.Todo.update('999', { completed: true })
      ).rejects.toThrow();
    });
  });

  describe('Delete entity', () => {
    it('should delete a Todo', async () => {
      const result = await client.entities.Todo.delete('1');

      expect(result.success).toBe(true);

      const todos = await client.entities.Todo.list();
      expect(todos).toHaveLength(1);
      expect(todos.find((t) => t.id === '1')).toBeUndefined();
    });
  });

  describe('Bulk create', () => {
    it('should create multiple Todos', async () => {
      const newTodos = await client.entities.Todo.bulkCreate([
        { title: 'Bulk Todo 1', completed: false },
        { title: 'Bulk Todo 2', completed: false },
      ]);

      expect(newTodos).toHaveLength(2);
      expect(newTodos[0]).toHaveProperty('id');
      expect(newTodos[1]).toHaveProperty('id');

      const todos = await client.entities.Todo.list();
      expect(todos).toHaveLength(4);
    });
  });
});
