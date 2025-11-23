import express from 'express';
import cors from 'cors';
import { query } from '../db/index.js';
import { startIndexer } from '../indexer/indexer.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start the Indexer Loop (Non-blocking)
startIndexer();

// --- Endpoints ---

// Stats
app.get('/api/stats', async (req, res) => {
    try {
        const blockRes = await query('SELECT MAX(number) as latest_block, COUNT(*) as total_blocks FROM blocks');
        const txRes = await query('SELECT COUNT(*) as total_txs FROM transactions');
        
        // Basic TPS placeholder (would need sliding window calc)
        const tps = "0.0"; 

        res.json({
            latestBlock: parseInt(blockRes.rows[0]?.latest_block || '0'),
            totalBlocks: parseInt(blockRes.rows[0]?.total_blocks || '0'),
            totalTxs: parseInt(txRes.rows[0]?.total_txs || '0'),
            tps
        });
    } catch (e) {
        console.error("Stats Error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Latest Blocks
app.get('/api/blocks', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const result = await query(
            `SELECT number, hash, miner, timestamp, tx_count, gas_used 
             FROM blocks ORDER BY number DESC LIMIT $1`, 
            [limit]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "DB Error" });
    }
});

// Latest Transactions
app.get('/api/txs', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
        const result = await query(
            `SELECT hash, block_number, from_addr as "from", to_addr as "to", value, timestamp 
             FROM transactions ORDER BY timestamp DESC LIMIT $1`, 
            [limit]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "DB Error" });
    }
});

// Address History
app.get('/api/address/:address/history', async (req, res) => {
    try {
        const { address } = req.params;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        
        // This relies on the address_transactions table for speed
        const result = await query(
            `SELECT t.hash, t.block_number as block, t.from_addr as sender, t.to_addr as receiver, t.value, t.timestamp as ts
             FROM address_transactions at
             JOIN transactions t ON at.tx_hash = t.hash
             WHERE at.address = $1
             ORDER BY at.block_number DESC 
             LIMIT $2`,
            [address, limit]
        );
        
        res.json(result.rows);
    } catch (e) {
        console.error("History Error:", e);
        res.status(500).json({ error: "DB Error" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ API Server running on port ${PORT}`);
});
