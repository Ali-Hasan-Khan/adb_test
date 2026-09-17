import logging
import os

from pymongo import MongoClient
from pymongo.errors import PyMongoError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .todo_repository import TodoRepository
from .todo_validators import TodoValidationError, extract_description

logger = logging.getLogger(__name__)


def get_mongo_uri() -> str:
    """Build Mongo URI from env with sane local-dev defaults.

    Why getenv with defaults instead of os.environ["..."]?
    - Original code crashed with KeyError outside Docker.
    - getenv keeps Docker behaviour (MONGO_HOST=mongo) while letting
      `python manage.py runserver` work locally (defaults to localhost).
    """
    host = os.getenv("MONGO_HOST", "localhost")
    port = os.getenv("MONGO_PORT", "27017")
    return f"mongodb://{host}:{port}"


def get_db():
    """Return the Mongo database, creating the client lazily.

    Lazy (vs module-level connect at import) so:
    - `import views` never crashes when Mongo is down (tests, management cmds).
    - Each process reuses one client via function attribute cache.
    """
    if not hasattr(get_db, "_db"):
        client = MongoClient(get_mongo_uri(), serverSelectionTimeoutMS=5000)
        get_db._db = client["test_db"]
    return get_db._db


def get_repository() -> TodoRepository:
    """Indirection point so tests can monkeypatch the repository easily."""
    return TodoRepository(get_db())


# Kept for backwards-compat: assignment says "A `db` instance is already
# present in views.py". Accessing it lazily avoids import-time connection.
class _LazyDb:
    def __getattr__(self, name):
        return getattr(get_db(), name)

    def __getitem__(self, key):
        return get_db()[key]


db = _LazyDb()


class TodoListView(APIView):
    """GET /todos/ -> list todos. POST /todos/ -> create a todo.

    Thin controller by design: HTTP in/out only. All domain + DB logic lives
    in todo_validators / todo_repository (SRP, testable, extensible).
    """

    def get_repository(self) -> TodoRepository:
        return get_repository()

    def get(self, request):
        try:
            todos = self.get_repository().list_todos()
            return Response(todos, status=status.HTTP_200_OK)
        except PyMongoError:
            logger.exception("Mongo unavailable on GET /todos/")
            return Response(
                {"detail": "Todo store is unavailable. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:  # pragma: no cover - last-resort guard
            logger.exception("Unexpected error on GET /todos/")
            return Response(
                {"detail": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        try:
            description = extract_description(request.data)
        except TodoValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        try:
            created = self.get_repository().create_todo(description)
            return Response(created, status=status.HTTP_201_CREATED)
        except PyMongoError:
            logger.exception("Mongo unavailable on POST /todos/")
            return Response(
                {"detail": "Todo store is unavailable. Try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:  # pragma: no cover
            logger.exception("Unexpected error on POST /todos/")
            return Response(
                {"detail": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
