# Telemetry Patagua Integration

This integration is for a second machine on the local Patagua network.

## Endpoint

- `POST /api/telemetry/ingest`

## Required header

- `x-telemetry-token: <shared token>`

## Environment

- `TELEMETRY_INGEST_TOKEN`

## Minimum payload

- `equipment_id` or `equipment_code`
- `status`

## Recommended payload

```json
{
  "equipment_code": "EQ-001",
  "temperature": 72.4,
  "pressure": 81.2,
  "vibration": 1.8,
  "rpm": 1480,
  "status": "normal",
  "source_machine": "patagua-gateway-01"
}
```

## Bash example

```bash
TELEMETRY_URL="https://your-system"
TELEMETRY_TOKEN="shared-secret"
EQUIPMENT_CODE="EQ-001"
SOURCE_MACHINE="patagua-gateway-01"
./scripts/patagua-telemetry.sh
```

## Behavior

- Saves sensor readings into the system
- Creates an alarm when the payload is marked as `alert`
- Accepts either `equipment_id` or `equipment_code`

## Setup checklist

1. Set `TELEMETRY_INGEST_TOKEN` in the environment.
2. Make sure the LAN machine can resolve the app URL.
3. Allow the network path from the gateway to the app.
4. Test one normal reading and one alert reading.
