import { useCallback, useEffect, useRef, useState } from 'react';
import { getTodos, createTodo } from '../api/todos';

/**
 * Custom hook owning all Todo state + server sync (SRP / reusable logic).
 *
 * Why a hook instead of state inside App?
 * - App stays a thin composer (UI layout only).
 * - Logic is reusable + unit-testable without rendering the whole page.
 * - Encapsulates the "refresh after submit" rule in one place.
 *
 * Why refetch-after-POST instead of optimistic append?
 * - Spec explicitly requires re-fetching latest list from MongoDB.
 * - Server is source of truth (ids, timestamps, sort order come from DB).
 * - Tradeoff: one extra round-trip vs optimistic UI snappiness. For a
 *   correctness-first todo list, refetch wins; optimistic would risk showing
 *   items the server rejected (validation/500) and complicates rollback.
 */
export function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const abortRef = useRef(null);

  const fetchTodos = useCallback(async () => {
    // Cancel in-flight GET to avoid race when submit triggers rapid refetch.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const items = await getTodos(controller.signal);
      setTodos(items);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load todos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchTodos]);

  const addTodo = useCallback(
    async (description) => {
      const cleaned = (description || '').trim();
      if (!cleaned) throw new Error('Todo description may not be blank.');
      setSubmitting(true);
      try {
        await createTodo(cleaned);
        // Spec: refresh list from backend after submit.
        await fetchTodos();
      } finally {
        setSubmitting(false);
      }
    },
    [fetchTodos]
  );

  return { todos, loading, error, submitting, fetchTodos, addTodo };
}

export default useTodos;
