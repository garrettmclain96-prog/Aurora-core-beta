# tools_aurora.py
# Aurora Core RV tools for JARVIS
# These give JARVIS direct control over the ARCHON-RV1 hardware via Aurora Core API

import json
from langchain_core.tools import tool
from services.aurora_mqtt import AuroraMQTTService

_aurora = AuroraMQTTService()

# ── Read tools ────────────────────────────────────────────────────────────────

@tool
def aurora_system_status() -> str:
    """
    Get the current Aurora Core system status — system score, energy, biometrics,
    environment, and active mode. Use this for any question about the RV's status.
    """
    state = _aurora.get_state()
    if "error" in state:
        return f"Aurora Core unavailable: {state['error']}"

    scores = state.get("scores", {})
    energy = state.get("energy", {})
    bio    = state.get("biometrics", {})
    env    = state.get("environment", {})

    return (
        f"System Score: {scores.get('system', 0)}/100 | Mode: {state.get('mode', 'BALANCED')}\n"
        f"Energy  — Load: {energy.get('load', 0):.1f}kW | Solar: {energy.get('solar', 0):.1f}kW | "
        f"Battery: {energy.get('batterySoc', 0):.0f}% | Grid: {energy.get('grid', 0):.1f}kW\n"
        f"Bio     — HR: {bio.get('heartRate', 0):.0f}bpm | HRV: {bio.get('hrv', 0):.0f}ms | "
        f"Stress: {bio.get('stress', 0):.0f}/100 | SpO₂: {bio.get('spo2', 0):.1f}%\n"
        f"Env     — Temp: {env.get('temp', 0):.1f}°F | CO₂: {env.get('co2', 0):.0f}ppm | "
        f"Humidity: {env.get('humidity', 0):.0f}% | PM2.5: {env.get('pm25', 0):.1f}μg/m³"
    )

@tool
def aurora_energy_status() -> str:
    """
    Get detailed RV energy status — solar production, battery state of charge,
    grid draw, and load. Use for questions about power, solar, or battery.
    """
    e = _aurora.get_energy()
    if "error" in e:
        return f"Energy data unavailable: {e['error']}"
    return (
        f"Solar: {e.get('solar', 0):.2f} kW | "
        f"Load: {e.get('load', 0):.2f} kW | "
        f"Battery: {e.get('batterySoc', 0):.1f}% ({e.get('batteryCurrent', 0):+.1f}A) | "
        f"Grid: {e.get('grid', 0):.2f} kW"
    )

@tool
def aurora_bio_status() -> str:
    """
    Get current biometric readings — heart rate, HRV, SpO₂, and stress index.
    Use for health questions or wellness checks.
    """
    b = _aurora.get_biometrics()
    if "error" in b:
        return f"Biometric data unavailable: {b['error']}"
    stress_label = (
        "Low" if b.get("stress", 0) < 30 else
        "Moderate" if b.get("stress", 0) < 60 else
        "High" if b.get("stress", 0) < 80 else "Critical"
    )
    return (
        f"Heart Rate: {b.get('heartRate', 0):.0f} bpm | "
        f"HRV: {b.get('hrv', 0):.0f} ms | "
        f"SpO₂: {b.get('spo2', 0):.1f}% | "
        f"Stress: {b.get('stress', 0):.0f}/100 ({stress_label})"
    )

@tool
def aurora_environment_status() -> str:
    """
    Get current RV interior environment — temperature, CO₂, humidity, and PM2.5.
    Use for air quality questions or comfort checks.
    """
    e = _aurora.get_environment()
    if "error" in e:
        return f"Environment data unavailable: {e['error']}"
    co2_label = (
        "Excellent" if e.get("co2", 0) < 600 else
        "Good" if e.get("co2", 0) < 800 else
        "Elevated" if e.get("co2", 0) < 1000 else
        "Poor" if e.get("co2", 0) < 1200 else "Critical"
    )
    return (
        f"Temperature: {e.get('temp', 0):.1f}°F | "
        f"CO₂: {e.get('co2', 0):.0f} ppm ({co2_label}) | "
        f"Humidity: {e.get('humidity', 0):.0f}% | "
        f"PM2.5: {e.get('pm25', 0):.1f} μg/m³"
    )

@tool
def aurora_get_insights() -> str:
    """
    Get Aurora Core's current insights and recommendations — warnings, alerts,
    and optimization suggestions for energy, health, and environment.
    """
    insights = _aurora.get_insights()
    if not insights:
        return "No active insights. All systems nominal."
    lines = []
    for i in insights:
        lines.append(f"[{i['level']}] {i['title']}: {i['message']}")
        if i.get("recommendation"):
            lines.append(f"  → {i['recommendation']}")
    return "\n".join(lines)

# ── Control tools ─────────────────────────────────────────────────────────────

@tool
def aurora_set_mode(mode: str) -> str:
    """
    Switch Aurora Core operating mode. Modes change how the system prioritizes decisions.

    Args:
        mode: One of:
          - "energy_guardian"   → maximize solar, protect battery, minimize grid cost
          - "health_sentinel"   → prioritize biometric recovery, reduce stress triggers
          - "habitat_optimizer" → optimize air quality, temperature, and comfort
          - "balanced"          → equal weight across all domains

    Example: "Switch to health sentinel mode for sleep"
    """
    mode_map = {
        "energy":    "ENERGY_GUARDIAN",
        "energy_guardian": "ENERGY_GUARDIAN",
        "health":    "HEALTH_SENTINEL",
        "health_sentinel": "HEALTH_SENTINEL",
        "sleep":     "HEALTH_SENTINEL",
        "habitat":   "HABITAT_OPTIMIZER",
        "habitat_optimizer": "HABITAT_OPTIMIZER",
        "comfort":   "HABITAT_OPTIMIZER",
        "balanced":  "BALANCED",
        "balance":   "BALANCED",
    }
    normalized = mode_map.get(mode.lower().replace(" ", "_"), mode.upper())
    result = _aurora.set_mode(normalized)
    if "error" in result:
        return f"Failed to set mode: {result['error']}"
    return f"Aurora mode switched to {result.get('name', normalized)} ✓"

@tool
def aurora_control_relay(relay: int, state: bool) -> str:
    """
    Control one of the four ARCHON-RV1 relays directly.

    Args:
        relay: Relay number 1–4
               K1 = Generator start/stop
               K2 = Shore power transfer
               K3 = HVAC enable
               K4 = AUX / TurnBot / Emergency shutoff
        state: True to close (activate), False to open (deactivate)

    Example: "Start the generator" → relay=1, state=True
    Example: "Turn off the HVAC" → relay=3, state=False
    """
    relay_names = {1: "Generator (K1)", 2: "Shore Power (K2)", 3: "HVAC (K3)", 4: "AUX/TurnBot (K4)"}
    name = relay_names.get(relay, f"Relay K{relay}")
    result = _aurora.set_relay(relay, state)
    if "error" in result:
        return f"Failed to control {name}: {result['error']}"
    action = "activated" if state else "deactivated"
    return f"{name} {action} ✓"

@tool
def aurora_control_lights(zone: int, brightness: int) -> str:
    """
    Control interior or exterior lights via MOSFET outputs.

    Args:
        zone: Light zone
              0 = Interior Zone 1
              1 = Interior Zone 2
              2 = Exterior / Awning LED
        brightness: 0 (off) to 100 (full brightness)

    Example: "Dim the interior lights to 30%" → zone=0, brightness=30
    Example: "Turn off exterior lights" → zone=2, brightness=0
    """
    zone_names = {0: "Interior Zone 1", 1: "Interior Zone 2", 2: "Exterior/Awning LED"}
    name = zone_names.get(zone, f"Light Zone {zone}")
    pwm = int((brightness / 100) * 255)
    result = _aurora.set_output(zone, pwm)
    if "error" in result:
        return f"Failed to control {name}: {result['error']}"
    if brightness == 0:
        return f"{name} turned off ✓"
    return f"{name} set to {brightness}% brightness ✓"

@tool
def aurora_control_fan(speed: int) -> str:
    """
    Control the RV vent fan speed via PWM.

    Args:
        speed: Fan speed 0 (off) to 100 (full speed)

    Example: "Run the vent fan at 60%" → speed=60
    Example: "Turn off the fan" → speed=0
    """
    pwm = int((speed / 100) * 255)
    result = _aurora.set_output(3, pwm)  # OUT3 = Vent Fan PWM
    if "error" in result:
        return f"Failed to control fan: {result['error']}"
    if speed == 0:
        return "Vent fan stopped ✓"
    return f"Vent fan set to {speed}% speed ✓"

@tool
def aurora_water_pump(state: bool) -> str:
    """
    Control the RV water pump.

    Args:
        state: True to enable, False to disable

    Example: "Turn on the water pump" → state=True
    """
    pwm = 255 if state else 0
    result = _aurora.set_output(4, pwm)  # OUT4 = Water Pump
    if "error" in result:
        return f"Failed to control water pump: {result['error']}"
    return f"Water pump {'enabled' if state else 'disabled'} ✓"

@tool
def aurora_emergency_shutoff() -> str:
    """
    Trigger the ARCHON-RV1 emergency shutoff relay (K4).
    Use this for propane leaks, water leaks, or any emergency requiring
    immediate shutoff of the AUX/TurnBot circuit.

    IMPORTANT: This is an emergency action. Verify situation before calling.
    """
    result = _aurora.emergency_shutoff()
    if "error" in result:
        return f"⚠ Emergency shutoff FAILED: {result['error']}. Cut power manually."
    return "⚠ Emergency shutoff activated — K4 relay closed. Propane/AUX circuit disconnected ✓"


# ── Export list ───────────────────────────────────────────────────────────────

AURORA_TOOLS = [
    aurora_system_status,
    aurora_energy_status,
    aurora_bio_status,
    aurora_environment_status,
    aurora_get_insights,
    aurora_set_mode,
    aurora_control_relay,
    aurora_control_lights,
    aurora_control_fan,
    aurora_water_pump,
    aurora_emergency_shutoff,
]
