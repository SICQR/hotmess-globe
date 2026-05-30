#!/usr/bin/env bash
set -e
echo "Seeding local Supabase..."
npx supabase db reset --local
echo "Done."
