FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

ENV PORT=8080
ENV JAEGER_OTLP_URL=http://jaeger:4318/v1/traces

EXPOSE 8080

CMD ["node", "src/server.js"]
