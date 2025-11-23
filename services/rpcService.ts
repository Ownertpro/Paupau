import { RpcBlock, RpcTransaction, RpcTxReceipt } from '../types';

const RPC_URL = "https://rpc.ekopia.space";

// Helper to parse hex
export const hexToNumber = (hex: string): number => {
  if (!hex || hex === '0x') return 0;
  try {
    return parseInt(hex, 16);
  } catch (e) {
    return 0;
  }
};

export const weiToEko = (weiHex: string): string => {
  if (!weiHex || weiHex === '0x') return "0";
  try {
    const wei = BigInt(weiHex);
    // Convert to number for display (precision is sufficient for UI)
    const eko = Number(wei) / 1e18;
    return eko.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } catch (e) {
    console.warn("Error formatting wei:", e);
    return "0";
  }
};

export const formatTimeAgo = (timestamp: number): string => {
  if (!timestamp) return '-';
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

// Generic RPC Fetcher with Retry Logic
async function rpcCall<T>(method: string, params: any[] = [], retries = 2): Promise<T> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      credentials: 'omit', // Important for avoiding CORS issues with some configs
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id: Math.floor(Math.random() * 100000), // Random ID to prevent caching collision
      }),
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.error) {
      console.error(`RPC Error [${method}]:`, data.error);
      throw new Error(data.error.message || "RPC Error");
    }
    return data.result as T;
  } catch (error: any) {
    // Retry on network errors or timeouts
    if (retries > 0 && (error.name === 'AbortError' || error.message === 'Failed to fetch' || error.message.includes('Network'))) {
        console.warn(`Retrying ${method}... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 1500)); // Wait 1.5s before retry
        return rpcCall<T>(method, params, retries - 1);
    }

    console.error(`Fetch error for ${method}:`, error);
    
    if (error.name === 'AbortError') {
       throw new Error("Connection timed out. RPC node is slow.");
    }
    if (error.message === 'Failed to fetch') {
       throw new Error("Connection failed. Check your internet or CORS settings.");
    }
    throw error;
  }
}

export const api = {
  getBlockNumber: () => rpcCall<string>("eth_blockNumber"),
  
  getBlockByNumber: (numberHex: string, fullTxs: boolean = false) => 
    rpcCall<RpcBlock>("eth_getBlockByNumber", [numberHex, fullTxs]),
    
  getBlockByHash: (hash: string, fullTxs: boolean = false) =>
    rpcCall<RpcBlock>("eth_getBlockByHash", [hash, fullTxs]),

  getTransactionByHash: (hash: string) => 
    rpcCall<RpcTransaction>("eth_getTransactionByHash", [hash]),

  getTransactionReceipt: (hash: string) => 
    rpcCall<RpcTxReceipt>("eth_getTransactionReceipt", [hash]),

  getBalance: (address: string) => 
    rpcCall<string>("eth_getBalance", [address, "latest"]),

  getTransactionCount: (address: string) => 
    rpcCall<string>("eth_getTransactionCount", [address, "latest"]),

  call: (to: string, data: string) => 
    rpcCall<string>("eth_call", [{ to, data }, "latest"]),
};