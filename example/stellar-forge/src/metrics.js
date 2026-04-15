const promClient = require('prom-client');

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'stellar_forge_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});
register.registerMetric(httpRequestDuration);

const jobQueueSize = new promClient.Gauge({
  name: 'stellar_forge_job_queue_size',
  help: 'Current number of jobs waiting in the queue',
});
register.registerMetric(jobQueueSize);

const jobsProcessedTotal = new promClient.Counter({
  name: 'stellar_forge_jobs_processed_total',
  help: 'Total number of processed jobs',
  labelNames: ['type', 'status'],
});
register.registerMetric(jobsProcessedTotal);

const jobDuration = new promClient.Histogram({
  name: 'stellar_forge_job_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['type', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});
register.registerMetric(jobDuration);

const workersBusy = new promClient.Gauge({
  name: 'stellar_forge_workers_busy',
  help: 'Number of workers currently processing a job',
});
register.registerMetric(workersBusy);

module.exports = {
  register,
  httpRequestDuration,
  jobQueueSize,
  jobsProcessedTotal,
  jobDuration,
  workersBusy,
};
