import React, { useState } from 'react';

export default function Monitor() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="h-[calc(100vh-100px)] w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 relative">
       {loading && (
           <div className="absolute inset-0 flex items-center justify-center text-slate-400 gap-3 bg-slate-900 z-10">
               <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-sm font-mono">Conectando ao terminal de telemetria...</span>
           </div>
       )}
       <iframe 
          src="http://localhost:3000/monitor.html" 
          className="w-full h-full border-none"
          onLoad={() => setLoading(false)}
          title="Backend Monitor"
       />
    </div>
  );
}
