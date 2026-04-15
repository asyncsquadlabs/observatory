require('./tracing');
const express = require('express');
const { register, httpRequestDuration } = require('./metrics');
const { enqueueJob, getQueueSnapshot, startWorkers, JOB_TYPES } = require('./queue');

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    );
  });
  next();
});

const HTML_UI = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stellar Forge</title>
  <style>
    :root {
      --bg: #0b0c15;
      --panel: #121320;
      --text: #e0e6f1;
      --muted: #8a93a8;
      --accent: #00d4aa;
      --accent-2: #ff6b6b;
      --border: #1e2130;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      border-bottom: 1px solid var(--border);
      padding: 1.5rem 1rem;
      background: linear-gradient(90deg, rgba(0,212,170,0.15), rgba(0,212,170,0.05));
    }
    .container { max-width: 960px; margin: 0 auto; padding: 1rem; }
    h1 { margin: 0; font-size: 1.6rem; }
    p.lead { margin: .25rem 0 0; color: var(--muted); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: .75rem;
      padding: 1rem;
    }
    .panel h2 { margin: 0 0 .75rem; font-size: 1rem; color: var(--accent); }
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      gap: .5rem; border: 1px solid var(--border); background: #0f1120;
      color: var(--text); padding: .6rem 1rem; border-radius: .5rem; cursor: pointer;
      transition: transform .05s ease, border-color .2s ease, background .2s ease;
      font-size: .95rem;
    }
    .btn:hover { border-color: var(--accent); background: #13162a; }
    .btn:active { transform: translateY(1px); }
    .btn-primary { border-color: var(--accent); color: var(--accent); }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .5rem; }
    .status { font-size: .9rem; color: var(--muted); margin-top: .5rem; }
    .job-list { list-style: none; padding: 0; margin: .5rem 0 0; max-height: 280px; overflow: auto; }
    .job-item {
      display: flex; align-items: center; justify-content: space-between;
      gap: .75rem; padding: .6rem .75rem; border: 1px solid var(--border);
      border-radius: .5rem; margin-bottom: .5rem; background: #0d0f1a;
    }
    .badge {
      font-size: .75rem; padding: .2rem .5rem; border-radius: 999px;
      background: #1a1d2e; color: var(--muted); border: 1px solid var(--border);
    }
    .badge.completed { color: var(--accent); border-color: rgba(0,212,170,.35); }
    .badge.failed { color: var(--accent-2); border-color: rgba(255,107,107,.35); }
    .badge.pending { color: #f0c674; border-color: rgba(240,198,116,.35); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: .85rem; }
    .links a { color: var(--accent); text-decoration: none; }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Stellar Forge</h1>
      <p class="lead">Enqueue simulated jobs and watch metrics + traces flow into the observatory stack.</p>
    </div>
  </header>
  <div class="container">
    <div class="grid">
      <div class="panel">
        <h2>Enqueue Jobs</h2>
        <p class="status">Choose a job profile to simulate different workloads.</p>
        <div class="actions">
          <button class="btn btn-primary" onclick="enqueue('fast')">⚡ Fast</button>
          <button class="btn btn-primary" onclick="enqueue('slow')">🐢 Slow</button>
          <button class="btn btn-primary" onclick="enqueue('heavy')">🪨 Heavy</button>
          <button class="btn" onclick="enqueueBatch()">📦 Batch (10 fast)</button>
        </div>
        <div class="status" id="enqueueStatus"></div>
      </div>
      <div class="panel">
        <h2>Observability Links</h2>
        <ul class="links">
          <li><a href="/metrics" target="_blank">Prometheus metrics endpoint</a></li>
          <li><a href="http://localhost:3000" target="_blank">Grafana (localhost:3000)</a></li>
          <li><a href="http://localhost:16686" target="_blank">Jaeger UI (localhost:16686)</a></li>
        </ul>
        <p class="status">Service: <code>stellar-forge</code> | OTLP: <code>http://localhost:4318/v1/traces</code></p>
      </div>
    </div>

    <div class="panel" style="margin-top: 1rem;">
      <h2>Recent Jobs <span class="badge" id="statsBadge">pending: 0 | workers: 3</span></h2>
      <ul class="job-list" id="jobList">
        <li class="job-item"><span class="muted">No jobs yet.</span></li>
      </ul>
    </div>
  </div>

  <script>
    async function enqueue(type) {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      document.getElementById('enqueueStatus').textContent = 'Enqueued job #' + data.job.id + ' (' + data.job.type + ')';
      refreshJobs();
    }
    async function enqueueBatch() {
      for (let i = 0; i < 10; i++) await enqueue('fast');
      document.getElementById('enqueueStatus').textContent = 'Enqueued batch of 10 fast jobs';
    }
    async function refreshJobs() {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      document.getElementById('statsBadge').textContent = 'pending: ' + data.pending + ' | workers: ' + data.workers;
      const list = document.getElementById('jobList');
      if (data.recentJobs.length === 0) {
        list.innerHTML = '<li class="job-item"><span class="muted">No jobs yet.</span></li>';
        return;
      }
      list.innerHTML = data.recentJobs.map(j => {
        const statusClass = j.status === 'completed' ? 'completed' : (j.status === 'failed' ? 'failed' : 'pending');
        return '<li class="job-item"><div><strong>#' + j.id + '</strong> <span class="badge">' + j.type + '</span></div><span class="badge ' + statusClass + '">' + j.status + '</span></li>';
      }).join('');
    }
    setInterval(refreshJobs, 1000);
    refreshJobs();
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(HTML_UI);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stellar-forge' });
});

app.get('/api/jobs', (req, res) => {
  res.json(getQueueSnapshot());
});

app.post('/api/jobs', (req, res) => {
  const { type, payload } = req.body || {};
  const job = enqueueJob(type, payload);
  res.status(201).json({ job });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

startWorkers();

app.listen(PORT, () => {
  console.log(`Stellar Forge listening on http://localhost:${PORT}`);
  console.log(`Metrics: http://localhost:${PORT}/metrics`);
  console.log(`Jaeger OTLP endpoint: ${process.env.JAEGER_OTLP_URL || 'http://localhost:4318/v1/traces'}`);
});
