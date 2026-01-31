#!/bin/sh
set -e
npm install
npm install --save-dev @types/express @types/cors @types/node @types/mongoose
npm install -g ts-node-dev
npx ts-node-dev src/index.ts
