# Adbrew ToDo Test

A full-stack ToDo app with a React frontend, Django REST backend backed by MongoDB, all orchestrated with Docker Compose (3 containers: `app`, `api`, `mongo`).

## Prerequisites

- Docker with Docker Compose (v2: `docker compose`)

## Quick Start

1. Clone/download this repository and set the codebase path env var (must point to the `src` directory inside the repo):

   ```bash
   export ADBREW_CODEBASE_PATH="$(pwd)/src"   # replace with the absolute path to this repo's src
   ```

   > This variable is required by `docker-compose.yml` for volume mounts. Set it in every shell where you run compose, or put it in a `.env` file next to `docker-compose.yml`:
   >
   > ```bash
   > echo "ADBREW_CODEBASE_PATH=$(pwd)/src" > .env
   > ```

2. Build the images (only needed the first time, or after changing `Dockerfile`):

   ```bash
   docker compose build
   ```

3. Start the containers:

   ```bash
   docker compose up -d
   ```

   The first `app` boot is slow (it runs `yarn install`). Watch it until webpack is ready:

   ```bash
   docker logs -f --tail=20 app
   ```

4. Confirm all three containers are up:

   ```bash
   docker ps
   ```

   Expect `api` (0.0.0.0:8000), `app` (0.0.0.0:3000), and `mongo` (0.0.0.0:27017).

5. Open the app and the API:

   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000/todos

## Usage

- The browser app shows a **Create a ToDo** form (textbox + `Add ToDo!` button) and a **List of TODOs**.
- Submitting the form `POST`s the todo to the backend, persists it in MongoDB, then refreshes the list from the backend.
- The list always reflects what is stored in MongoDB (nothing is hardcoded).

### API

| Method | URL                   | Body                     | Response                                                                 |
|--------|-----------------------|--------------------------|--------------------------------------------------------------------------|
| GET    | `http://localhost:8000/todos/` | —                    | `200` — JSON list of all todos, newest first                            |
| POST   | `http://localhost:8000/todos/` | `{"description": "..."}` | `201` — the created todo (`id`, `description`, `created_at`)            |

Error responses: `400` for invalid/blank/missing descriptions, `503` when MongoDB is unavailable.

Quick curl checks:

```bash
# create
curl -X POST http://localhost:8000/todos/ -H "Content-Type: application/json" -d '{"description":"Learn Docker"}'

# list
curl http://localhost:8000/todos/
```

## Verifying the Data

```bash
# inside the mongo container
docker exec mongo mongo --quiet test_db --eval 'print(JSON.stringify(db.todos.find().toArray(), null, 2))'
```

## Running Tests

Backend and frontend logic is covered by unit tests (`mongomock`-based for Python, React Testing Library for the app).

## Commands Reference

| Command                                   | What it does                       |
|-------------------------------------------|------------------------------------|
| `docker compose logs -f --tail=100 api`   | Follow API logs                    |
| `docker compose logs -f --tail=100 app`   | Follow App logs                    |
| `docker exec -it api bash`                | Enter the API container            |
| `docker restart api`                      | Restart a single container         |
| `docker compose down`                     | Stop all containers (keeps data)   |
| `docker compose down -v`                  | Stop all containers and wipe data  |
| `docker compose up -d --build`            | Rebuild and restart                |

MongoDB data is persisted on the host at `<repo>/src/db/` (volume-mounted to `/data/db`). Code changes hot-reload via the same volume mounts; only rebuild (step 2) when the image definition changes.

## Project Structure

```
src/
├── app/        React frontend (React 17, hooks only — no class components)
├── rest/       Django 3 + Django REST Framework API (view-suite: views / validators / repository)
└── requirements.txt
Dockerfile      Base image for api + app (Python 3.8 + Node 16 + Yarn)
docker-compose.yml  Orchestrates api, app, and mongo (official mongo:4.4 image)
```