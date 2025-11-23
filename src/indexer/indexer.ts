import { query, getClient } from '../db/index.js';
import { RpcBlock, RpcTransaction } from '../types/types.js';

const RPC_URL = process.env.RPC_URL || "https://rpc.ekopia.space";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Robust RPC Fetcher
const rpcCall = async (method: string, params: any[] = []) => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: Date.now()
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    } catch (error) {
        console.warn(`⚠️ RPC Fail [${method}]:`, error);
        return null;
    }
};

const hexToNumber = (hex: string): number => {
    if (!hex || hex === '0x') return 0;
    return parseInt(hex, 16);
};

const hexToBigIntStr = (hex: string): string => {
    if (!hex || hex === '0x') return "0";
    return BigInt(hex).toString();
};

export const startIndexer = async () => {
    console.log("🚀 Starting EKOPIA Indexer (PostgreSQL Mode)...");

    while (true) {
        try {
            // 1. Get Sync Status from DB
            const statusRes = await query('SELECT last_block FROM sync_status WHERE id = 1');
            
            // Initialize sync_status if not exists
            if (statusRes.rows.length === 0) {
                 await query('INSERT INTO sync_status (id, last_block) VALUES (1, -1) ON CONFLICT (id) DO NOTHING');
            }
            
            // Default to -1 so we start at block 0
            let lastSyncedBlock = Number(statusRes.rows[0]?.last_block ?? -1);

            // 2. Get Network Head from RPC
            const latestBlockHex = await rpcCall('eth_blockNumber');
            if (!latestBlockHex) {
                // RPC down or busy
                await sleep(5000);
                continue;
            }
            const networkBlock = hexToNumber(latestBlockHex);

            if (lastSyncedBlock >= networkBlock) {
                // Synced, wait longer
                await sleep(3000);
                continue;
            }

            const targetBlockNum = lastSyncedBlock + 1;
            
            // Log every 10 blocks or if near tip to avoid spam
            if (targetBlockNum % 10 === 0 || networkBlock - targetBlockNum < 5) {
                console.log(`📦 Processing Block #${targetBlockNum} / ${networkBlock}`);
            }

            // 3. Fetch Block Data (with full transactions)
            const blockData: RpcBlock = await rpcCall('eth_getBlockByNumber', [`0x${targetBlockNum.toString(16)}`, true]);
            
            if (!blockData) {
                console.warn(`⚠️ Block ${targetBlockNum} is null (reorg or delay). Retrying...`);
                await sleep(1000);
                continue;
            }

            // 4. Begin DB Transaction
            const client = await getClient();
            try {
                await client.query('BEGIN');

                // Insert Block
                await client.query(
                    `INSERT INTO blocks (number, hash, parent_hash, miner, timestamp, gas_used, gas_limit, size, tx_count, extra_data)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (number) DO NOTHING`,
                    [
                        hexToNumber(blockData.number),
                        blockData.hash,
                        blockData.parentHash,
                        blockData.miner,
                        hexToNumber(blockData.timestamp),
                        hexToBigIntStr(blockData.gasUsed),
                        hexToBigIntStr(blockData.gasLimit),
                        hexToNumber(blockData.size),
                        (Array.isArray(blockData.transactions) ? blockData.transactions.length : 0),
                        blockData.extraData
                    ]
                );

                const txs = (Array.isArray(blockData.transactions) ? blockData.transactions : []) as RpcTransaction[];
                
                // Insert Txs
                for (const tx of txs) {
                    if (typeof tx !== 'object') continue;
                    
                    await client.query(
                        `INSERT INTO transactions (hash, block_number, from_addr, to_addr, value, gas_price, gas_limit, gas_used, nonce, input_data, timestamp, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                         ON CONFLICT (hash) DO NOTHING`,
                        [
                            tx.hash,
                            hexToNumber(tx.blockNumber),
                            tx.from,
                            tx.to,
                            hexToBigIntStr(tx.value),
                            hexToBigIntStr(tx.gasPrice),
                            hexToNumber(tx.gas),
                            hexToNumber(blockData.gasUsed), // Estimate if receipt not fetched
                            hexToNumber(tx.nonce),
                            tx.input,
                            hexToNumber(blockData.timestamp),
                            true
                        ]
                    );

                    // Index Address Transactions (Sender)
                    await client.query(
                        `INSERT INTO address_transactions (address, tx_hash, block_number, direction, value, timestamp)
                         VALUES ($1, $2, $3, 'OUT', $4, $5)
                         ON CONFLICT DO NOTHING`,
                        [tx.from, tx.hash, hexToNumber(tx.blockNumber), hexToBigIntStr(tx.value), hexToNumber(blockData.timestamp)]
                    );

                    // Index Address Transactions (Receiver)
                    if (tx.to) {
                         await client.query(
                            `INSERT INTO address_transactions (address, tx_hash, block_number, direction, value, timestamp)
                             VALUES ($1, $2, $3, 'IN', $4, $5)
                             ON CONFLICT DO NOTHING`,
                            [tx.to, tx.hash, hexToNumber(tx.blockNumber), hexToBigIntStr(tx.value), hexToNumber(blockData.timestamp)]
                        );
                    }
                }

                // Update Sync Status
                await client.query('UPDATE sync_status SET last_block = $1 WHERE id = 1', [targetBlockNum]);

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(`❌ DB Error block ${targetBlockNum}:`, e);
                await sleep(5000);
            } finally {
                client.release();
            }

        } catch (e) {
            console.error("❌ Critical Loop Error:", e);
            await sleep(5000);
        }
    }
};
