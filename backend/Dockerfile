# Wird mit Build-Context = Repo-Wurzel gebaut (siehe docker-compose.yml),
# damit npm workspaces korrekt aufgeloest werden.
FROM node:22-bookworm-slim AS build
WORKDIR /repo

# node:*-bookworm-slim bringt kein "openssl"-CLI mit. Ohne diese kann Prisma
# die vorhandene OpenSSL-Version nicht erkennen, raet falsch (Warnung
# "Defaulting to openssl-1.1.x") und generiert/laedt dadurch die falsche
# Engine-Binary - das fuehrt zu einem sonst schwer verstaendlichen
# "Schema engine error" beim Start. Debian Bookworm hat tatsaechlich
# OpenSSL 3.0.x, daher hier explizit installieren.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl git \
    && rm -rf /var/lib/apt/lists/*

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

# Kurzer Commit-Hash, damit die im Frontend angezeigte Version sich bei jedem
# Deploy tatsaechlich aendert (die manuelle Versionsnummer in package.json
# wird nicht bei jeder Aenderung erhoeht). Der fertige Container selbst hat
# kein .git mehr - nur diese eine Zeile wird in die Runtime-Stage uebernommen.
# ".git" ist nur vorhanden, wenn aus einem echten Git-Checkout gebaut wird
# (z.B. nicht bei "docker build" aus einem heruntergeladenen Zip) - dann
# faellt app.controller.ts zur Laufzeit auf die reine package.json-Version
# zurueck.
COPY .git .git
RUN git rev-parse --short HEAD > /repo/GIT_SHA 2>/dev/null || echo -n "" > /repo/GIT_SHA

FROM node:22-bookworm-slim AS runtime
WORKDIR /repo

# Siehe Kommentar in der build-Stage: openssl wird auch zur Laufzeit fuer die
# Schema-/Query-Engine von Prisma benoetigt.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

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
COPY --from=build /repo/GIT_SHA GIT_SHA
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
