import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || "paupau_user",
    host: process.env.DB_HOST || "127.0.0.1",
    database: process.env.DB_NAME || "paupau",
    password: process.env.DB_PASSWORD || "Team-Nogardd123",
    port: Number(process.env.DB_PORT) || 5432,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Fix: Property 'exit' does not exist on type 'Process'
    (process as any).exit(-1);
});

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Uncomment for debugging queries
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
};

export const getClient = async () => {
    return await pool.connect();
};