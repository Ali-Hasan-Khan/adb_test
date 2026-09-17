"""Repository pattern for Todo persistence.

Why a repository instead of calling ``db.todos`` directly in views?
- Separation of concerns: views speak HTTP, this speaks Mongo.
- Dependency Inversion: views depend on a small interface
  (list_todos/create_todo), not on pymongo specifics. Swapping Mongo for
  another store later means changing one file, not every view.
- Testability: easy to stub/fake this class in view tests.
- Single place for Mongo quirks: ObjectId conversion, sort order,
  timestamps, collection name.

Tradeoffs considered:
- Full ODM (mongoengine/djongo) would give schema enforcement but adds a
  heavy dependency and violates the "no Django models" constraint.
- Raw pymongo in views is less code but leaks DB details everywhere and
  duplicates serialization/error handling.
- This thin repository is the middle ground: minimal abstraction, maximal
  clarity for a 2-endpoint service, yet extensible (add get/delete/update
  here later without touching views).
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

COLLECTION_NAME = "todos"


class TodoRepository:
    """Encapsulates all Mongo access for todos."""

    def __init__(self, db):
        # ``db`` is a pymongo Database (or a compatible fake in tests).
        self._db = db

    @property
    def collection(self):
        return self._db[COLLECTION_NAME]

    def list_todos(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Return todos newest-first. Never leaks ObjectId/datetime objects."""
        from .todo_validators import serialize_todo

        # Secondary sort on _id breaks ties when two docs share the same
        # created_at millisecond (Mongo datetimes have ms precision; rapid
        # inserts can collide). ObjectIds are monotonic, so _id desc ==
        # insertion order desc. Verified: mongomock + real Mongo both honour
        # multi-key sort.
        cursor = (
            self.collection.find()
            .sort([("created_at", -1), ("_id", -1)])
            .limit(limit)
        )
        return [serialize_todo(doc) for doc in cursor]

    def create_todo(self, description: str) -> Dict[str, Any]:
        """Insert a todo and return its serialized form."""
        from .todo_validators import serialize_todo

        now = datetime.now(timezone.utc)
        result = self.collection.insert_one(
            {"description": description, "created_at": now}
        )
        doc = self.collection.find_one({"_id": result.inserted_id})
        if doc is None:  # pragma: no cover - defensive; insert succeeded
            logger.error("Failed to read back inserted todo %s", result.inserted_id)
            return {"id": str(result.inserted_id), "description": description,
                    "created_at": now.isoformat()}
        return serialize_todo(doc)
