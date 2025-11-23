import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, hexToNumber, weiToEko } from '../services/rpcService';
import { RpcTransaction, RpcTxReceipt } from '../types';

const TxDetail: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [tx, setTx] = useState<RpcTransaction | null>(null);
  const [receipt, setReceipt] = useState<RpcTxReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTx = async () => {
      if (!hash) return;
      setLoading(true);
      setError(null);
      try {
        const [txData, receiptData] = await Promise.all([
          api.getTransactionByHash(hash),
          api.getTransactionReceipt(hash)
        ]);
        
        if (!txData) {
            setError("Transaction not found");
        } else {
            setTx(txData);
            setReceipt(receiptData);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch transaction");
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, [hash]);

  if (loading) return <div className="p-10 text-center text-slate-400">Loading transaction...</div>;
  if (error) return (
    <div className="p-10 text-center">
        <div className="text-red-400 font-bold text-xl mb-2">Error</div>
        <p className="text-slate-400">{error}</p>
        <Link to="/" className="text-ekopia-500 mt-4 inline-block hover:underline">Back to Home</Link>
    </div>
  );
  if (!tx) return null;

  const status = receipt?.status === '0x1' 
    ? <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/20"><i className="fas fa-check-circle mr-1"></i>Success</span>
    : <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs border border-red-500/20"><i className="fas fa-times-circle mr-1"></i>Failed</span>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-white mb-4">Transaction Details</h2>

      <div className="glass-panel rounded-xl overflow-hidden p-6 space-y-4">
        <Row label="Transaction Hash" value={tx.hash} isMono />
        <Row label="Status" value={receipt ? status : 'Pending'} />
        <Row label="Block" value={
            tx.blockNumber ? (
                <Link to={`/block/${hexToNumber(tx.blockNumber)}`} className="text-ekopia-500 hover:text-ekopia-400">
                    {hexToNumber(tx.blockNumber)}
                </Link>
            ) : <span className="text-yellow-500">Pending</span>
        } />
        
        <div className="my-4 border-t border-gray-700"></div>

        <Row label="From" value={
            <Link to={`/address/${tx.from}`} className="text-ekopia-500 hover:text-ekopia-400 font-mono">
                {tx.from}
            </Link>
        } />
        <Row label="To" value={
            tx.to ? (
                <Link to={`/address/${tx.to}`} className="text-ekopia-500 hover:text-ekopia-400 font-mono">
                    {tx.to}
                </Link>
            ) : (
                <span className="text-slate-400 font-mono">Contract Creation {receipt?.contractAddress && <Link to={`/address/${receipt.contractAddress}`} className="text-ekopia-500 ml-2">[{receipt.contractAddress}]</Link>}</span>
            )
        } />
        
        <div className="my-4 border-t border-gray-700"></div>

        <Row label="Value" value={<span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">♦ {weiToEko(tx.value)} EKO</span>} />
        <Row label="Transaction Fee" value={receipt ? `${(hexToNumber(receipt.gasUsed) * (hexToNumber(tx.gasPrice) / 1e18)).toFixed(8)} EKO` : '-'} />
        <Row label="Gas Price" value={`${(hexToNumber(tx.gasPrice) / 1e9).toFixed(2)} Gwei`} />
        <Row label="Gas Limit" value={hexToNumber(tx.gas).toLocaleString()} />
        <Row label="Gas Used by Txn" value={receipt ? `${hexToNumber(receipt.gasUsed).toLocaleString()} (${((hexToNumber(receipt.gasUsed) / hexToNumber(tx.gas)) * 100).toFixed(2)}%)` : '-'} />
        
        <div className="my-4 border-t border-gray-700"></div>

        <Row label="Nonce" value={hexToNumber(tx.nonce)} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-1">
            <div className="text-slate-400 text-sm font-medium">Input Data:</div>
            <div className="md:col-span-2">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded font-mono text-xs text-slate-400 break-all max-h-40 overflow-y-auto">
                    {tx.input}
                </div>
            </div>
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

export default TxDetail;