import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, hexToNumber, formatTimeAgo, weiToEko } from '../services/rpcService';
import { RpcBlock, RpcTransaction } from '../types';

const BlockDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [block, setBlock] = useState<RpcBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlock = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        let blockData;
        if (id.startsWith('0x')) {
          blockData = await api.getBlockByHash(id, true);
        } else {
          // Ensure valid number
          const num = Number(id);
          if (isNaN(num)) throw new Error("Invalid block number");
          const hexNum = "0x" + num.toString(16);
          blockData = await api.getBlockByNumber(hexNum, true);
        }
        
        if (!blockData) {
            setError("Block not found");
        } else {
            setBlock(blockData);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch block");
      } finally {
        setLoading(false);
      }
    };
    fetchBlock();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading block data...</div>;
  if (error) return (
      <div className="p-10 text-center">
          <div className="text-red-400 font-bold text-xl mb-2">Error</div>
          <p className="text-slate-400">{error}</p>
          <Link to="/" className="text-ekopia-500 mt-4 inline-block hover:underline">Back to Home</Link>
      </div>
  );
  if (!block) return null;

  const blockNumber = hexToNumber(block.number);
  const txs = block.transactions as RpcTransaction[];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
         <h2 className="text-xl font-bold text-white">Block <span className="text-slate-400">#{blockNumber}</span></h2>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden p-6 space-y-4">
        <Row label="Block Height" value={blockNumber.toString()} />
        <Row label="Timestamp" value={`${formatTimeAgo(hexToNumber(block.timestamp))} (${new Date(hexToNumber(block.timestamp) * 1000).toUTCString()})`} />
        <Row label="Status" value={<span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/20">Finalized</span>} />
        <Row label="Transactions" value={`${txs.length} transactions`} />
        
        <div className="my-4 border-t border-gray-700"></div>

        <Row label="Hash" value={block.hash} isMono />
        <Row label="Parent Hash" value={
            <Link to={`/block/${block.parentHash}`} className="text-ekopia-500 hover:text-ekopia-400 font-mono">
                {block.parentHash}
            </Link>
        } />
        <Row label="Miner" value={
             <Link to={`/address/${block.miner}`} className="text-ekopia-500 hover:text-ekopia-400 font-mono">
                 {block.miner}
             </Link>
        } />
        <Row label="Difficulty" value={hexToNumber(block.difficulty).toLocaleString()} />
        <Row label="Total Difficulty" value={BigInt(block.totalDifficulty).toString()} />
        <Row label="Size" value={`${hexToNumber(block.size).toLocaleString()} bytes`} />
        <Row label="Gas Used" value={`${hexToNumber(block.gasUsed).toLocaleString()} (${((hexToNumber(block.gasUsed) / hexToNumber(block.gasLimit)) * 100).toFixed(2)}%)`} />
        <Row label="Gas Limit" value={hexToNumber(block.gasLimit).toLocaleString()} />
        <Row label="Extra Data" value={block.extraData !== '0x' ? <span className="break-all">{block.extraData}</span> : '0x'} isMono />
      </div>

      <div className="glass-panel rounded-xl overflow-hidden p-6">
        <h3 className="font-bold text-white mb-4">Transactions</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/50 text-slate-400 border-b border-gray-700">
                    <tr>
                        <th className="p-3">Tx Hash</th>
                        <th className="p-3">From</th>
                        <th className="p-3">To</th>
                        <th className="p-3 text-right">Value (EKO)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {txs.map(tx => (
                        <tr key={tx.hash} className="hover:bg-slate-800/30">
                            <td className="p-3 font-mono">
                                <Link to={`/tx/${tx.hash}`} className="text-ekopia-500 hover:text-ekopia-400">
                                    {tx.hash.substring(0, 14)}...
                                </Link>
                            </td>
                            <td className="p-3 font-mono">
                                <Link to={`/address/${tx.from}`} className="text-ekopia-500 hover:text-ekopia-400">
                                    {tx.from.substring(0, 10)}...
                                </Link>
                            </td>
                            <td className="p-3 font-mono">
                                {tx.to ? (
                                    <Link to={`/address/${tx.to}`} className="text-ekopia-500 hover:text-ekopia-400">
                                        {tx.to.substring(0, 10)}...
                                    </Link>
                                ) : (
                                    <span className="text-slate-500">Contract Creation</span>
                                )}
                            </td>
                            <td className="p-3 text-right text-slate-300">
                                {weiToEko(tx.value)}
                            </td>
                        </tr>
                    ))}
                    {txs.length === 0 && (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-500">No transactions in this block</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; isMono?: boolean }> = ({ label, value, isMono }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-1">
        <div className="text-slate-400 text-sm font-medium flex items-center">
            <i className="far fa-question-circle mr-2 opacity-50"></i> {label}:
        </div>
        <div className={`md:col-span-2 text-slate-200 text-sm break-all ${isMono ? 'font-mono' : ''}`}>
            {value}
        </div>
    </div>
);

export default BlockDetail;