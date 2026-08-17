# services/aurora_mqtt.py
# Aurora Core MQTT bridge for JARVIS
# Connects JARVIS tools to ARCHON-RV1 hardware via MQTT broker on CM4

import json
import logging
import os
from typing import Optional
import requests

logger = logging.getLogger("jarvis.aurora")

MQTT_HTTP_URL = os.getenv("AURORA_MQTT_URL", "http://localhost:3000")
AURORA_API_KEY = os.getenv("AURORA_API_KEY", "")

class AuroraMQTTService:
    """
    Bridge between JARVIS tools and Aurora Core's decision engine.
    Publishes commands and reads live state via Aurora Core REST API.
    """

    def __init__(self):
        self.base = MQTT_HTTP_URL.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {AURORA_API_KEY}",
            "Content-Type": "application/json",
        }

    def _get(self, path: str) -> dict:
        try:
            r = requests.get(f"{self.base}{path}", headers=self.headers, timeout=8)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Aurora GET {path} failed: {e}")
            return {"error": str(e)}

    def _post(self, path: str, body: dict) -> dict:
        try:
            r = requests.post(f"{self.base}{path}", headers=self.headers, json=body, timeout=8)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Aurora POST {path} failed: {e}")
            return {"error": str(e)}

    # ── State ─────────────────────────────────────────────────────────────────

    def get_state(self) -> dict:
        """Get full Aurora Core live state snapshot."""
        return self._get("/v1/state")

    def get_system_score(self) -> dict:
        """Get current system score and domain breakdown."""
        state = self._get("/v1/state")
        if "error" in state:
            return state
        return {
            "system":      state.get("scores", {}).get("system", 0),
            "bio":         state.get("scores", {}).get("bio", 0),
            "energy":      state.get("scores", {}).get("energy", 0),
            "environment": state.get("scores", {}).get("env", 0),
            "mode":        state.get("mode", "BALANCED"),
        }

    def get_energy(self) -> dict:
        state = self._get("/v1/state")
        return state.get("energy", {})

    def get_biometrics(self) -> dict:
        state = self._get("/v1/state")
        return state.get("biometrics", {})

    def get_environment(self) -> dict:
        state = self._get("/v1/state")
        return state.get("environment", {})

    def get_insights(self) -> list:
        result = self._get("/v1/insights?limit=5")
        return result.get("insights", [])

    # ── Control ───────────────────────────────────────────────────────────────

    def set_relay(self, relay_num: int, state: bool) -> dict:
        """Control relay K1–K4 (generator, shore, HVAC, AUX)."""
        return self._post(
            "/v1/devices/relay/command",
            {"command": "SET_RELAY", "payload": {"relay": relay_num, "state": state}},
        )

    def set_output(self, channel: int, pwm: int) -> dict:
        """Control MOSFET output OUT0–OUT7 with PWM 0–255."""
        return self._post(
            "/v1/devices/output/command",
            {"command": "SET_OUTPUT", "payload": {"ch": channel, "pwm": pwm}},
        )

    def set_mode(self, mode: str) -> dict:
        """Switch Aurora mode: ENERGY_GUARDIAN, HEALTH_SENTINEL, HABITAT_OPTIMIZER, BALANCED."""
        return self._post("/v1/config/mode", {"mode": mode.upper()})

    def emergency_shutoff(self) -> dict:
        """Trigger K4 emergency relay — propane/water shutoff."""
        return self.set_relay(4, True)
