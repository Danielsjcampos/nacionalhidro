import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import OS from './pages/OS';
import EstoqueEquipamentos from './pages/EstoqueEquipamentos';
import Logistica from './pages/Logistica';

import Manutencao from './pages/Manutencao';
import Propostas from './pages/Propostas';
import Financeiro from './pages/Financeiro';
import RH from './pages/RH';
import Usuarios from './pages/Usuarios';
import Monitor from './pages/Monitor';
import Placeholder from './pages/Placeholder';
import Configuracoes from './pages/Configuracoes';
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
        <Route path="/os" element={<ProtectedRoute><OS /></ProtectedRoute>} />
        <Route path="/logistica" element={<ProtectedRoute><Logistica /></ProtectedRoute>} />
        <Route path="/manutencao" element={<ProtectedRoute><Manutencao /></ProtectedRoute>} />
        <Route path="/estoque" element={<ProtectedRoute><EstoqueEquipamentos /></ProtectedRoute>} />
        <Route path="/propostas" element={<ProtectedRoute><Propostas /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
        <Route path="/rh" element={<ProtectedRoute><RH /></ProtectedRoute>} />

        <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
        <Route path="/monitor" element={<ProtectedRoute><Monitor /></ProtectedRoute>} />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
