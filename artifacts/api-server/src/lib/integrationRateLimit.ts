import crypto from "node:crypto";

export type RateLimitConfiguration =
  | { state: "disabled" }
  | {
      state: "enabled";
      limit: number;
      windowSeconds: number;
      hashKey: string;
    }
  | { state: "invalid" };

export type RateLimitDecision = {
  allowed: boolean;
  count: number;
  resetAt: Date;
};

export interface RateLimitRepository {
  consume(input: {
    scope: string;
    keyHash: string;
    limit: number;
    windowSeconds: number;
  }): Promise<RateLimitDecision>;
}

type QueryExecutor = {
  query(
    text: string,
    values: Array<string | number>,
  ): Promise<{ rows: Array<{ count: number | string; reset_at: Date | string }> }>;
};

function positiveInteger(value: string | undefined, maximum: number): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export function loadRateLimitConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitConfiguration {
  if (env.NEXT_DURABLE_RATE_LIMIT_ENABLED !== "true") {
    return { state: "disabled" };
  }
  const limit = positiveInteger(env.NEXT_DURABLE_RATE_LIMIT_MAX_REQUESTS, 10_000);
  const windowSeconds = positiveInteger(
    env.NEXT_DURABLE_RATE_LIMIT_WINDOW_SECONDS,
    86_400,
  );
  const hashKey = env.NEXT_DURABLE_RATE_LIMIT_HASH_KEY;
  if (!limit || !windowSeconds || !hashKey || hashKey.length < 32) {
    return { state: "invalid" };
  }
  return { state: "enabled", limit, windowSeconds, hashKey };
}

export function rateLimitKeyHash(hashKey: string, value: string): string {
  return crypto.createHmac("sha256", hashKey).update(value).digest("hex");
}

export class PostgresRateLimitRepository implements RateLimitRepository {
  constructor(private readonly executor: QueryExecutor) {}

  async consume(input: {
    scope: string;
    keyHash: string;
    limit: number;
    windowSeconds: number;
  }): Promise<RateLimitDecision> {
    const result = await this.executor.query(
      `
        WITH bucket AS (
          SELECT to_timestamp(
            floor(extract(epoch FROM clock_timestamp()) / $3::integer) * $3::integer
          ) AS window_start
        )
        INSERT INTO integration_rate_limit_buckets (
          scope, key_hash, window_start, count, updated_at
        )
        SELECT $1, $2, bucket.window_start, 1, clock_timestamp()
        FROM bucket
        ON CONFLICT (scope, key_hash, window_start)
        DO UPDATE SET
          count = integration_rate_limit_buckets.count + 1,
          updated_at = clock_timestamp()
        RETURNING
          count,
          window_start + ($3::integer * interval '1 second') AS reset_at
      `,
      [input.scope, input.keyHash, input.windowSeconds],
    );
    const row = result.rows[0];
    if (!row) throw new Error("rate_limit_repository_empty_result");
    const count = Number(row.count);
    const resetAt = new Date(row.reset_at);
    if (!Number.isSafeInteger(count) || Number.isNaN(resetAt.getTime())) {
      throw new Error("rate_limit_repository_invalid_result");
    }
    return { allowed: count <= input.limit, count, resetAt };
  }
}

const lazyDatabaseExecutor: QueryExecutor = {
  async query(text, values) {
    const { pool } = await import("@workspace/db");
    const result = await pool.query(text, values);
    return {
      rows: result.rows as Array<{
        count: number | string;
        reset_at: Date | string;
      }>,
    };
  },
};

export const integrationRateLimitRepository =
  new PostgresRateLimitRepository(lazyDatabaseExecutor);