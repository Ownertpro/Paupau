import { query, getClient } from '../db/prisma';
import { RpcBlock, RpcTransaction } from '../types/types';

const RPC_URL = "https://rpc.ekopia.space";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rpcCall = async (method: string, params: any[] = []) => {
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method,
                params,
                id: 1
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    } catch (error) {
        // console.error(`RPC Error [${method}]:`, error);
        return null;
    }
};

const hexToNumber = (hex: string) => parseInt(hex, 16);

export const startIndexer = async () => {
    console.log("Starting Indexer...");

    while (true) {
        try {
            // 1. Get Sync Status
            const statusRes = await query('SELECT last_block FROM sync_status WHERE id = 1');
            let lastSyncedBlock = Number(statusRes.rows[0]?.last_block ?? -1);

            // 2. Get Network Head
            const latestBlockHex = await rpcCall('eth_blockNumber');
            if (!latestBlockHex) {
                await sleep(5000);
                continue;
            }
            const networkBlock = hexToNumber(latestBlockHex);

            if (lastSyncedBlock >= networkBlock) {
                // Synced, wait for next block
                await sleep(3000);
                continue;
            }

            const targetBlockNum = lastSyncedBlock + 1;
            console.log(`Processing Block #${targetBlockNum} / ${networkBlock}`);

            // 3. Fetch Block Data
            const blockData: RpcBlock = await rpcCall('eth_getBlockByNumber', [`0x${targetBlockNum.toString(16)}`, true]);
            if (!blockData) {
                console.warn(`Block ${targetBlockNum} not found`);
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
                        hexToNumber(blockData.gasUsed),
                        hexToNumber(blockData.gasLimit),
                        hexToNumber(blockData.size),
                        (blockData.transactions as RpcTransaction[]).length,
                        blockData.extraData
                    ]
                );

                const txs = blockData.transactions as RpcTransaction[];
                const addressesToUpdate = new Set<string>();
                if (blockData.miner) addressesToUpdate.add(blockData.miner);

                // Insert Txs
                for (const tx of txs) {
                    await client.query(
                        `INSERT INTO transactions (hash, block_number, from_addr, to_addr, value, gas_price, gas_limit, gas_used, nonce, input_data, timestamp, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                         ON CONFLICT (hash) DO NOTHING`,
                        [
                            tx.hash,
                            hexToNumber(tx.blockNumber),
                            tx.from,
                            tx.to,
                            BigInt(tx.value).toString(),
                            BigInt(tx.gasPrice).toString(),
                            hexToNumber(tx.gas),
                            hexToNumber(blockData.gasUsed), // Approx for now, needs receipt for exact
                            hexToNumber(tx.nonce),
                            tx.input,
                            hexToNumber(blockData.timestamp),
                            true // Assume success for fast sync, real indexer needs receipts
                        ]
                    );

                    // Update Address Transaction Log
                    // OUT
                    await client.query(
                        `INSERT INTO address_transactions (address, tx_hash, block_number, direction, value, timestamp)
                         VALUES ($1, $2, $3, 'OUT', $4, $5)`,
                        [tx.from, tx.hash, hexToNumber(tx.blockNumber), BigInt(tx.value).toString(), hexToNumber(blockData.timestamp)]
                    );
                    addressesToUpdate.add(tx.from);

                    // IN
                    if (tx.to) {
                         await client.query(
                            `INSERT INTO address_transactions (address, tx_hash, block_number, direction, value, timestamp)
                             VALUES ($1, $2, $3, 'IN', $4, $5)`,
                            [tx.to, tx.hash, hexToNumber(tx.blockNumber), BigInt(tx.value).toString(), hexToNumber(blockData.timestamp)]
                        );
                        addressesToUpdate.add(tx.to);
                    }
                }

                // Update Balances (Optimistic/Lazy update can be done here)
                // For performance, we might limit this or put in a queue. 
                // For this request, we update them immediately.
                for (const addr of addressesToUpdate) {
                    const balHex = await rpcCall('eth_getBalance', [addr, 'latest']);
                    const countHex = await rpcCall('eth_getTransactionCount', [addr, 'latest']);
                    if (balHex && countHex) {
                        await client.query(
                            `INSERT INTO addresses (address, balance, tx_count, last_updated)
                             VALUES ($1, $2, $3, $4)
                             ON CONFLICT (address) DO UPDATE 
                             SET balance = EXCLUDED.balance, tx_count = EXCLUDED.tx_count, last_updated = EXCLUDED.last_updated`,
                            [
                                addr,
                                BigInt(balHex).toString(),
                                hexToNumber(countHex),
                                Date.now()
                            ]
                        );
                    }
                }

                // Update Sync Status
                await client.query('UPDATE sync_status SET last_block = $1 WHERE id = 1', [targetBlockNum]);

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(`Error processing block ${targetBlockNum}:`, e);
                await sleep(5000);
            } finally {
                client.release();
            }

        } catch (e) {
            console.error("Critical Indexer Error:", e);
            await sleep(5000);
        }
    }
};
