"""Shared validation helpers for auth and uploads."""
from __future__ import annotations

import re

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,32}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_username(username: str) -> str | None:
    if not USERNAME_RE.match(username or ""):
        return (
            "Username must be 3–32 characters and use only letters, numbers, "
            "and underscores."
        )
    return None


def validate_email(email: str) -> str | None:
    if not EMAIL_RE.match(email or ""):
        return "Enter a valid email address."
    return None
