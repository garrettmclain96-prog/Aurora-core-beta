# SDK Reference

## Node / TypeScript — `@aurora/sdk`

```ts
import { AuroraClient } from "@aurora/sdk";
const aurora = new AuroraClient({ baseUrl, apiKey });

aurora.sendEvent({ domain, kind, value, payload? })
aurora.getState()
aurora.getInsights()
aurora.getDevices()
aurora.command(deviceId, command, args?, reason?)
aurora.getModes()
aurora.setMode(mode)
aurora.subscribe((msg) => {})         // returns unsubscribe()
```

## Python — `aurora-sdk`

```python
from aurora import AuroraClient
a = AuroraClient(base_url, api_key)

a.send_event({...})
a.get_state(); a.get_insights(); a.get_devices()
a.command(device_id, "dim", {"level": 30})
a.get_modes(); a.set_mode("energy_guardian")
unsub = a.subscribe(lambda m: print(m))
```

## Recipes

### Send energy readings, get optimization
```ts
await aurora.sendEvent([
  { domain: "ENERGY", kind: "solar_w",          value: 1500 },
  { domain: "ENERGY", kind: "load_w",           value: 800 },
  { domain: "ENERGY", kind: "grid_price_cents", value: 38 },
]);
const { current } = await aurora.getInsights();
console.log(current.actions); // → may include { command: "delay_load", args: { minutes: 90 } }
```

### Send HR/HRV, get stress insight
```python
a.send_event([
  {"domain":"BIOMETRIC","kind":"hr_bpm","value":110},
  {"domain":"BIOMETRIC","kind":"hrv_ms","value":28},
  {"domain":"BIOMETRIC","kind":"stress","value":80},
])
print(a.get_insights()["current"]["signals"])
```

### Subscribe to actions
```ts
aurora.subscribe(m => {
  if (m.type === "action") executeOnYourDevice(m.action);
});
```
