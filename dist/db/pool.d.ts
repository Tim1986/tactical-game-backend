import { Pool, PoolClient } from 'pg';
export declare const pool: Pool;
export declare function query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<import('pg').QueryResult<T>>;
export declare function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function checkDatabaseConnection(): Promise<void>;
//# sourceMappingURL=pool.d.ts.map