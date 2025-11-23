// Re-export from the main db index to ensure compatibility with code expecting this file
import pool, { query, getClient } from './index.js';

export { query, getClient };
export default pool;
