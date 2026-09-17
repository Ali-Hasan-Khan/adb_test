/**
 * Single choke-point for all Todo HTTP calls (Dependency Inversion / DRY).
 *
 * Why this layer instead of fetch() inline in components?
 * - One place to change base URL, headers, error shape.
 * - Components stay presentational; easy to mock in tests.
 * - Extensible: add update/delete here later without touching UI.
 *
 * Why native fetch instead of axios?
 * - Zero new dependencies (bundle size, supply-chain, yarn install time).
 * - fetch covers GET/POST+JSON fully here. axios would add interceptors/
 *   auto-transforms we don't need for 2 endpoints.
 * - Tradeoff: fetch doesn't throw on HTTP errors, so we normalize that
 *   manually below (apiError helper).
 */

const API_BASE_URL =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  'http://localhost:8000';

function buildUrl(path) {
  // Allow REACT_APP_API_URL with or without trailing slash.
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

async function parseBodySafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiError(res) {
  const body = await parseBodySafe(res);
  const message =
    (body && typeof body === 'object' && (body.detail || body.description)) ||
    `Request failed with status ${res.status}`;
  const err = new Error(Array.isArray(message) ? message.join(' ') : String(message));
  err.status = res.status;
  err.body = body;
  return err;
}

export async function getTodos(signal) {
  const res = await fetch(buildUrl('/todos/'), { signal });
  if (!res.ok) throw await apiError(res);
  const data = await res.json();
  // Backend returns a bare list; tolerate {todos:[...]} envelope for forward-compat.
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.todos)) return data.todos;
  return [];
}

export async function createTodo(description) {
  const res = await fetch(buildUrl('/todos/'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw await apiError(res);
  return res.json();
}

export { API_BASE_URL };
