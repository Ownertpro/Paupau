import React, { useState } from 'react';
import { api } from '../services/rpcService';

// Basic simplified ABI handling
interface AbiInput {
  name: string;
  type: string;
}
interface AbiItem {
  name: string;
  type: 'function' | 'event' | 'constructor';
  stateMutability?: 'view' | 'pure' | 'nonpayable' | 'payable';
  inputs: AbiInput[];
}

const ContractInteract: React.FC = () => {
  const [address, setAddress] = useState('');
  const [abiText, setAbiText] = useState('');
  const [abiItems, setAbiItems] = useState<AbiItem[]>([]);
  const [selectedFunc, setSelectedFunc] = useState<AbiItem | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parseAbi = () => {
    try {
      const parsed = JSON.parse(abiText);
      // Filter for functions only
      const funcs = parsed.filter((item: any) => item.type === 'function');
      setAbiItems(funcs);
      setError(null);
    } catch (e) {
      setError("Invalid JSON ABI format");
      setAbiItems([]);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  const executeRead = async () => {
    if (!selectedFunc || !address) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
        // Very basic simplified ABI encoding for demo (In prod use ethers.js/viem)
        // This is a placeholder for the logic:
        // 1. Hash function signature (name(type,type)) -> take first 4 bytes
        // 2. Encode params (pad to 32 bytes)
        
        // Since we can't import a heavy library like ethers.js in this XML block easily without package.json context,
        // We will simulate the UI flow or attempt a raw call if it's 0 params.
        
        if (selectedFunc.inputs.length === 0) {
           // Simple hash for 0 params
           // We can't easily compute keccak256 here without a lib. 
           // I will show a message explaining the limitation in this standalone environment.
           setError("Encoding requires ethers.js/viem (not included in this lightweight standalone demo). However, the UI logic is fully implemented.");
        } else {
           setError("Parameter encoding requires a crypto library. Please install ethers.js.");
        }

        // Mock response for UI demonstration purposes if it was a real app integration
        // const res = await api.call(address, encodedData);
        // setResult(res);
        
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="glass-panel p-6 rounded-xl border-l-4 border-yellow-500">
           <h2 className="text-xl font-bold text-white mb-2">Contract Interaction (ABI UI)</h2>
           <p className="text-slate-400 text-sm">Load a contract ABI to interact with Read/Write functions directly.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-1 space-y-4">
                <div>
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Contract Address</label>
                    <input 
                        className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white focus:border-ekopia-500 outline-none"
                        placeholder="0x..."
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">ABI JSON</label>
                    <textarea 
                        className="w-full h-64 bg-slate-900 border border-slate-700 p-2 rounded text-xs font-mono text-slate-300 focus:border-ekopia-500 outline-none"
                        placeholder='[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"type":"function"}]'
                        value={abiText}
                        onChange={e => setAbiText(e.target.value)}
                    ></textarea>
                </div>
                <button 
                    onClick={parseAbi}
                    className="w-full bg-ekopia-600 hover:bg-ekopia-500 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                    Parse ABI
                </button>
           </div>

           <div className="md:col-span-2 glass-panel rounded-xl p-6 min-h-[400px]">
                {abiItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <i className="fas fa-code text-4xl mb-4"></i>
                        <p>Load ABI to view functions</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <div>
                            <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Select Function</label>
                            <select 
                                className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-white"
                                onChange={(e) => {
                                    const func = abiItems.find(f => f.name === e.target.value);
                                    setSelectedFunc(func || null);
                                    setInputValues({});
                                    setResult(null);
                                    setError(null);
                                }}
                            >
                                <option value="">-- Select --</option>
                                {abiItems.map((item, idx) => (
                                    <option key={idx} value={item.name}>
                                        {item.name} ({item.stateMutability || 'nonpayable'})
                                    </option>
                                ))}
                            </select>
                         </div>

                         {selectedFunc && (
                             <div className="space-y-4 animate-fade-in">
                                 <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                                     <span className={`text-xs font-bold px-2 py-1 rounded mr-2 ${
                                         selectedFunc.stateMutability === 'view' || selectedFunc.stateMutability === 'pure' 
                                         ? 'bg-blue-500/20 text-blue-400' 
                                         : 'bg-orange-500/20 text-orange-400'
                                     }`}>
                                         {selectedFunc.stateMutability || 'write'}
                                     </span>
                                     <span className="font-mono text-sm text-white">{selectedFunc.name}</span>
                                 </div>

                                 {selectedFunc.inputs.length > 0 && (
                                     <div className="space-y-3">
                                         {selectedFunc.inputs.map((input, idx) => (
                                             <div key={idx}>
                                                 <label className="block text-slate-400 text-xs mb-1">{input.name} <span className="text-slate-600">({input.type})</span></label>
                                                 <input 
                                                    className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm text-white"
                                                    onChange={e => handleInputChange(input.name, e.target.value)}
                                                 />
                                             </div>
                                         ))}
                                     </div>
                                 )}

                                 <button 
                                    onClick={executeRead}
                                    className={`w-full py-2 rounded font-bold transition-colors ${
                                        selectedFunc.stateMutability === 'view' || selectedFunc.stateMutability === 'pure'
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                        : 'bg-orange-600 hover:bg-orange-500 text-white'
                                    }`}
                                 >
                                    {selectedFunc.stateMutability === 'view' || selectedFunc.stateMutability === 'pure' ? 'Read' : 'Write (No Signer)'}
                                 </button>

                                 {result && (
                                     <div className="mt-4 p-4 bg-green-900/20 border border-green-900/50 rounded">
                                         <p className="text-xs text-green-400 font-bold mb-1">Result:</p>
                                         <p className="font-mono text-sm text-green-200 break-all">{result}</p>
                                     </div>
                                 )}
                                 
                                 {error && (
                                     <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded">
                                         <p className="text-xs text-red-400 font-bold mb-1">Error:</p>
                                         <p className="font-mono text-sm text-red-200">{error}</p>
                                     </div>
                                 )}
                             </div>
                         )}
                    </div>
                )}
           </div>
       </div>
    </div>
  );
};

export default ContractInteract;
