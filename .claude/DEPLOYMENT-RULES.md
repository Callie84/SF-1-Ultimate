# DEPLOYMENT RULES - TypeScript Services

## NIEMALS
❌ docker exec container npm install PACKAGE (ephemeral!)
❌ command: sh -c "cmd1 && cmd2 && cmd3" (unzuverlässig!)

## IMMER
✅ @types in package.json auf Host
✅ docker logs SERVICE --tail 50 nach Start prüfen
✅ Shell-Scripts für komplexe Startup-Logik

## Verification
docker logs SERVICE | grep "added.*packages"
→ Muss 2x erscheinen für npm install + npm install --save-dev
