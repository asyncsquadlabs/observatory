# Observatory 🔭

> **See everything. Deploy confidently.**
>
> A batteries-included, local-first telemetry stack that lets you test metrics, traces, and APM dashboards on your machine — before they ever touch production.

---

## 🚀 What is Observatory?

**Observatory** is a lightweight, open-source telemetry sandbox built for developers and teams who want to *know* their observability works before shipping it. No cloud accounts. No complex setups. No surprises at 2 AM.

Spin up Prometheus, Grafana, and Jaeger in seconds with a single, resource-conscious Compose file. Wire in your app. Validate your dashboards. Inspect your traces. Then deploy with confidence.

**Built for:** Local development · Integration testing · Pre-production validation · Onboarding new team members · Demo environments

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

## 🔒 Security Note

By default, all services bind to **`127.0.0.1`** (localhost) so they are **not** exposed to your network.  
Grafana ships with a default admin password (`admin`). For local testing this is fine, but **change it** in `.env` if you ever bind to `0.0.0.0`.

```bash
cp .env.example .env
# edit .env and set GRAFANA_ADMIN_PASSWORD to something strong
```

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
