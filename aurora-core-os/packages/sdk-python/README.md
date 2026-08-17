# aurora-sdk (Python)

```python
from aurora import AuroraClient

aurora = AuroraClient("https://api.aurora.example.com", api_key="ak_...")

aurora.send_event({"domain": "BIOMETRIC", "kind": "hr_bpm", "value": 78})

ins = aurora.get_insights()
print("Score:", ins["current"]["score"])

def on_msg(m):
    if m["type"] == "action":
        print("Action:", m["action"])

unsub = aurora.subscribe(on_msg)
```
