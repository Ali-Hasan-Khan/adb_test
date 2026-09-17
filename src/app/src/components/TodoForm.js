import { useState } from 'react';

/**
 * Controlled form component. Owns only its input value (presentational).
 * All server interaction is delegated to onSubmit prop (inversion of control),
 * so this form works with any addTodo implementation and is trivial to test.
 */
export function TodoForm({ onSubmit, submitting }) {
  const [value, setValue] = useState('');
  const [formError, setFormError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim()) {
      setFormError('Please enter a todo description.');
      return;
    }
    setFormError(null);
    try {
      await onSubmit(value);
      setValue(''); // clear only on success
    } catch (err) {
      setFormError(err.message || 'Failed to add todo.');
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="create-todo-form">
      <div>
        {/* htmlFor (not `for`) is the JSX-correct association for a11y. */}
        <label htmlFor="todo-input">ToDo: </label>
        <input
          id="todo-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Learn Docker"
          disabled={submitting}
          maxLength={500}
        />
      </div>
      {formError && (
        <p role="alert" className="error">
          {formError}
        </p>
      )}
      <div style={{ marginTop: '5px' }}>
        <button type="submit" disabled={submitting || !value.trim()}>
          {submitting ? 'Adding…' : 'Add ToDo!'}
        </button>
      </div>
    </form>
  );
}

export default TodoForm;
