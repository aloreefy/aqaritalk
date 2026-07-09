# tests/test_validation.py
import pytest
from validation import validate_generated_source, ValidationError

GOOD = '''
METADATA = {"name": "contact_owner", "description": "d", "params": {"property_id": "str"}}
def run(property_id: str) -> dict:
    from helpers import get_owner_contact, send_notification
    owner = get_owner_contact(property_id)
    return send_notification(owner["id"], "hi")
'''

def test_valid_source_passes():
    validate_generated_source(GOOD)  # no raise

def test_rejects_non_helpers_import():
    src = 'import os\nMETADATA={"name":"x","description":"","params":{}}\ndef run():\n    return {}'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_eval():
    src = 'METADATA={"name":"x","description":"","params":{}}\ndef run():\n    return eval("1+1")'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_open():
    src = 'METADATA={"name":"x","description":"","params":{}}\ndef run():\n    return open("/etc/passwd").read()'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_dunder_access():
    src = 'METADATA={"name":"x","description":"","params":{}}\ndef run():\n    return ().__class__.__bases__'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_missing_metadata():
    src = 'def run():\n    return {}'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_missing_run():
    src = 'METADATA={"name":"x","description":"","params":{}}\nx = 1'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_syntax_error():
    with pytest.raises(ValidationError):
        validate_generated_source("def run(:\n  pass")
