import { useState, useEffect } from 'react';
import { Map, Truck, Navigation, Settings, Search, AlertCircle, SignalHigh, MapPin } from 'lucide-react';

export default function FrotaMonitoramento() {
    const [searchTerm, setSearchTerm] = useState('');
    const [vehicles, setVehicles] = useState([
        { id: 1, plate: 'ABC-1234', model: 'Scania Hidrojato', driver: 'Carlos S.', status: 'MOVIMENTO', speed: 68, lastUpdate: 'Agora', x: 20, y: 30 },
        { id: 2, plate: 'XYZ-9876', model: 'VW Constellation', driver: 'Roberto', status: 'PARADO', speed: 0, lastUpdate: '5 min', x: 75, y: 55 },
        { id: 3, plate: 'DEF-5678', model: 'Fiorino Apoio', driver: 'Ana', status: 'ALERTA', speed: 110, lastUpdate: '1 min', x: 45, y: 80 }
    ]);

    // Simulated movement
    useEffect(() => {
        const interval = setInterval(() => {
            setVehicles(prev => prev.map(v => {
                if (v.status !== 'PARADO') {
                    // Random slight movement
                    const dx = (Math.random() - 0.5) * 2;
                    const dy = (Math.random() - 0.5) * 2;
                    return { 
                        ...v, 
                        x: Math.max(5, Math.min(95, v.x + dx)), 
                        y: Math.max(5, Math.min(95, v.y + dy)) 
                    };
                }
                return v;
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const filteredVehicles = vehicles.filter(v => 
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.driver.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter">
                        <Map className="w-6 h-6 text-indigo-600" />
                        Rastreamento de Frota
                    </h1>
                    <p className="text-sm text-slate-500 font-medium italic">Monitoramento em tempo real (Mockup GPS)</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 uppercase italic">
                        <SignalHigh className="w-4 h-4" /> API Conectada
                    </span>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
                {/* Sidebar List */}
                <div className="w-80 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Buscar veículo ou placa..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold italic"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredVehicles.map(v => (
                            <div key={v.id} className="bg-white border border-slate-100 hover:border-indigo-200 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase italic">
                                            <Truck className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            {v.plate}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 uppercase font-black italic">{v.model}</p>
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 uppercase italic ${
                                        v.status === 'MOVIMENTO' ? 'bg-emerald-100 text-emerald-700' :
                                        v.status === 'PARADO' ? 'bg-slate-100 text-slate-600' :
                                        'bg-blue-900 text-white'
                                    }`}>
                                        {v.status === 'ALERTA' && <AlertCircle className="w-3 h-3" />}
                                        {v.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs mt-3 bg-slate-50 rounded p-1.5 italic">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-slate-400 uppercase font-bold">Motorista</span>
                                        <span className="font-bold text-slate-700 uppercase tracking-tighter">{v.driver}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[9px] text-slate-400 uppercase font-bold">{v.speed} km/h</span>
                                        <span className="font-medium text-slate-500 text-[10px]">{v.lastUpdate}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl relative overflow-hidden shadow-inner group">
                    {/* Grid Pattern Background to look like a map */}
                    <div 
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: `linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)`,
                            backgroundSize: '40px 40px'
                        }}
                    />
                    
                    {/* Simulated Map Roads/Zones */}
                    <div className="absolute top-1/4 left-0 right-0 h-4 bg-slate-300 opacity-20 transform -rotate-12" />
                    <div className="absolute top-0 bottom-0 left-1/3 w-6 bg-slate-300 opacity-20 transform rotate-12" />

                    {/* Vehicles Markers */}
                    {vehicles.map(v => (
                        <div 
                            key={v.id}
                            className="absolute transition-all duration-1000 ease-linear transform -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${v.x}%`, top: `${v.y}%` }}
                        >
                            <div className="relative group/pin cursor-pointer">
                                {/* Pulse effect for moving vehicles */}
                                {v.status === 'MOVIMENTO' && (
                                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-30 scale-150" />
                                )}
                                {v.status === 'ALERTA' && (
                                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-50 scale-150" />
                                )}

                                {/* Pin Icon */}
                                <div className={`relative z-10 p-2 rounded-full shadow-lg border-2 ${
                                    v.status === 'MOVIMENTO' ? 'bg-emerald-500 border-white text-white' :
                                    v.status === 'PARADO' ? 'bg-slate-400 border-white text-white' :
                                    'bg-blue-900 border-white text-white'
                                }`}>
                                    <Navigation className={`w-4 h-4 ${v.status === 'MOVIMENTO' ? 'animate-spin-slow' : ''}`} style={{ transform: `rotate(${v.x + v.y}deg)` }} />
                                </div>

                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max opacity-0 group-hover/pin:opacity-100 transition-opacity z-20 pointer-events-none">
                                    <div className="bg-slate-800 text-white text-xs rounded-lg py-1.5 px-3 shadow-xl flex flex-col items-center gap-1 italic">
                                        <span className="font-black uppercase tracking-widest">{v.plate}</span>
                                        <span className="text-[10px] text-slate-300 font-bold">{v.speed} km/h • {v.driver}</span>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Scale Reference */}
                    <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 italic">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Usina 10km</span>
                    </div>
                </div>
            </div>
            
            {/* Legend */}
            <div className="flex gap-6 justify-center py-2 italic font-black text-[10px] uppercase tracking-widest">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> <span className="text-slate-600">Em Movimento</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-400" /> <span className="text-slate-600">Parado (Pátio/Usina)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-900" /> <span className="text-slate-600">Alerta / Desvio</span></div>
            </div>
        </div>
    );
}
