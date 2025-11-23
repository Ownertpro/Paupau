
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, hexToNumber, formatTimeAgo, weiToEko } from '../services/rpcService';
import { dbApi, DBStats } from '../services/dbService';
import { RpcBlock, RpcTransaction } from '../types';

const Dashboard: React.FC = () => {
  const [latestBlockNum, setLatestBlockNum] = useState<number>(0);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingDb, setUsingDb] = useState(false);

  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout>;

    const fetchData = async () => {
      try {
        // STRATEGY: Try Database API first (Fast). If empty or fail, use RPC (Slow).
        const dbStats = await dbApi.getStats();
        
        if (dbStats && dbStats.latest_block > 0) {
            // --- DB MODE ---
            setUsingDb(true);
            setLatestBlockNum(Number(dbStats.latest_block));
            
            const [dbBlocks, dbTxs] = await Promise.all([
                dbApi.getLatestBlocks(6),
                dbApi.getLatestTxs(8)
            ]);

            if (mounted) {
                // Map DB keys to UI expected format
                setBlocks(dbBlocks.map(b => ({
                    number: b.number, // Already decimal in DB
                    hash: b.hash,
                    miner: b.miner,
                    timestamp: b.timestamp, // Already unix timestamp
                    transactions: Array(b.tx_count).fill(0), // Fake array for length count
                    gasUsed: b.gas_used
                })));
                
                setTxs(dbTxs.map(t => ({
                    hash: t.hash,
                    from: t.from_address,
                    to: t.to_address,
                    value: t.value, // Wei string
                    blockNumber: t.block_number
                })));
                setLoading(false);
            }
        } else {
            // --- RPC FALLBACK MODE ---
            // (Previous logic)
            console.log("Database empty or unreachable. Switching to RPC Mode.");
            const blockNumHex = await api.getBlockNumber();
            const currentBlock = hexToNumber(blockNumHex);
            
            if (!mounted) return;
            setLatestBlockNum(currentBlock);
            
            const blockPromises = [];
            for (let i = 0; i < 6; i++) {
                if (currentBlock - i >= 0) {
                    blockPromises.push(
                        api.getBlockByNumber("0x" + (currentBlock - i).toString(16), true)
                           .catch(() => null)
                    );
                }
            }
            
            const fetchedBlocksResult = await Promise.all(blockPromises);
            const fetchedBlocks = fetchedBlocksResult.filter((b): b is RpcBlock => b !== null);
            
            if (!mounted) return;
            setBlocks(fetchedBlocks);

            let recentTxs: RpcTransaction[] = [];
            for (const block of fetchedBlocks) {
              if (block && block.transactions) {
                  const blockTxs = block.transactions as RpcTransaction[];
                  const txObjects = blockTxs.filter(tx => typeof tx === 'object');
                  recentTxs = [...recentTxs, ...txObjects.reverse()];
              }
              if (recentTxs.length >= 8) break;
            }
            setTxs(recentTxs.slice(0, 8));
            setLoading(false);
        }

      } catch (error: any) {
        console.error("Dashboard error:", error);
        if (mounted) {
            if (blocks.length === 0) {
                setError("Initializing...");
                retryTimer = setTimeout(() => {
                    if (mounted) fetchData();
                }, 4000);
            }
            setLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => {
        mounted = false;
        clearInterval(interval);
        clearTimeout(retryTimer);
    };
  }, []);

  if (loading && blocks.length === 0) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ekopia-500 mb-4"></div>
                <p className="text-slate-500 text-sm">Loading EKOPIA Explorer...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Network Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border-l-4 border-ekopia-500">
          <p className="text-slate-400 text-xs font-semibold uppercase">EKO PRICE</p>
          <div className="flex items-end gap-2 mt-1">
             <span className="text-xl font-bold text-white">$ --</span>
             <span className="text-xs text-slate-500">(Not listed)</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-l-4 border-purple-500">
          <p className="text-slate-400 text-xs font-semibold uppercase">LATEST BLOCK</p>
          <div className="flex items-end gap-2 mt-1">
             <span className="text-xl font-bold text-white">#{latestBlockNum}</span>
             <span className="text-xs text-slate-500">({3.0}s)</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-l-4 border-green-500">
          <p className="text-slate-400 text-xs font-semibold uppercase">DATA SOURCE</p>
          <div className="flex items-end gap-2 mt-1">
             <span className="text-xl font-bold text-white">{usingDb ? 'Indexed DB' : 'Direct RPC'}</span>
             <span className="text-xs text-slate-500">{usingDb ? 'Fast' : 'Live'}</span>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border-l-4 border-orange-500">
          <p className="text-slate-400 text-xs font-semibold uppercase">CHAIN ID</p>
          <div className="flex items-end gap-2 mt-1">
             <span className="text-xl font-bold text-white">2025</span>
             <span className="text-xs text-slate-500">(0x7e9)</span>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <div className="glass-panel rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Latest Blocks</h3>
                {usingDb && <span className="text-xs text-green-400 flex items-center gap-1"><i className="fas fa-database"></i> SQL</span>}
            </div>
            <div className="divide-y divide-gray-800">
                {blocks.map((block) => (
                    <div key={block.hash} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-gray-400 font-bold text-xs">
                                Bk
                            </div>
                            <div>
                                <Link to={`/block/${typeof block.number === 'string' && block.number.startsWith('0x') ? hexToNumber(block.number) : block.number}`} className="text-ekopia-500 hover:text-ekopia-400 font-medium text-sm">
                                    {typeof block.number === 'string' && block.number.startsWith('0x') ? hexToNumber(block.number) : block.number}
                                </Link>
                                <p className="text-xs text-slate-500">
                                    {typeof block.timestamp === 'string' ? formatTimeAgo(hexToNumber(block.timestamp)) : formatTimeAgo(block.timestamp)}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-sm text-white">
                                Miner <Link to={`/address/${block.miner}`} className="text-ekopia-500 hover:text-ekopia-400 text-xs font-mono">
                                    {block.miner.substring(0,8)}...
                                </Link>
                             </p>
                             <p className="text-xs text-slate-500">
                                {Array.isArray(block.transactions) ? block.transactions.length : 0} txns
                             </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-3 text-center border-t border-gray-800">
                <button className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">View all blocks</button>
            </div>
        </div>

        {/* Latest Txs */}
        <div className="glass-panel rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Latest Transactions</h3>
                {usingDb && <span className="text-xs text-green-400 flex items-center gap-1"><i className="fas fa-bolt"></i> SQL</span>}
            </div>
            <div className="divide-y divide-gray-800">
                {txs.map((tx) => (
                    <div key={tx.hash} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-gray-400 font-bold text-xs">
                                Tx
                            </div>
                            <div className="max-w-[140px] md:max-w-xs">
                                <Link to={`/tx/${tx.hash}`} className="text-ekopia-500 hover:text-ekopia-400 font-mono text-sm block truncate">
                                    {tx.hash.substring(0, 16)}...
                                </Link>
                                <p className="text-xs text-slate-500 truncate">
                                    From <Link to={`/address/${tx.from}`} className="text-slate-400 hover:text-white">{tx.from.substring(0,8)}...</Link>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 inline-block mb-1">
                                {typeof tx.value === 'string' && tx.value.startsWith('0x') ? weiToEko(tx.value) : (Number(tx.value) / 1e18).toFixed(6)} EKO
                             </div>
                             <p className="text-[10px] text-slate-600">
                                To {tx.to ? tx.to.substring(0,8)+'...' : 'Contract'}
                             </p>
                        </div>
                    </div>
                ))}
                {txs.length === 0 && !loading && (
                     <div className="p-8 text-center text-slate-500 text-sm">No recent transactions found</div>
                )}
            </div>
            <div className="p-3 text-center border-t border-gray-800">
                <button className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider">View all transactions</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
