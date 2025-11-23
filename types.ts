export interface RpcBlock {
  number: string;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: string;
  gasLimit: string;
  gasUsed: string;
  timestamp: string;
  transactions: string[] | RpcTransaction[]; 
  uncles: string[];
}

export interface RpcTransaction {
  hash: string;
  nonce: string;
  blockHash: string | null;
  blockNumber: string | null;
  transactionIndex: string | null;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  v?: string;
  r?: string;
  s?: string;
}

export interface RpcTxReceipt {
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress: string | null;
  logs: any[];
  logsBloom: string;
  status: string; // 0x1 success, 0x0 failure
}

export interface BlockData {
  number: number;
  hash: string;
  miner: string;
  timestamp: number;
  txCount: number;
  gasUsed: string;
  gasLimit: string;
}

export interface SearchResult {
  type: 'block' | 'transaction' | 'address' | 'none';
  value: string;
}
