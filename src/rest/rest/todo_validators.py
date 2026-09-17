"""Validation for Todo payloads.

Why a separate module (and not inline in views.py)?
- Single Responsibility: views handle HTTP, this handles domain rules.
- Reusable + unit-testable without Django request objects.
- Extensible: add new fields/rules here without touching HTTP layer.

We deliberately do NOT use Django models / DRF serializers here per the
assignment constraint ("Do not use Django's model, serializers or SQLite").
Plain functions + a small exception type give us the same validation
guarantees with zero ORM coupling, and keep Mongo as the only store.
"""
from typing import Any, Dict

MAX_DESCRIPTION_LENGTH = 500

# Canonical field is ``description``. We accept common aliases so the API is
# forgiving to different clients (form names, tutorials, etc.).
_DESCRIPTION_ALIASES = ("description", "todo", "text", "title")


class TodoValidationError(ValueError):
    """Raised when a POST payload fails validation. Carries a dict of details."""

    def __init__(self, detail: Any):
        super().__init__(str(detail))
        self.detail = detail


def extract_description(payload: Any) -> str:
    """Pull, normalize and validate the todo description from a payload.

    Returns the cleaned string, or raises TodoValidationError.
    """
    if not isinstance(payload, dict):
        raise TodoValidationError({"non_field_errors": ["Request body must be a JSON object."]})

    raw = None
    for key in _DESCRIPTION_ALIASES:
        if isinstance(payload.get(key), str) and payload.get(key) is not None:
            # Prefer canonical key, fall back to first alias present.
            if key == "description":
                raw = payload.get(key)
                break
            if raw is None:
                raw = payload.get(key)

    if raw is None:
        raise TodoValidationError(
            {"description": ["This field is required. Provide 'description' (aliases: todo/text/title)."]}
        )

    cleaned = raw.strip()
    if not cleaned:
        raise TodoValidationError({"description": ["This field may not be blank."]})
    if len(cleaned) > MAX_DESCRIPTION_LENGTH:
        raise TodoValidationError(
            {"description": [f"Ensure this field has no more than {MAX_DESCRIPTION_LENGTH} characters."]}
        )
    return cleaned


def serialize_todo(document: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a raw Mongo document to a JSON-safe API representation."""
    created_at = document.get("created_at")
    # created_at is stored as datetime; expose ISO-8601 string for clients.
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    return {
        "id": str(document.get("_id", "")),
        "description": document.get("description", ""),
        "created_at": created_at,
    }
