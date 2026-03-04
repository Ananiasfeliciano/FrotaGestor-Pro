
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
  Settings,
  Monitor,
  Globe
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
import { readStorage } from './utils/storage';
import { syncWrite, syncRead, syncInitialPush, syncDisconnectAll } from './utils/syncStorage';
import { useSyncState } from './utils/useSyncState';
import { isFirebaseConfigured } from './utils/firebase';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [logs, setLogs] = useSyncState<AuditLog[]>('frota_logs', []);
  const [syncStatus, setSyncStatus] = useState<'offline' | 'online' | 'syncing'>(
    isFirebaseConfigured() ? 'syncing' : 'offline'
  );

  // ── Detectar largura da tela ──────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches) setIsSidebarOpen(false);
    };
    handler(mq); // estado inicial
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Inicializar sincronização Firebase ──────────────────
  useEffect(() => {
    if (isFirebaseConfigured()) {
      syncInitialPush()
        .then(() => setSyncStatus('online'))
        .catch(() => setSyncStatus('offline'));
    }
    return () => syncDisconnectAll();
  }, []);

  // Função auxiliar para registrar logs de sistema
  const addLog = (action: string, module: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      action,
      module,
      details,
      timestamp: new Date().toLocaleString('pt-BR')
    };
    const updatedLogs = [newLog, ...logs].slice(0, 100);
    setLogs(updatedLogs);
  };

  useEffect(() => {
    const session = readStorage<User | null>('frota_user', null);
    // Verificar expiração da sessão (8h)
    if (session && session._expiresAt && Date.now() > session._expiresAt) {
      localStorage.removeItem('frota_user');
      setCurrentUser(null);
    } else {
      setCurrentUser(session);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('frota_user');
    setCurrentUser(null);
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobile) setIsSidebarOpen(false);
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
      {/* ── Overlay (mobile) ─────────────────────── */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ──────────────────────────────── */}
      <aside className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative z-20'}
        ${isSidebarOpen ? (isMobile ? 'w-64' : 'w-64') : (isMobile ? '-translate-x-full w-64' : 'w-20')}
        transition-all duration-300 bg-slate-900 text-white flex flex-col shadow-xl
      `}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && !isMobile && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0">FG</div>
            {(isSidebarOpen || isMobile) && <span className="font-bold text-lg tracking-tight">FrotaGestor Pro</span>}
          </div>
          {isMobile && isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-md">
              <X size={20} className="text-slate-400" />
            </button>
          )}
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${!isSidebarOpen && !isMobile && 'justify-center'}`}
            >
              {item.icon}
              {(isSidebarOpen || isMobile) && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* ── Indicador de plataforma ─────────────── */}
        {(isSidebarOpen || isMobile) && (
          <div className="px-4 py-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {isElectron ? <Monitor size={12} /> : <Globe size={12} />}
              <span>{isElectron ? 'Desktop' : 'Web'}</span>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && !isMobile && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 shrink-0"><UserIcon size={20} /></div>
            {(isSidebarOpen || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
              </div>
            )}
          </div>
          {(isSidebarOpen || isMobile) && (
            <button onClick={handleLogout} className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={16} /> Sair
            </button>
          )}
        </div>
      </aside>

      {/* ── Conteúdo principal ────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-md">
              {isMobile && isSidebarOpen ? <X size={20} className="text-slate-600" /> : <Menu size={20} className="text-slate-600" />}
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 capitalize truncate">{navItems.find(i => i.id === activeTab)?.label}</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            {/* Indicador de sincronização */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              syncStatus === 'online' ? 'text-emerald-600 bg-emerald-50' :
              syncStatus === 'syncing' ? 'text-amber-600 bg-amber-50' :
              'text-slate-400 bg-slate-50'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'online' ? 'bg-emerald-500' :
                syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' :
                'bg-slate-400'
              }`} />
              {syncStatus === 'online' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : isElectron ? 'Local' : 'Offline'}
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{currentUser.name.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
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

      {/* Notificador de atualizações automáticas (somente Electron) */}
      {isElectron && <UpdateNotifier />}
    </div>
  );
};

export default App;
