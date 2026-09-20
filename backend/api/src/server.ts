/**
 * EbbaTrust API entry point.
 *
 * Boot order is deliberate: configuration is validated, adapters are constructed, routes are
 * registered, and only then does the server listen. A misconfigured process fails at startup
 * where it is visible, rather than on the first request that happens to need the missing value.
 */
import Fastify from 'fastify';

import { createAdapters } from './adapters/index.js';
import { loadConfig } from './config.js';
import { registerHealthRoutes } from './routes/health.js';

const startedAt = Date.now();

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.logLevel,
      /**
       * AGENTS.md 5.2 — a NIN, phone number, title number or document URL must never be
       * logged in plaintext. These are the headers most likely to carry one by accident.
       */
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-nin"]'],
        remove: true,
      },
    },
    // Trust the ingress/load balancer for the client IP, and cap request bodies.
    trustProxy: true,
    bodyLimit: 1_048_576,
  });

  const adapters = createAdapters(config.adapterMode);

  await registerHealthRoutes(app, { adapters, startedAt });

  app.setNotFoundHandler(async (request, reply) => {
    await reply.code(404).send({ error: 'not_found', path: request.url });
  });

  /**
   * One error path for the whole service. Clients get a stable shape and no internals;
   * the full error goes to the log. Never swallowed, never turned into a 200. AGENTS.md 4.5.
   */
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const status = error.statusCode ?? 500;
    await reply.code(status).send({
      error: status >= 500 ? 'internal_error' : (error.code ?? 'request_error'),
      message: status >= 500 ? 'Something went wrong. Please try again.' : error.message,
    });
  });

  // SIGTERM is how Kubernetes asks a pod to stop. Close in-flight requests before exiting.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      app.log.info({ signal }, 'shutting down');
      app
        .close()
        .then(() => process.exit(0))
        .catch((err: unknown) => {
          app.log.error({ err }, 'shutdown failed');
          process.exit(1);
        });
    });
  }

  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    { adapterMode: config.adapterMode, demoData: config.adapterMode === 'mock' },
    'ebbatrust api listening'
  );
}

main().catch((error: unknown) => {
  // The logger may not exist yet at this point, so this is the one place console is correct.
  console.error('Failed to start EbbaTrust API:', error);
  process.exit(1);
});
