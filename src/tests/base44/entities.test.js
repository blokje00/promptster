import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockBase44Client, resetMockData } from '../mocks/base44Mock';

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
  });

  describe('Filter entities', () => {
    it('should filter Todos by completed status', async () => {
      const completedTodos = await client.entities.Todo.filter({ completed: true });
      
      expect(completedTodos).toHaveLength(1);
      expect(completedTodos[0].completed).toBe(true);
    });

    it('should limit results', async () => {
      const todos = await client.entities.Todo.filter({}, 1);
      
      expect(todos).toHaveLength(1);
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
      expect(todos.find(t => t.id === '1')).toBeUndefined();
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
