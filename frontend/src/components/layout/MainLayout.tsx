import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <div className={`${isCollapsed ? 'pl-20' : 'pl-64'} print:pl-0 flex flex-col h-screen transition-all duration-300`}>
        {/* Topbar */}
        <header className="print:hidden h-16 flex-shrink-0 bg-white border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center bg-slate-100 rounded-lg px-3 py-1.5 w-96 border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar ordens de serviço, clientes..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            {/* Additional header actions can go here */}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 px-4 md:px-8 xl:px-12 py-6 max-w-full overflow-y-auto relative">
          <div className="mx-auto max-w-screen-2xl h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
