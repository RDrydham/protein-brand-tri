FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --no-audit --progress=false --legacy-peer-deps
COPY backend/ .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
