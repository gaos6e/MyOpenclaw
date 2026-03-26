---
name: task-ack
description: "Send an immediate ack (开始做XX了) when a likely task message is received"
metadata: {"openclaw": {"emoji": "⚡", "events": ["message:received"]}}
---

# task-ack Hook

This hook improves UX by sending a quick receipt immediately after an inbound message that looks like a task.

## What it does
- Listens on `message:received`
- If the message content matches a lightweight "likely task" heuristic, it pushes a short ack message so the user knows the task was received and work is starting.

## Notes
- Intended mainly for direct chats.
- Keep the message short to avoid noise.

## Enable

```bash
openclaw hooks enable task-ack
# restart gateway so hooks reload
```
