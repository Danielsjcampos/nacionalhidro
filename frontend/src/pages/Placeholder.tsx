import React from 'react';
import { Construction } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
        <Construction className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <p className="text-slate-500 max-w-md">
        Este módulo está em desenvolvimento como parte da expansão do sistema Nacional Hidro. 
        Em breve você terá acesso a todas as funcionalidades de {title.toLowerCase()}.
      </p>
    </div>
  );
}
