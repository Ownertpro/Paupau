import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-800 bg-[#0f172a] mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-slate-500 text-sm">
          © {new Date().getFullYear()} EKOPIA Chain Explorer. Built with React & Tailwind.
        </p>
        <p className="text-xs text-slate-600 mt-2">
          RPC: https://rpc.ekopia.space | Chain ID: 2025
        </p>
      </div>
    </footer>
  );
};

export default Footer;
