import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import BlockDetail from './pages/BlockDetail';
import TxDetail from './pages/TxDetail';
import AddressDetail from './pages/AddressDetail';
import ContractInteract from './pages/ContractInteract';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-200">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/block/:id" element={<BlockDetail />} />
            <Route path="/tx/:hash" element={<TxDetail />} />
            <Route path="/address/:address" element={<AddressDetail />} />
            <Route path="/contract" element={<ContractInteract />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
