# Stellar Forge

A playful example Node.js application that simulates a job forge. It exposes Prometheus metrics and sends OpenTelemetry traces to Jaeger so you can verify your observatory stack is working end-to-end.

## What it does

- **Job queue** with 3 background workers
- **Simulated work** with 3 job types:
  - `fast` (50-300ms, low failure chance)
  - `slow` (500-2000ms, medium failure chance)
  - `heavy` (1000-5000ms, high failure chance)
- **Prometheus metrics** at `/metrics`
- **OTLP traces** sent to Jaeger at `http://localhost:4318/v1/traces`
- **Web UI** at the root path to enqueue jobs and watch the queue

## Quick start

### Run with Docker (recommended)

The app is included in the root `docker-compose.yml`, so it starts automatically with the observatory stack:

```bash
cd ../../
docker compose up -d
```

Then open the app: http://localhost:8080

### Run locally

If you prefer to run the app outside Docker:

1. Make sure the observatory stack is running:
   ```bash
   docker compose up -d prometheus grafana jaeger
   ```

2. Install dependencies and start the app:
   ```bash
   npm install
   npm start
   ```

3. Open the app: http://localhost:8080

## Explore observability

- **Metrics**: http://localhost:8080/metrics
- **Grafana**: http://localhost:3000
- **Jaeger**: http://localhost:16686

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port for the app |
| `JAEGER_OTLP_URL` | `http://localhost:4318/v1/traces` | OTLP HTTP endpoint for traces |

## Available metrics

- `stellar_forge_http_request_duration_seconds`
- `stellar_forge_job_queue_size`
- `stellar_forge_jobs_processed_total`
- `stellar_forge_job_duration_seconds`
- `stellar_forge_workers_busy`

## API

- `GET /` – HTML UI
- `GET /health` – Health check
- `GET /api/jobs` – Queue snapshot + recent jobs
- `POST /api/jobs` – Enqueue a job (`{ "type": "fast|slow|heavy", "payload": {} }`)
- `GET /metrics` – Prometheus metrics
