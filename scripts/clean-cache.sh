#!/bin/bash
# Clean Next.js build cache and restart dev server
rm -rf .next
rm -rf node_modules/.cache
echo "Cache cleared. Dev server will restart automatically."
