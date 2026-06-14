FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --progress=false --legacy-peer-deps

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health',(r)=>process.exit(e.statusCode===200?0:1))" 

CMD ["node", "server.js"]
