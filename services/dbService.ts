// Service to interact with the Node.js/Postgres Backend

// Assumes the API is proxied or running on the same host
const API_BASE = "http://localhost:3001/api"; 

export interface DBStats {
    latest_block: number;
    total_blocks: number;
    total_txs: number;
    tps: string;
}

export const dbApi = {
    getStats: async (): Promise<DBStats | null> => {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            // Map Node API snake/camel case to Frontend types if needed
            return {
                latest_block: data.latestBlock,
                total_blocks: data.totalBlocks,
                total_txs: data.totalTxs,
                tps: data.tps
            };
        } catch (e) {
            console.warn("DB Stats failed, falling back to RPC", e);
            return null;
        }
    },

    getLatestBlocks: async (limit = 10): Promise<any[]> => {
        try {
            const res = await fetch(`${API_BASE}/blocks?limit=${limit}`);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            return data.map((b: any) => ({
                ...b,
                gas_used: b.gasUsed || b.gas_used, // Handle casing diffs
                tx_count: b.txCount || b.tx_count
            }));
        } catch (e) {
            console.warn("DB Blocks failed", e);
            return [];
        }
    },

    getLatestTxs: async (limit = 10): Promise<any[]> => {
        try {
            const res = await fetch(`${API_BASE}/txs?limit=${limit}`);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            return data.map((t: any) => ({
                ...t,
                from_address: t.from,
                to_address: t.to,
                block_number: t.block_number || t.blockNumber
            }));
        } catch (e) {
            console.warn("DB Txs failed", e);
            return [];
        }
    },

    getAddressHistory: async (address: string, limit = 50): Promise<any[]> => {
        try {
            const res = await fetch(`${API_BASE}/address/${address}/history?limit=${limit}`);
            if (!res.ok) throw new Error("API Error");
            return await res.json();
        } catch (e) {
            console.warn("DB Address History failed", e);
            return [];
        }
    }
};
