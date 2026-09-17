import './App.css';
import { useTodos } from './hooks/useTodos';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';

/**
 * App is a thin composer: useTodos owns data, TodoForm/TodoList own UI.
 * No class components / lifecycle methods — hooks only, per instructions.
 * No hardcoded todos — everything comes from GET http://localhost:8000/todos.
 */
export function App() {
  const { todos, loading, error, submitting, fetchTodos, addTodo } = useTodos();

  return (
    <div className="App">
      <div>
        <h1>List of TODOs</h1>
        <TodoList todos={todos} loading={loading} error={error} onRetry={fetchTodos} />
      </div>
      <div>
        <h1>Create a ToDo</h1>
        <TodoForm onSubmit={addTodo} submitting={submitting} />
      </div>
    </div>
  );
}

export default App;
