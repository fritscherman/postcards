# Build stage: full image has the toolchain for better-sqlite3's native build.
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# Runtime stage.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# Persist the SQLite database across restarts.
VOLUME ["/app/data"]
EXPOSE 8787
CMD ["node", "dist/index.js"]
