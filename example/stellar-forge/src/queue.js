const { trace, context } = require('@opentelemetry/api');
const { jobQueueSize, jobsProcessedTotal, jobDuration, workersBusy } = require('./metrics');

const WORKER_COUNT = 3;
const queue = [];
let jobIdSeq = 1;
const jobHistory = [];
const MAX_HISTORY = 100;

const JOB_TYPES = {
  fast: { minMs: 50, maxMs: 300, failChance: 0.05 },
  slow: { minMs: 500, maxMs: 2000, failChance: 0.15 },
  heavy: { minMs: 1000, maxMs: 5000, failChance: 0.25 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function processJob(job) {
  const tracer = trace.getTracer('stellar-forge');
  const span = tracer.startSpan('process-job', {
    attributes: {
      'job.id': job.id,
      'job.type': job.type,
    },
  });

  const startTime = Date.now();
  workersBusy.inc();

  try {
    const spec = JOB_TYPES[job.type];
    const durationMs = randomInt(spec.minMs, spec.maxMs);

    span.setAttribute('job.expected_duration_ms', durationMs);

    await context.with(trace.setSpan(context.active(), span), () =>
      runJobSteps(job, durationMs, spec.failChance)
    );

    const elapsed = (Date.now() - startTime) / 1000;
    job.status = 'completed';
    job.finishedAt = new Date().toISOString();
    jobsProcessedTotal.inc({ type: job.type, status: 'completed' });
    jobDuration.observe({ type: job.type, status: 'completed' }, elapsed);
    span.setStatus({ code: 1 }); // OK
  } catch (err) {
    const elapsed = (Date.now() - startTime) / 1000;
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.error = err.message;
    jobsProcessedTotal.inc({ type: job.type, status: 'failed' });
    jobDuration.observe({ type: job.type, status: 'failed' }, elapsed);
    span.recordException(err);
    span.setStatus({ code: 2, message: err.message }); // ERROR
  } finally {
    workersBusy.dec();
    span.end();
  }
}

async function runJobSteps(job, durationMs, failChance) {
  const tracer = trace.getTracer('stellar-forge');

  const stepSpan = tracer.startSpan('job-step:simulate-work');
  await sleep(durationMs);

  if (Math.random() < failChance) {
    stepSpan.recordException(new Error('Simulated random failure'));
    stepSpan.setStatus({ code: 2, message: 'Simulated random failure' });
    stepSpan.end();
    throw new Error('Simulated random failure');
  }

  const verifySpan = tracer.startSpan('job-step:verify-output');
  await sleep(randomInt(10, 50));
  verifySpan.end();

  stepSpan.end();
}

async function workerLoop(workerId) {
  while (true) {
    const job = queue.shift();
    if (job) {
      jobQueueSize.set(queue.length);
      job.startedAt = new Date().toISOString();
      job.workerId = workerId;
      await processJob(job);
    } else {
      jobQueueSize.set(0);
      await sleep(100);
    }
  }
}

function startWorkers() {
  for (let i = 1; i <= WORKER_COUNT; i++) {
    workerLoop(i).catch(console.error);
  }
}

function enqueueJob(type, payload) {
  const validType = JOB_TYPES[type] ? type : 'fast';
  const job = {
    id: jobIdSeq++,
    type: validType,
    payload: payload || {},
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  queue.push(job);
  jobQueueSize.set(queue.length);

  jobHistory.unshift(job);
  if (jobHistory.length > MAX_HISTORY) {
    jobHistory.pop();
  }

  return job;
}

function getQueueSnapshot() {
  return {
    pending: queue.length,
    workers: WORKER_COUNT,
    recentJobs: jobHistory.slice(0, 20),
  };
}

module.exports = {
  enqueueJob,
  getQueueSnapshot,
  startWorkers,
  JOB_TYPES,
};
