"""Minimal broker agent: a small local LLM + a tool-calling loop over Postgres.

The model receives the user's message and, each step, emits a single JSON object
choosing either a tool to call or a final reply. We run the chosen tool, feed the
result back, and loop until it replies.

Usage (Postgres container must be running):
    python agent/agent.py "بدي شقة للإيجار في عمّان بأقل من 500 دينار"
    python agent/agent.py            # uses a default demo question

Swap the brain with an env var if Gemma's tool-calling is unreliable:
    MODEL_PATH="...\\Qwen3-4B...gguf" python agent/agent.py "..."
"""

from __future__ import annotations

import json
import os
import sys

from llama_cpp import Llama

import tools

MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    r"C:\Users\DELL\Desktop\DialectSentEval\models\gemma-4-E2B-it-Q4_K_M.gguf",
)


def build_system_prompt() -> str:
    lines = [
        "أنت وكيل عقاري ذكي تساعد المستخدمين في البحث عن العقارات وإضافتها.",
        "تحدث دائماً بالعربية بأسلوب ودود ومختصر.",
        "",
        "لديك الأدوات التالية:",
    ]
    for t in tools.TOOLS:
        lines.append(f"- {t['name']}: {t['description']}")
        for key, desc in t["parameters"].items():
            lines.append(f"    • {key}: {desc}")
    lines += [
        "",
        "في كل خطوة أخرج كائن JSON واحداً فقط بهذا الشكل:",
        '{"action": "<اسم الأداة أو reply>", "arguments": { ... }}',
        "- لاستدعاء أداة: ضع اسمها في action ومعاملاتها في arguments.",
        '- بعد أن تحصل على نتيجة الأداة، لخّصها للمستخدم عبر:',
        '  {"action": "reply", "arguments": {"text": "ردك بالعربية"}}',
        "لا تُخرج أي نص خارج كائن JSON.",
    ]
    return "\n".join(lines)


def build_messages(system_prompt: str, history, user_message: str):
    """Assemble the message list Gemma sees.

    Gemma has no system role, so the system prompt is folded into the FIRST
    user turn. `history` is prior {role, content} turns (oldest first). Any
    leading assistant turns are dropped because the chat must start with a
    user turn. The new user_message is appended last.
    """
    turns = list(history or [])
    # Drop leading assistant turns (e.g. the stored greeting).
    while turns and turns[0]["role"] != "user":
        turns.pop(0)

    messages = []
    if turns:
        first = turns[0]
        messages.append({
            "role": "user",
            "content": system_prompt + "\n\nرسالة المستخدم: " + first["content"],
        })
        for t in turns[1:]:
            messages.append({"role": t["role"], "content": t["content"]})
        messages.append({"role": "user", "content": user_message})
    else:
        messages.append({
            "role": "user",
            "content": system_prompt + "\n\nرسالة المستخدم: " + user_message,
        })
    return messages


def run(user_message: str, model: Llama | None = None, history=None,
        max_steps: int = 5, verbose: bool = False) -> str:
    llm = model or Llama(model_path=MODEL_PATH, n_ctx=4096,
                         n_threads=os.cpu_count(), verbose=False)

    messages = build_messages(build_system_prompt(), history, user_message)

    for _ in range(max_steps):
        out = llm.create_chat_completion(
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=512,
        )
        content = out["choices"][0]["message"]["content"].strip()

        try:
            obj = json.loads(content)
        except json.JSONDecodeError:
            return content  # model broke protocol; surface its raw output

        action = obj.get("action")
        args = obj.get("arguments", {}) or {}

        if action == "reply":
            return args.get("text", "")

        if verbose:
            print(f"\n[tool call] {action}({json.dumps(args, ensure_ascii=False)})")
        result = tools.run_tool(action, args)
        if verbose:
            print(f"[tool result] {json.dumps(result, ensure_ascii=False)[:500]}")

        messages.append({"role": "assistant", "content": content})
        messages.append({
            "role": "user",
            "content": "نتيجة الأداة (JSON):\n" + json.dumps(result, ensure_ascii=False),
        })

    return "عذراً، لم أتمكن من إكمال طلبك."


if __name__ == "__main__":
    question = " ".join(sys.argv[1:]) or "بدي شقة للإيجار في عمّان بأقل من 500 دينار"
    print("=== المستخدم ===")
    print(question)
    answer = run(question)
    print("\n=== الوكيل ===")
    print(answer)
