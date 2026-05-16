#!/bin/bash
# Phase 3b — mint a portal token for QA / smoke testing.
# Usage: ./mint-portal-token.sh <inquiry-uuid>
# Reads PORTAL_COOKIE_SECRET from env or hotmess-founding/.env.local.
set -euo pipefail

ID="${1:-}"
if [ -z "$ID" ]; then
  echo "usage: $0 <inquiry-uuid>" >&2
  exit 2
fi
if ! printf '%s' "$ID" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'; then
  echo "error: '$ID' is not a UUID" >&2
  exit 2
fi

SECRET="${PORTAL_COOKIE_SECRET:-}"
if [ -z "$SECRET" ]; then
  ENVFILE=/Users/philipgizzie/Downloads/hotmess-founding/.env.local
  if [ -r "$ENVFILE" ]; then
    SECRET=$(grep -m1 '^PORTAL_COOKIE_SECRET=' "$ENVFILE" | sed 's/^[^=]*=//; s/^"//; s/"$//' || true)
  fi
fi
if [ -z "$SECRET" ]; then
  echo "error: PORTAL_COOKIE_SECRET not set and not found in .env.local" >&2
  exit 3
fi

SIG=$(printf '%s' "$ID" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $NF}')
printf '%s.%s\n' "$ID" "$SIG"
