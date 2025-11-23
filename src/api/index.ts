import express from 'express';
import cors from 'cors';
import { query } from '../db/prisma';
import { startIndexer } from '../indexer/indexer';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Start Indexer in background
startIndexer();

// --- Endpoints ---

// Stats
app.get('/api/stats', async (req, res) => {
    try {
        const blockRes = await query('SELECT MAX(number) as latest_block, COUNT(*) as total_blocks FROM blocks');
        const txRes = await query('SELECT COUNT(*) as total_txs FROM transactions');
        
        res.json({
            latestBlock: parseInt(blockRes.rows[0]?.latest_block || '0'),
            totalBlocks: parseInt(blockRes.rows[0]?.total_blocks || '0'),
            totalTxs: parseInt(txRes.rows[0]?.total_txs || '0'),
            tps: "0.0" // TODO: Calc TPS
        });
    } catch (e) {
        res.status(500).json({ error: "DB Error" });
    }
});

// Latest Blocks
app.get('/api/blocks', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
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
        const limit = parseInt(req.query.limit as string) || 10;
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
        const limit = parseInt(req.query.limit as string) || 50;
        
        const result = await query(
            `SELECT tx_hash as hash, block_number as block, direction, value, timestamp as ts,
                    (SELECT from_addr FROM transactions WHERE hash = address_transactions.tx_hash) as sender,
                    (SELECT to_addr FROM transactions WHERE hash = address_transactions.tx_hash) as receiver
             FROM address_transactions 
             WHERE address = $1 
             ORDER BY block_number DESC 
             LIMIT $2`,
            [address, limit]
        );
        
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "DB Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
