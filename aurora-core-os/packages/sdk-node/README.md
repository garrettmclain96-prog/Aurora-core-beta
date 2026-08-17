# @aurora/sdk

```ts
import { AuroraClient } from "@aurora/sdk";

const aurora = new AuroraClient({
  baseUrl: "https://api.aurora.example.com",
  apiKey:  process.env.AURORA_KEY!,
});

// Send a reading
await aurora.sendEvent({ domain: "ENERGY", kind: "solar_w", value: 1240 });

// Read score and recommendations
const { current } = await aurora.getInsights();
console.log("Score:", current.score, "Signals:", current.signals);

// Subscribe to actions
const unsub = aurora.subscribe(msg => {
  if (msg.type === "action") console.log("Aurora wants to:", msg.action);
});
```
