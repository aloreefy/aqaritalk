# tests/test_smoke.py
def test_create_agent_importable():
    from langchain.agents import create_agent
    assert callable(create_agent)
