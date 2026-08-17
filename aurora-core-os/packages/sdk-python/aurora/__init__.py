"""Aurora Core OS — Python SDK v2.0"""
from __future__ import annotations
import json
import threading
from datetime import datetime
from typing import Any, Callable, Iterable, Mapping, Optional
import requests

try:
    import websocket as _websocket
    _HAS_WS = True
except ImportError:
    _HAS_WS = False


class AuroraError(Exception):
    def __init__(self, status: int, body: str):
        super().__init__(f"Aurora API {status}: {body}")
        self.status = status


class AuroraClient:
    """Synchronous Aurora Core OS client."""

    def __init__(self, api_key: str, base_url: str, timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.api_key  = api_key
        self.timeout  = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization":  f"Bearer {api_key}",
            "Content-Type":   "application/json",
            "User-Agent":     "aurora-python-sdk/2.0",
        })

    # ── Internal ──────────────────────────────────────────────────────────────

    def _req(self, method: str, path: str, **kw) -> Any:
        r = self._session.request(method, self.base_url + path, timeout=self.timeout, **kw)
        if not r.ok:
            raise AuroraError(r.status_code, r.text)
        return r.json() if r.content else None

    @staticmethod
    def _iso(d: datetime | str | None) -> str | None:
        if d is None: return None
        return d.isoformat() if isinstance(d, datetime) else d

    # ── Events ────────────────────────────────────────────────────────────────

    def send_event(self, event: Mapping[str, Any] | Iterable[Mapping[str, Any]]) -> dict:
        """Send one or many sensor readings.

        Example::
            aurora.send_event({"domain":"ENERGY","kind":"solar_w","value":1240})
            aurora.send_event([
                {"domain":"ENERGY","kind":"solar_w","value":1350},
                {"domain":"BIOMETRIC","kind":"hr_bpm","value":68},
            ])
        """
        return self._req("POST", "/v1/events", data=json.dumps(event))

    # ── State ─────────────────────────────────────────────────────────────────

    def get_state(self) -> dict:
        """Return current live state (energy, bio, env)."""
        return self._req("GET", "/v1/state")

    # ── Insights ──────────────────────────────────────────────────────────────

    def get_insights(self) -> dict:
        """Return current score + signals + history."""
        return self._req("GET", "/v1/insights")

    # ── History ───────────────────────────────────────────────────────────────

    def get_history(
        self,
        domain: Optional[str] = None,
        kind:   Optional[str] = None,
        from_:  Optional[datetime | str] = None,
        to:     Optional[datetime | str] = None,
        limit:  int = 500,
    ) -> dict:
        """Query raw event time-series."""
        params: dict[str, Any] = {"limit": limit}
        if domain: params["domain"] = domain
        if kind:   params["kind"]   = kind
        if from_:  params["from"]   = self._iso(from_)
        if to:     params["to"]     = self._iso(to)
        return self._req("GET", "/v1/history", params=params)

    def get_score_history(
        self,
        from_:  Optional[datetime | str] = None,
        to:     Optional[datetime | str] = None,
        limit:  int = 500,
    ) -> dict:
        """Query score history with breakdown."""
        params: dict[str, Any] = {"limit": limit}
        if from_: params["from"] = self._iso(from_)
        if to:    params["to"]   = self._iso(to)
        return self._req("GET", "/v1/history/scores", params=params)

    # ── Devices ───────────────────────────────────────────────────────────────

    def get_devices(self) -> dict:
        return self._req("GET", "/v1/devices")

    def command(self, device_id: str, command: str, args: Any = None, reason: Optional[str] = None) -> dict:
        return self._req("POST", f"/v1/devices/{device_id}/command",
                         data=json.dumps({"command": command, "args": args, "reason": reason}))

    # ── Modes ─────────────────────────────────────────────────────────────────

    def get_modes(self) -> dict:
        return self._req("GET", "/v1/config/modes")

    def set_mode(self, mode: str) -> dict:
        """mode: 'energy_guardian' | 'health_sentinel' | 'habitat_optimizer'"""
        return self._req("POST", "/v1/config/mode", data=json.dumps({"mode": mode}))

    # ── Chat (AI) ─────────────────────────────────────────────────────────────

    def chat(self, message: str) -> dict:
        """Natural language query grounded in live sensor data.

        Requires ANTHROPIC_API_KEY on the server.

        Example::
            r = aurora.chat("How is the air quality right now?")
            print(r["reply"])
        """
        return self._req("POST", "/v1/chat", data=json.dumps({"message": message}))

    # ── Webhooks ──────────────────────────────────────────────────────────────

    def get_webhooks(self) -> dict:
        return self._req("GET", "/v1/webhooks")

    def create_webhook(self, url: str, events: list[str] = ["*"], label: str = "") -> dict:
        return self._req("POST", "/v1/webhooks", data=json.dumps({"url": url, "events": events, "label": label}))

    def delete_webhook(self, webhook_id: str) -> dict:
        return self._req("DELETE", f"/v1/webhooks/{webhook_id}")

    # ── Actions ───────────────────────────────────────────────────────────────

    def get_actions(self, status: Optional[str] = None, limit: int = 20) -> dict:
        params: dict[str, Any] = {"limit": limit}
        if status: params["status"] = status
        return self._req("GET", "/v1/actions", params=params)

    def ack_action(self, action_id: str, status: str = "ACKED") -> dict:
        """status: 'ACKED' | 'FAILED'"""
        return self._req("PATCH", f"/v1/actions/{action_id}", data=json.dumps({"status": status}))

    # ── Simulation ────────────────────────────────────────────────────────────

    def simulate(self, scenario: str = "healthy") -> dict:
        """Inject a realistic burst of demo events. scenario: healthy | stress | peak_solar"""
        return self._req("POST", "/v1/simulate", data=json.dumps({"scenario": scenario}))

    # ── Export ────────────────────────────────────────────────────────────────

    def export(self) -> dict:
        """Export full installation snapshot as a dict."""
        return self._req("GET", "/v1/export")

    # ── Audit ─────────────────────────────────────────────────────────────────

    def get_audit_log(self, limit: int = 50) -> dict:
        return self._req("GET", f"/v1/audit?limit={limit}")

    # ── Health ────────────────────────────────────────────────────────────────

    def health(self) -> dict:
        return self._req("GET", "/health")

    # ── Real-time ─────────────────────────────────────────────────────────────

    def subscribe(self, on_message: Callable[[dict], None]) -> Callable[[], None]:
        """Subscribe to real-time events in a background thread.

        Returns a stop function. Requires the ``websocket-client`` package.

        Example::
            def handle(msg):
                if msg.get("type") == "score":
                    print(f"Score: {msg['score']} ({msg['trend']})")
                elif msg.get("type") == "action":
                    print(f"Action: {msg['action']['command']}")

            stop = aurora.subscribe(handle)
            # later: stop()
        """
        if not _HAS_WS:
            raise ImportError("websocket-client is required for subscribe(): pip install websocket-client")

        ws_url = self.base_url.replace("http", "ws") + f"/v1/stream?api_key={self.api_key}"
        ws = _websocket.WebSocketApp(
            ws_url,
            on_message=lambda _w, raw: on_message(json.loads(raw)),
        )
        t = threading.Thread(target=ws.run_forever, daemon=True, name="aurora-ws")
        t.start()
        return ws.close
