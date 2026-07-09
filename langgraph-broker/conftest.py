import os
import sys

# Ensure the broker root is importable so `from helpers import ...` works
# both for tests and for generated tool modules loaded at runtime.
ROOT = os.path.dirname(__file__)
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
