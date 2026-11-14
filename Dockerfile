FROM node:20-alpine

WORKDIR /app

# Install production and runtime dependencies (tsx is used for server.ts execution)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY tsconfig.json vite.config.ts index.html server.ts ./
COPY src ./src

# Build frontend production bundle so Express can serve static assets when needed
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["npm", "start"]
