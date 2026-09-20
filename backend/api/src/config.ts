/**
 * Environment configuration, read once at boot.
 *
 * The service refuses to start on a missing required value rather than failing later on the
 * first request that needs it. AGENTS.md 4.5: in this system a late, quiet failure can end up
 * looking like a successful verification.
 *
 * Nothing here is ever logged. Several of these values are credentials.
 */

export type AdapterMode = 'mock' | 'live';

export interface Config {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly port: number;
  readonly host: string;
  readonly logLevel: string;
  /**
   * Which implementation every adapter factory returns. `live` is not buildable yet — the
   * provider stubs throw. This single value is the go-live switch described in AGENTS.md 4.3.
   */
  readonly adapterMode: AdapterMode;
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

function parsePort(raw: string): number {
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be a valid port number, received: ${raw}`);
  }
  return port;
}

function parseAdapterMode(raw: string): AdapterMode {
  if (raw === 'mock' || raw === 'live') return raw;
  throw new Error(`ADAPTER_MODE must be "mock" or "live", received: ${raw}`);
}

function parseNodeEnv(raw: string): Config['nodeEnv'] {
  if (raw === 'development' || raw === 'production' || raw === 'test') return raw;
  throw new Error(`NODE_ENV must be development, production or test, received: ${raw}`);
}

export function loadConfig(): Config {
  return {
    nodeEnv: parseNodeEnv(optional('NODE_ENV', 'development')),
    port: parsePort(optional('PORT', '8080')),
    // 0.0.0.0 rather than localhost: inside a container, localhost is unreachable from outside.
    host: optional('HOST', '0.0.0.0'),
    logLevel: optional('LOG_LEVEL', 'info'),
    adapterMode: parseAdapterMode(optional('ADAPTER_MODE', 'mock')),
  };
}

export { required };
