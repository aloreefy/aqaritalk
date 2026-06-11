import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import build_messages


def test_no_history_folds_system_into_first_user_turn():
    msgs = build_messages("SYS", [], "hello")
    assert msgs == [{"role": "user", "content": "SYS\n\nرسالة المستخدم: hello"}]


def test_history_is_inserted_between_system_and_new_message():
    history = [
        {"role": "user", "content": "بدي شقة"},
        {"role": "assistant", "content": "في أي مدينة؟"},
    ]
    msgs = build_messages("SYS", history, "عمّان")
    assert msgs[0] == {"role": "user", "content": "SYS\n\nرسالة المستخدم: بدي شقة"}
    assert msgs[1] == {"role": "assistant", "content": "في أي مدينة؟"}
    assert msgs[2] == {"role": "user", "content": "عمّان"}


def test_leading_assistant_history_is_dropped():
    history = [
        {"role": "assistant", "content": "مرحباً!"},
        {"role": "user", "content": "بدي فيلا"},
    ]
    msgs = build_messages("SYS", history, "إربد")
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "SYS\n\nرسالة المستخدم: بدي فيلا"
    assert msgs[1] == {"role": "user", "content": "إربد"}
