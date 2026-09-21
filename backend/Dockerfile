# Wird mit Build-Context = Repo-Wurzel gebaut (siehe docker-compose.yml),
# damit npm workspaces korrekt aufgeloest werden.
FROM node:22-bookworm-slim AS build
WORKDIR /repo

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY player/package.json player/package.json
RUN npm install --workspace backend --include-workspace-root

COPY backend backend
COPY pi-image pi-image
COPY player player

RUN npm run prisma:generate --workspace backend
RUN npm run build --workspace backend

FROM node:22-bookworm-slim AS runtime
WORKDIR /repo

COPY package.json ./
COPY backend/package.json backend/package.json
COPY --from=build /repo/backend/prisma backend/prisma
# ts-node/typescript/prisma-CLI (devDependencies) werden zur Laufzeit fuer den
# einmaligen Seed-Befehl (prisma/seed.ts) sowie "prisma migrate deploy"
# benoetigt, daher voller Install statt --omit=dev (--include=dev erzwingt
# das explizit). NODE_ENV=production wird bewusst erst NACH diesem Install
# gesetzt, damit keine Tooling-Logik vorher schon von "production" ausgeht.
# Das Prisma-Schema liegt bereits vor, damit der postinstall-Hook "prisma generate" greift.
RUN npm install --workspace backend --include-workspace-root --include=dev

ENV NODE_ENV=production

COPY --from=build /repo/backend/dist backend/dist
COPY --from=build /repo/node_modules/.prisma node_modules/.prisma
COPY pi-image pi-image
COPY player player

WORKDIR /repo/backend
EXPOSE 3000
# Das lokale Binary direkt aufrufen (nicht "npx prisma") - "npx" wuerde bei
# einem fehlenden lokalen Fund versuchen, das Paket live aus dem Internet
# nachzuladen; der direkte Pfad schlaegt stattdessen sofort mit einer klaren
# Fehlermeldung fehl. Durch npm-Workspace-Hoisting liegt die CLI im Root-
# node_modules (../node_modules, nicht backend/node_modules).
CMD ["sh", "-c", "../node_modules/.bin/prisma migrate deploy && npm run seed && node dist/main"]
