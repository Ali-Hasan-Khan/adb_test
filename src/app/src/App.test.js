import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';

// Mock the API layer (not fetch itself): keeps component tests decoupled
// from HTTP details and lets us simulate server states deterministically.
jest.mock('./api/todos', () => ({
  __esModule: true,
  ...jest.requireActual('./api/todos'),
  getTodos: jest.fn(),
  createTodo: jest.fn(),
}));

import { getTodos, createTodo } from './api/todos';

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders todos fetched from backend', async () => {
  getTodos.mockResolvedValue([
    { id: '1', description: 'Learn Docker' },
    { id: '2', description: 'Learn React' },
  ]);
  render(<App />);
  expect(screen.getByText(/loading todos/i)).toBeInTheDocument();
  expect(await screen.findByText('Learn Docker')).toBeInTheDocument();
  expect(screen.getByText('Learn React')).toBeInTheDocument();
});

test('submitting the form posts and refreshes the list', async () => {
  getTodos
    .mockResolvedValueOnce([{ id: '1', description: 'Learn Docker' }])
    .mockResolvedValueOnce([
      { id: '1', description: 'Learn Docker' },
      { id: '2', description: 'New item' },
    ]);
  createTodo.mockResolvedValue({ id: '2', description: 'New item' });

  render(<App />);
  expect(await screen.findByText('Learn Docker')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('ToDo:'), { target: { value: 'New item' } });
  fireEvent.click(screen.getByRole('button', { name: /add todo/i }));

  await waitFor(() => expect(createTodo).toHaveBeenCalledWith('New item'));
  expect(await screen.findByText('New item')).toBeInTheDocument();
});

test('shows an error with retry when loading fails', async () => {
  getTodos.mockRejectedValueOnce(new Error('Network down'));
  render(<App />);
  expect(await screen.findByText(/failed to load todos/i)).toBeInTheDocument();
});
