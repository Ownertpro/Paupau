export interface DBBlock {
    number: number;
    hash: string;
    parent_hash: string;
    miner: string;
    timestamp: number;
    gas_used: string;
    gas_limit: string;
    size: number;
    tx_count: number;
    extra_data: string;
}

export interface DBTransaction {
    hash: string;
    block_number: number;
    from_addr: string;
    to_addr: string | null;
    value: string;
    gas_price: string;
    gas_limit: string;
    gas_used: string;
    nonce: number;
    input_data: string;
    status: boolean;
    timestamp: number;
}

export interface RpcBlock {
    number: string;
    hash: string;
    parentHash: string;
    miner: string;
    timestamp: string;
    gasUsed: string;
    gasLimit: string;
    size: string;
    extraData: string;
    transactions: RpcTransaction[] | string[];
}

export interface RpcTransaction {
    hash: string;
    blockNumber: string;
    from: string;
    to: string | null;
    value: string;
    gas: string;
    gasPrice: string;
    input: string;
    nonce: string;
}

export interface SyncStatus {
    last_block: number;
}
