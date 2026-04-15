# Observatory 🔭

A lightweight, local telemetry stack for testing metrics, traces, and APM dashboards before deploying to any environment.

## Stack

| Service | Purpose | Local URL |
|---------|---------|-----------|
| **Prometheus** | Metrics collection & TSDB | http://localhost:9090 |
| **Grafana** | Visualization & dashboards | http://localhost:3000 |
| **Jaeger** | Distributed tracing / APM | http://localhost:16686 |

> **Why these three?** They give you a complete Metrics + APM + Dashboard loop with the smallest resource footprint. Log aggregation (Loki) can be added later if needed.

## Resource Footprint

Total reserved: **≈ 1.25 GB RAM / 1.5 vCPU**

| Service | Memory Limit | CPU Limit |
|---------|-------------|-----------|
| Prometheus | 512 MB | 0.5 |
| Grafana | 256 MB | 0.5 |
| Jaeger | 512 MB | 0.5 |

## Prerequisites

- [Podman](https://podman.io/) + `podman-compose`
- Or Docker + `docker-compose` (the file is fully compatible)

## Quick Start

```bash
# 1. Start the stack
podman-compose up -d

# 2. Check health
podman-compose ps

# 3. Open Grafana (default login: admin / admin)
open http://localhost:3000
```

## Sending Telemetry from Your App

### Metrics (Prometheus)
Expose a `/metrics` endpoint on your app and add it to `config/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "my-app"
    static_configs:
      - targets: ["host.containers.internal:8080"]
```

Then reload Prometheus:
```bash
podman exec observatory-prometheus kill -HUP 1
```

### Traces (Jaeger / OpenTelemetry)
Send OTLP traces to:

- **gRPC**: `http://localhost:4317`
- **HTTP**: `http://localhost:4318`

## Configuration

Edit `.env` to change ports or retention without touching the Compose file:

```dotenv
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
JAEGER_UI_PORT=16686
PROMETHEUS_RETENTION_TIME=15d
```

## Stopping & Cleaning

```bash
# Stop
podman-compose down

# Stop and wipe all data
podman-compose down -v
```

## Project Structure

```
observatory/
├── config/
│   ├── grafana/
│   │   └── provisioning/   # Auto-loaded datasources & dashboards
│   └── prometheus/
│       └── prometheus.yml  # Scrape configs
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

## License

MIT — use it, fork it, improve it.
