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

interface HealthRouteOptions {
  readonly adapters: Adapters;
  readonly startedAt: number;
}

export async function registerHealthRoutes(
  app: FastifyInstance,
  { adapters, startedAt }: HealthRouteOptions
): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok' as const,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    adapterMode: adapters.mode,
    demoData: adapters.mode === 'mock',
  }));

  app.get('/ready', async () => ({
    status: 'ready' as const,
    adapterMode: adapters.mode,
    demoData: adapters.mode === 'mock',
  }));
}
