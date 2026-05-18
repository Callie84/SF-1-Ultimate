#!/bin/sh
set -e
npm install
npm install -g ts-node-dev
npm install --save-dev @types/express @types/cors @types/node @types/mongoose @types/cookie-parser
npx ts-node-dev src/index.ts
