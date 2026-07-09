"""helpers.py — the ONLY module runtime-generated tools may import.

Capability surface A: a small, vetted set of building blocks. Generated tool
code composes these; it cannot reach the database or the outside world any
other way. Every function here is written and reviewed by a human.
"""
from __future__ import annotations
from typing import Any

import db


def search_properties(**kwargs: Any) -> dict:
    """Find active listings matching the given criteria."""
    return db.search_properties(**kwargs)


def get_property(property_id: str) -> dict:
    """Fetch a single listing by id (or {} if not found)."""
    return db.get_property(property_id) or {}


def get_owner_contact(property_id: str) -> dict:
    """Return {id, name, phone} for the owner of a property (or {} if none)."""
    return db.get_owner_contact(property_id) or {}


def create_listing(**kwargs: Any) -> dict:
    """Create a new listing (status pending_review)."""
    return db.create_listing(**kwargs)


def send_notification(user_id: str, message: str) -> dict:
    """Deliver a message to a user by inserting a notification row."""
    return db.insert_notification(user_id, message)


ALLOWED_HELPERS = [
    "search_properties",
    "get_property",
    "get_owner_contact",
    "create_listing",
    "send_notification",
]
