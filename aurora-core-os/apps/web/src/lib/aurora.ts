import { AuroraClient } from "@aurora/sdk";
import { demoAurora, DemoWebSocket } from "./demo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export const isDemoMode = !API_KEY || API_KEY === "ak_xxx_paste_seed_output";

export const aurora = isDemoMode
  ? demoAurora
  : new AuroraClient({ baseUrl: API_URL || "http://localhost:4000", apiKey: API_KEY });

export { DemoWebSocket };
