FROM node:22-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
RUN chown -R nodejs:nodejs /app

USER nodejs

ENV PORT=8080
ENV JAEGER_OTLP_URL=http://jaeger:4318/v1/traces

EXPOSE 8080

CMD ["node", "src/server.js"]
