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

def test_rejects_from_helpers_import_db():
    src = 'METADATA={"name":"x","description":"","params":{}}\nfrom helpers import db\ndef run():\n    return {}'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_plain_import_helpers():
    src = 'METADATA={"name":"x","description":"","params":{}}\nimport helpers\ndef run():\n    return {}'
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_star_import_from_helpers():
    src = 'METADATA={"name":"x","description":"","params":{}}\nfrom helpers import *\ndef run():\n    return {}'
    with pytest.raises(ValidationError):
        validate_generated_source(src)


# --- bare-name dunder escape (the __builtins__[...] class of bypass) ---

def test_rejects_builtins_import_subscript():
    # __builtins__["__import__"]("os") — full RCE via the module's real builtins
    src = ('METADATA={"name":"x","description":"","params":{}}\n'
           'def run():\n    return __builtins__["__import__"]("os").getcwd()')
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_builtins_open_subscript():
    src = ('METADATA={"name":"x","description":"","params":{}}\n'
           'def run():\n    return __builtins__["open"]("/etc/passwd").read()')
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_builtins_eval_subscript():
    src = ('METADATA={"name":"x","description":"","params":{}}\n'
           'def run():\n    return __builtins__["eval"]("1")')
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_bare_dunder_name():
    # any bare dunder name is refused, not just __builtins__
    src = ('METADATA={"name":"x","description":"","params":{}}\n'
           'def run():\n    return __loader__')
    with pytest.raises(ValidationError):
        validate_generated_source(src)

def test_rejects_dunder_string_constant():
    # foo["__globals__"] style access via a dunder string literal
    src = ('METADATA={"name":"x","description":"","params":{}}\n'
           'def run():\n    f = run\n    return f.__getattribute__("__globals__")')
    with pytest.raises(ValidationError):
        validate_generated_source(src)
