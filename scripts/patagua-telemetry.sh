#!/usr/bin/env bash
set -euo pipefail

: "${TELEMETRY_URL:?Set TELEMETRY_URL to the system base URL}"
: "${TELEMETRY_TOKEN:?Set TELEMETRY_TOKEN to the shared ingest token}"
: "${EQUIPMENT_CODE:=EQ-001}"
: "${SOURCE_MACHINE:=patagua-gateway-01}"

curl -sS -X POST "${TELEMETRY_URL%/}/api/telemetry/ingest" \
  -H "Content-Type: application/json" \
  -H "x-telemetry-token: ${TELEMETRY_TOKEN}" \
  -d "$(cat <<EOF
{
  "equipment_code": "${EQUIPMENT_CODE}",
  "temperature": 72.4,
  "pressure": 81.2,
  "vibration": 1.8,
  "rpm": 1480,
  "status": "normal",
  "source_machine": "${SOURCE_MACHINE}"
}
EOF
)"
