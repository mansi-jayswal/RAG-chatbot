import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// `next dev` re-evaluates modules on every save. A pool created at module scope
// would be rebuilt each time while the previous one keeps its sockets open,
// exhausting Postgres `max_connections` after ~20 saves. Caching on globalThis
// survives HMR (spec decision 9) — this guard is not optional.
const g = globalThis as unknown as { pool?: Pool }

const pool =
  g.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })

if (process.env.NODE_ENV !== 'production') g.pool = pool

export const db = drizzle({ client: pool, schema })
export { schema }
