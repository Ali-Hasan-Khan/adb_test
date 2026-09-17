/**
 * Pure presentational list. Branches explicitly on loading/error/empty/data
 * so every fetch state is visible (no silent blank page) — a production
 * readiness requirement, not just polish.
 */
export function TodoList({ todos, loading, error, onRetry }) {
  if (loading) return <p aria-live="polite">Loading todos…</p>;

  if (error) {
    return (
      <div>
        <p role="alert" className="error">
          Failed to load todos: {error}
        </p>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (!todos.length) return <p>No todos yet. Add your first one below!</p>;

  return (
    <ul>
      {todos.map((todo, idx) => (
        <li key={todo.id || todo._id || `${todo.description}-${idx}`}>
          {todo.description || todo.todo || JSON.stringify(todo)}
        </li>
      ))}
    </ul>
  );
}

export default TodoList;
