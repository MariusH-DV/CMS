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
ENV NODE_ENV=production

COPY package.json ./
COPY backend/package.json backend/package.json
COPY --from=build /repo/backend/prisma backend/prisma
# ts-node/typescript (devDependencies) werden zur Laufzeit fuer den einmaligen
# Seed-Befehl (prisma/seed.ts) benoetigt, daher voller Install statt --omit=dev.
# Das Prisma-Schema liegt bereits vor, damit der postinstall-Hook "prisma generate" greift.
RUN npm install --workspace backend --include-workspace-root

COPY --from=build /repo/backend/dist backend/dist
COPY --from=build /repo/node_modules/.prisma node_modules/.prisma
COPY pi-image pi-image
COPY player player

WORKDIR /repo/backend
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && node dist/main"]
