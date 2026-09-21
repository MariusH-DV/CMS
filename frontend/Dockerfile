# Wird mit Build-Context = Repo-Wurzel gebaut (siehe docker-compose.yml),
# damit npm workspaces korrekt aufgeloest werden.
FROM node:22-bookworm-slim AS build
WORKDIR /repo

COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY player/package.json player/package.json
RUN npm install --workspace frontend --include-workspace-root

COPY frontend frontend
RUN npm run build --workspace frontend

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
