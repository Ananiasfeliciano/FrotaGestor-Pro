
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  User as UserIcon, 
  ClipboardCheck, 
  Wrench, 
  Droplet, 
  ShoppingBag, 
  LogOut,
  Bell,
  Menu,
  X,
  Plus,
  FileText,
  Users,
  Activity,
  Settings
} from 'lucide-react';
import { User, UserRole, AuditLog } from './types';

// Components
import Dashboard from './components/Dashboard';
import VehicleModule from './components/VehicleModule';
import InspectionModule from './components/InspectionModule';
import ResourceModule from './components/ResourceModule';
import Login from './components/Login';
import UserModule from './components/UserModule';
import LogsModule from './components/LogsModule';
import UpdateNotifier from './components/UpdateNotifier';
import SettingsModule from './components/SettingsModule';
import { readStorage, writeStorage } from './utils/storage';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Carregar logs iniciais
  useEffect(() => {
    setLogs(readStorage<AuditLog[]>('frota_logs', []));
  }, []);

  // Função auxiliar para registrar logs de sistema
  const addLog = (action: string, module: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      module,
      details,
      timestamp: new Date().toLocaleString('pt-BR')
    };
    const updatedLogs = [newLog, ...logs].slice(0, 100);
    setLogs(updatedLogs);
    writeStorage('frota_logs', updatedLogs);
  };

  useEffect(() => {
    setCurrentUser(readStorage<User | null>('frota_user', null));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('frota_user');
    setCurrentUser(null);
  };

  if (!currentUser) return <Login onLogin={(user) => setCurrentUser(user)} />;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.ADMIN, UserRole.OPERATOR] },
    { id: 'vehicles', label: 'Veículos', icon: <Car size={20} />, roles: [UserRole.ADMIN, UserRole.OPERATOR] },
    { id: 'inspections', label: 'Inspeções', icon: <ClipboardCheck size={20} />, roles: [UserRole.ADMIN, UserRole.OPERATOR] },
    { id: 'users', label: 'Usuários', icon: <Users size={20} />, roles: [UserRole.ADMIN] },
    { id: 'logs', label: 'Logs do Sistema', icon: <Activity size={20} />, roles: [UserRole.ADMIN] },
    { id: 'stations', label: 'Postos', icon: <Droplet size={20} />, roles: [UserRole.ADMIN] },
    { id: 'workshops', label: 'Oficinas', icon: <Wrench size={20} />, roles: [UserRole.ADMIN] },
    { id: 'parts', label: 'Lojas de Peças', icon: <ShoppingBag size={20} />, roles: [UserRole.ADMIN] },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, roles: [UserRole.ADMIN] },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-slate-900 text-white flex flex-col z-20 shadow-xl`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0">FG</div>
            {isSidebarOpen && <span className="font-bold text-lg tracking-tight">FrotaGestor Pro</span>}
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${!isSidebarOpen && 'justify-center'}`}
            >
              {item.icon}
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300"><UserIcon size={20} /></div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
              </div>
            )}
          </div>
          {isSidebarOpen && (
            <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={16} /> Sair
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-md"><Menu size={20} className="text-slate-600" /></button>
            <h1 className="text-xl font-bold text-slate-800 capitalize">{navItems.find(i => i.id === activeTab)?.label}</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{currentUser.name.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'vehicles' && <VehicleModule user={currentUser} onAction={(act, det) => addLog(act, 'Veículos', det)} />}
            {activeTab === 'inspections' && <InspectionModule user={currentUser} onAction={(act, det) => addLog(act, 'Inspeções', det)} />}
            {activeTab === 'users' && <UserModule user={currentUser} onAction={(act, det) => addLog(act, 'Usuários', det)} />}
            {activeTab === 'logs' && <LogsModule logs={logs} />}
            {activeTab === 'stations' && <ResourceModule type="station" user={currentUser} onAction={(act, det) => addLog(act, 'Postos', det)} />}
            {activeTab === 'workshops' && <ResourceModule type="workshop" user={currentUser} onAction={(act, det) => addLog(act, 'Oficinas', det)} />}
            {activeTab === 'parts' && <ResourceModule type="parts" user={currentUser} onAction={(act, det) => addLog(act, 'Peças', det)} />}
            {activeTab === 'settings' && <SettingsModule user={currentUser} onAction={(act, det) => addLog(act, 'Configurações', det)} />}
          </div>
        </div>
      </main>

      {/* Notificador de atualizações automáticas */}
      <UpdateNotifier />
    </div>
  );
};

export default App;
