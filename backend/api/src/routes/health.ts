/**
 * Health and readiness.
 *
 * `/health` is the liveness probe: is this process up. `/ready` is the readiness probe: can it
 * serve traffic. They are separate because Kubernetes treats them differently — a failing
 * liveness probe restarts the pod, a failing readiness probe only takes it out of the load
 * balancer. Wiring both to the same check turns a transient dependency blip into a restart loop.
 *
 * Both responses state whether adapters are mocked. This service should never be able to run
 * on demo data without saying so out loud. AGENTS.md 5.3.
 */
import type { FastifyInstance } from 'fastify';

import type { Adapters } from '../adapters/index.js';
import { pingDatabase, type Database } from '../db/pool.js';

interface HealthRouteOptions {
  readonly adapters: Adapters;
  readonly db: Database;
  readonly startedAt: number;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  { adapters, db, startedAt }: HealthRouteOptions
): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok' as const,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    adapterMode: adapters.mode,
    demoData: adapters.mode === 'mock',
  }));

  /**
   * Readiness reaches the database. This is the difference between the two probes doing real
   * work: liveness says the process is alive, readiness says it can actually serve a request.
   * A database that has gone away takes this pod out of the Service without restarting it.
   *
   * The failure is reported, never swallowed — a readiness probe that returns 200 while the
   * database is unreachable is how traffic keeps arriving at a pod that cannot answer it.
   */
  app.get('/ready', async (request, reply) => {
    try {
      await pingDatabase(db);
    } catch (error) {
      request.log.error({ err: error }, 'readiness check failed: database unreachable');
      return reply.code(503).send({
        status: 'not_ready' as const,
        database: 'unreachable' as const,
        adapterMode: adapters.mode,
        demoData: adapters.mode === 'mock',
      });
    }

    return {
      status: 'ready' as const,
      database: 'ok' as const,
      adapterMode: adapters.mode,
      demoData: adapters.mode === 'mock',
    };
  });
}
