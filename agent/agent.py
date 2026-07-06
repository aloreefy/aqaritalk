"""Broker agent using OpenAI GPT-4o mini + a tool-calling loop over Postgres.

The model receives the user's message and, each step, emits a single JSON
object choosing either a tool to call or a final reply. We run the chosen
tool, feed the result back, and loop until it replies.

Usage (DATABASE_URL must be set):
    python agent/agent.py "بدي شقة للإيجار في عمّان بأقل من 500 دينار"
    python agent/agent.py            # uses a default demo question

Requires env:
    OPENAI_API_KEY  — OpenAI API key (sk-proj-...)
"""

from __future__ import annotations

import json
import os
import sys

from openai import OpenAI

import tools

MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


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
        "قواعد إلزامية لإنشاء الإعلانات (create_listing):",
        "- لا تستدعِ create_listing إطلاقاً قبل أن يعطيك المستخدم صراحةً الحقول "
        "المطلوبة: نوع العقار، ونوع الصفقة (بيع أو إيجار)، والمدينة، والسعر.",
        "- ممنوع منعاً باتاً اختراع السعر أو أي حقل آخر أو وضع قيم افتراضية مثل "
        "'غير محدد'. إذا نقص أي حقل مطلوب، اسأل المستخدم عنه عبر reply ولا تستدعِ "
        "الأداة في تلك الخطوة.",
        "- اسأل عن الحقول الناقصة واحداً تلو الآخر بأسلوب ودود ومختصر.",
        "- استدعِ create_listing فقط بعد اكتمال جميع الحقول المطلوبة بقيم حقيقية من "
        "المستخدم.",
        "",
        "في كل خطوة أخرج كائن JSON واحداً فقط بهذا الشكل:",
        '{"action": "<اسم الأداة أو reply>", "arguments": { ... }}',
        "- لاستدعاء أداة: ضع اسمها في action ومعاملاتها في arguments.",
        "- بعد أن تحصل على نتيجة الأداة، لخّصها للمستخدم عبر:",
        '  {"action": "reply", "arguments": {"text": "ردك بالعربية"}}',
        "لا تُخرج أي نص خارج كائن JSON.",
    ]
    return "\n".join(lines)


def build_messages(system_prompt: str, history, user_message: str):
    """Assemble the message list for the OpenAI API.

    Uses a proper system role (supported by GPT-4o mini). History turns are
    passed as-is; leading assistant turns are dropped because some providers
    require the first non-system turn to be a user turn.
    """
    turns = list(history or [])
    while turns and turns[0]["role"] != "user":
        turns.pop(0)

    messages = [{"role": "system", "content": system_prompt}]
    for t in turns:
        messages.append({"role": t["role"], "content": t["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def run(user_message: str, client: OpenAI | None = None, history=None,
        max_steps: int = 5, verbose: bool = False) -> str:
    llm = client or OpenAI()

    messages = build_messages(build_system_prompt(), history, user_message)

    for _ in range(max_steps):
        resp = llm.chat.completions.create(
            model=MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=768,
        )
        content = (resp.choices[0].message.content or "").strip()

        try:
            obj = json.loads(content)
        except json.JSONDecodeError:
            return content

        if not isinstance(obj, dict):
            return content

        action = obj.get("action")
        args = obj.get("arguments", {})
        if not isinstance(args, dict):
            args = {"text": args} if action == "reply" else {}

        if action == "reply":
            return args.get("text") or obj.get("text") or obj.get("reply") or ""

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
    answer = run(question, verbose=True)
    print("\n=== الوكيل ===")
    print(answer)
