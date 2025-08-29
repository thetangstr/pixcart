#!/bin/bash

# Build script for production that skips Firebase initialization
export SKIP_FIREBASE_INIT=true
export NEXT_TELEMETRY_DISABLED=1

# Run the build
npm run build