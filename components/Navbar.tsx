import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, hexToNumber } from '../services/rpcService';

const Navbar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    const term = searchTerm.trim();
    
    try {
      // 1. Check if Address (42 chars, starts with 0x)
      if (/^0x[a-fA-F0-9]{40}$/.test(term)) {
        navigate(`/address/${term}`);
      } 
      // 2. Check if Transaction (66 chars, starts with 0x)
      else if (/^0x[a-fA-F0-9]{64}$/.test(term)) {
        // Could be block hash or tx hash. Try tx first.
        const tx = await api.getTransactionByHash(term);
        if (tx) {
          navigate(`/tx/${term}`);
        } else {
          // Try block
          const block = await api.getBlockByHash(term);
          if (block) {
            navigate(`/block/${term}`);
          }
        }
      } 
      // 3. Check if Block Number (digits)
      else if (/^\d+$/.test(term)) {
        navigate(`/block/${term}`);
      }
      else {
        alert("Invalid search format");
      }
    } catch (err) {
      console.error(err);
      alert("Search failed or not found");
    } finally {
      setLoading(false);
      setSearchTerm('');
    }
  };

  return (
    <nav className="border-b border-gray-800 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
             <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-ekopia-600 rounded-lg flex items-center justify-center text-white font-bold">
                  E
                </div>
                <span className="text-xl font-bold tracking-tight text-white">EKOPIA<span className="text-ekopia-500">SCAN</span></span>
             </Link>
             <div className="hidden md:flex items-center gap-6 ml-8 text-sm font-medium text-gray-300">
                <Link to="/" className="hover:text-ekopia-400 transition-colors">Home</Link>
                <Link to="/contract" className="hover:text-ekopia-400 transition-colors">Interact</Link>
             </div>
          </div>

          <div className="flex-1 max-w-lg ml-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search by Address, Txn Hash, Block..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-ekopia-500 focus:ring-1 focus:ring-ekopia-500 transition-all text-white placeholder-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                disabled={loading}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
