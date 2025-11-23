
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, weiToEko, hexToNumber, formatTimeAgo } from '../services/rpcService';
import { dbApi } from '../services/dbService';

const AddressDetail: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [balance, setBalance] = useState<string>('0');
  const [txCount, setTxCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchAddr = async () => {
      if (!address) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch independently so one failure doesn't block the other
        const [balHex, cntHex] = await Promise.all([
          api.getBalance(address).catch(e => {
              console.error("Failed balance", e);
              return "0x0";
          }),
          api.getTransactionCount(address).catch(e => {
              console.error("Failed nonce", e);
              return "0x0";
          })
        ]);
        
        setBalance(weiToEko(balHex));
        setTxCount(hexToNumber(cntHex));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch address data");
      } finally {
        setLoading(false);
      }
    };

    const fetchHistory = async () => {
        if (!address) return;
        setHistoryLoading(true);
        try {
            const txs = await dbApi.getAddressHistory(address);
            setHistory(txs);
        } catch (e) {
            console.error("Failed to fetch history", e);
        } finally {
            setHistoryLoading(false);
        }
    };

    fetchAddr();
    fetchHistory();
  }, [address]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading address data...</div>;
  if (error) return (
    <div className="p-10 text-center">
        <div className="text-red-400 font-bold text-xl mb-2">Error</div>
        <p className="text-slate-400">{error}</p>
        <Link to="/" className="text-ekopia-500 mt-4 inline-block hover:underline">Back to Home</Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-xl border-t-4 border-ekopia-500">
         <h2 className="text-slate-400 text-sm mb-1">Address</h2>
         <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-mono text-white break-all">{address}</span>
            <button 
                onClick={() => navigator.clipboard.writeText(address || '')}
                className="text-ekopia-500 hover:text-white p-2 rounded"
                title="Copy"
            >
                <i className="far fa-copy"></i>
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl">
            <h3 className="text-slate-400 text-sm uppercase font-bold mb-4">Overview</h3>
            <div className="space-y-4">
                <div>
                    <div className="text-slate-500 text-xs">BALANCE</div>
                    <div className="text-white text-lg font-medium flex items-center gap-2">
                        <i className="fab fa-ethereum text-slate-400"></i> {balance} EKO
                    </div>
                </div>
                <div>
                    <div className="text-slate-500 text-xs">EKO VALUE</div>
                    <div className="text-white text-sm">$0.00 <span className="text-slate-600 text-xs">(@ $0.00/EKO)</span></div>
                </div>
            </div>
        </div>
        <div className="glass-panel p-6 rounded-xl">
             <h3 className="text-slate-400 text-sm uppercase font-bold mb-4">More Info</h3>
             <div>
                <div className="text-slate-500 text-xs">TRANSACTIONS SENT (NONCE)</div>
                <div className="text-white text-lg font-medium">{txCount}</div>
             </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-panel rounded-xl overflow-hidden min-h-[400px]">
          <div className="flex border-b border-gray-700">
              <button className="px-6 py-3 text-ekopia-500 border-b-2 border-ekopia-500 font-medium text-sm">
                  Transactions {history.length > 0 && `(${history.length})`}
              </button>
              {/* Future tabs can be added here */}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-900/50 text-slate-400 border-b border-gray-700">
                    <tr>
                        <th className="p-4">Tx Hash</th>
                        <th className="p-4">Block</th>
                        <th className="p-4">Age</th>
                        <th className="p-4">From</th>
                        <th className="p-4">To</th>
                        <th className="p-4 text-right">Value</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {historyLoading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500"><i className="fas fa-spinner fa-spin mr-2"></i>Loading history...</td></tr>
                    ) : history.length > 0 ? (
                        history.map((tx) => {
                            const isIncoming = tx.receiver?.toLowerCase() === address?.toLowerCase();
                            return (
                                <tr key={tx.hash} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-mono">
                                        <Link to={`/tx/${tx.hash}`} className="text-ekopia-500 hover:text-ekopia-400">
                                            {tx.hash.substring(0, 14)}...
                                        </Link>
                                    </td>
                                    <td className="p-4">
                                        <Link to={`/block/${tx.block}`} className="text-slate-300 hover:text-white">
                                            {tx.block}
                                        </Link>
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">
                                        {formatTimeAgo(tx.ts)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {isIncoming ? (
                                                <Link to={`/address/${tx.sender}`} className="text-ekopia-500 hover:text-ekopia-400 font-mono truncate max-w-[120px]">
                                                    {tx.sender.substring(0,10)}...
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400 font-mono">
                                                    {tx.sender.substring(0,10)}...
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {!isIncoming ? (
                                                <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 rounded text-[10px] uppercase font-bold">OUT</span>
                                            ) : (
                                                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 rounded text-[10px] uppercase font-bold">IN</span>
                                            )}
                                            {tx.receiver ? (
                                                <Link to={`/address/${tx.receiver}`} className={`font-mono truncate max-w-[120px] ${!isIncoming ? 'text-ekopia-500 hover:text-ekopia-400' : 'text-slate-400'}`}>
                                                    {tx.receiver.substring(0,10)}...
                                                </Link>
                                            ) : (
                                                <span className="text-slate-500">Contract Creation</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className="text-slate-300">
                                            {(Number(tx.value) / 1e18).toFixed(6)} EKO
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={6} className="p-12 text-center">
                                <div className="text-slate-500 mb-2"><i className="fas fa-inbox text-3xl opacity-50"></i></div>
                                <div className="text-slate-400 text-sm">No transactions found in database for this address.</div>
                                <div className="text-slate-600 text-xs mt-1">If this address is new, the indexer might not have caught up yet.</div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default AddressDetail;
