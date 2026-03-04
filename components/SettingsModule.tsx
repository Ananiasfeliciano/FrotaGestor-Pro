
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpCircle,
  Database,
  Trash2,
  HardDrive,
  Info,
  Shield,
  Building2,
  Palette,
  Monitor,
  Globe,
  Save,
  RotateCcw,
  AlertTriangle,
  Copy,
  FileDown,
  FileUp,
  Bell,
  BellOff,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

interface Props {
  user: User;
  onAction: (action: string, details: string) => void;
}

// ── Interfaces de configuração ──────────────────────────────
interface AppSettings {
  companyName: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  revisionCycleDays: number;
  alertThresholdDays: number;
  oilAlertThresholdKm: number;
  maxLogsCount: number;
  autoCheckUpdates: boolean;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'SARTINFO',
  cnpj: '',
  address: '',
  phone: '',
  email: '',
  revisionCycleDays: 365,
  alertThresholdDays: 30,
  oilAlertThresholdKm: 1000,
  maxLogsCount: 100,
  autoCheckUpdates: true,
  theme: 'light',
};

// ── Chaves do banco local ──────────────────────────────────
const STORAGE_KEYS = [
  { key: 'system_users',       label: 'Usuários',         icon: <Shield size={14} /> },
  { key: 'fleet_vehicles',     label: 'Veículos',         icon: <HardDrive size={14} /> },
  { key: 'fleet_inspections',  label: 'Inspeções',        icon: <CheckCircle2 size={14} /> },
  { key: 'fleet_stations',     label: 'Postos',           icon: <Globe size={14} /> },
  { key: 'fleet_workshops',    label: 'Oficinas',         icon: <Settings size={14} /> },
  { key: 'fleet_parts',        label: 'Peças',            icon: <Database size={14} /> },
  { key: 'frota_logs',         label: 'Logs do Sistema',  icon: <Info size={14} /> },
  { key: 'frota_user',         label: 'Sessão Atual',     icon: <Shield size={14} /> },
  { key: 'app_settings',       label: 'Configurações',    icon: <Settings size={14} /> },
];

interface UpdateStatusPayload {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'idle';
  version?: string;
  percent?: number;
  message?: string;
}

const SettingsModule: React.FC<Props> = ({ user, onAction }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'alerts' | 'database' | 'update'>('general');

  // Update state
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateInfo, setUpdateInfo] = useState<UpdateStatusPayload>({ status: 'idle' });
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.updater;

  // Storage stats
  const [storageStats, setStorageStats] = useState<{ key: string; label: string; count: number; sizeKB: number }[]>([]);

  // ── Load ──────────────────────────────────────────────
  useEffect(() => {
    setSettings(readStorage<AppSettings>('app_settings', DEFAULT_SETTINGS));
    refreshStorageStats();

    if (isElectron) {
      window.electronAPI!.getVersion().then(v => setAppVersion(v));
      const cleanup = window.electronAPI!.updater.onStatus((data: any) => {
        setUpdateInfo(data);
      });
      return cleanup;
    }
  }, []);

  const refreshStorageStats = () => {
    const stats = STORAGE_KEYS.map(({ key, label }) => {
      const raw = localStorage.getItem(key);
      const sizeKB = raw ? Math.round((new Blob([raw]).size) / 1024 * 100) / 100 : 0;
      let count = 0;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          count = Array.isArray(parsed) ? parsed.length : 1;
        } catch { count = 0; }
      }
      return { key, label, count, sizeKB };
    });
    setStorageStats(stats);
  };

  // ── Save settings ─────────────────────────────────────
  const handleSave = () => {
    writeStorage('app_settings', settings);
    setSaved(true);
    onAction('CONFIGURAÇÃO', 'Configurações do sistema atualizadas.');
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetSettings = () => {
    if (!confirm('Restaurar todas as configurações para o padrão?')) return;
    setSettings(DEFAULT_SETTINGS);
    writeStorage('app_settings', DEFAULT_SETTINGS);
    onAction('CONFIGURAÇÃO', 'Configurações restauradas para o padrão.');
  };

  // ── Database actions ──────────────────────────────────
  const handleExportData = () => {
    const exportData: Record<string, any> = {};
    STORAGE_KEYS.forEach(({ key }) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { exportData[key] = JSON.parse(raw); } catch { exportData[key] = raw; }
      }
    });
    exportData._exportDate = new Date().toISOString();
    exportData._version = appVersion;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FrotaGestor-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onAction('BACKUP', 'Backup completo dos dados exportado.');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!data || typeof data !== 'object') throw new Error('Formato inválido');
          
          if (!confirm(`Importar backup de ${data._exportDate ? new Date(data._exportDate).toLocaleDateString('pt-BR') : 'data desconhecida'}?\n\nIsso SUBSTITUIRÁ todos os dados atuais.`)) return;

          STORAGE_KEYS.forEach(({ key }) => {
            if (data[key] !== undefined) {
              localStorage.setItem(key, JSON.stringify(data[key]));
            }
          });

          onAction('RESTAURAÇÃO', 'Dados restaurados a partir de backup.');
          refreshStorageStats();
          alert('Dados importados com sucesso! Recarregue a página para ver as alterações.');
        } catch (err) {
          alert('Erro ao importar: arquivo inválido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearStorage = (key: string, label: string) => {
    if (key === 'frota_user') return alert('Não é possível apagar a sessão atual.');
    if (!confirm(`Apagar todos os dados de "${label}"?\nEsta ação não pode ser desfeita.`)) return;
    localStorage.removeItem(key);
    onAction('LIMPEZA', `Dados de "${label}" removidos.`);
    refreshStorageStats();
  };

  const handleClearAllData = () => {
    if (!confirm('ATENÇÃO: Isso apagará TODOS os dados do sistema (veículos, inspeções, lançamentos, logs).\n\nDeseja continuar?')) return;
    if (!confirm('Tem certeza ABSOLUTA? Faça backup antes!')) return;
    STORAGE_KEYS.forEach(({ key }) => {
      if (key !== 'frota_user') localStorage.removeItem(key);
    });
    onAction('RESET', 'Todos os dados do sistema foram apagados.');
    refreshStorageStats();
  };

  // ── Update actions ────────────────────────────────────
  const handleCheckUpdate = async () => {
    if (!isElectron) {
      setUpdateInfo({ status: 'error', message: 'Atualizações disponíveis apenas no app desktop (Electron).' });
      return;
    }
    setUpdateInfo({ status: 'checking' });
    await window.electronAPI!.updater.check();
  };

  const handleDownloadUpdate = async () => {
    if (!isElectron) return;
    await window.electronAPI!.updater.download();
  };

  const handleInstallUpdate = () => {
    if (!isElectron) return;
    window.electronAPI!.updater.install();
  };

  // ── Total storage ─────────────────────────────────────
  const totalSizeKB = storageStats.reduce((acc, s) => acc + s.sizeKB, 0);
  const totalRecords = storageStats.reduce((acc, s) => acc + s.count, 0);

  // ── Sidebar sections ─────────────────────────────────
  const sections = [
    { id: 'general' as const, label: 'Empresa', icon: <Building2 size={18} /> },
    { id: 'alerts' as const, label: 'Alertas e Parâmetros', icon: <Bell size={18} /> },
    { id: 'database' as const, label: 'Banco de Dados', icon: <Database size={18} /> },
    { id: 'update' as const, label: 'Atualização Online', icon: <ArrowUpCircle size={18} /> },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Configurações do Sistema</h2>
            <p className="text-sm text-slate-500">Gerenciamento completo, backup e atualizações.</p>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg font-mono">v{appVersion}</div>
      </div>

      {/* Layout: Nav lateral + Conteúdo */}
      <div className="flex gap-6">
        {/* Nav Lateral */}
        <div className="w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-l-[3px] ${
                  activeSection === s.id
                    ? 'bg-blue-50 text-blue-700 border-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 border-transparent'
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* ═══════════ SEÇÃO: EMPRESA ═══════════ */}
          {activeSection === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> Dados da Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Empresa</label>
                  <input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">CNPJ</label>
                  <input value={settings.cnpj} onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Endereço</label>
                  <input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Telefone</label>
                  <input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="(00) 0000-0000" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">E-mail</label>
                  <input value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
                  {saved ? <><CheckCircle2 size={16} /> Salvo!</> : <><Save size={16} /> Salvar Configurações</>}
                </button>
                <button onClick={handleResetSettings} className="flex items-center gap-2 px-5 py-2.5 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
                  <RotateCcw size={16} /> Restaurar Padrão
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ SEÇÃO: ALERTAS ═══════════ */}
          {activeSection === 'alerts' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Bell size={18} className="text-amber-500" /> Parâmetros de Alertas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ciclo de Revisão (dias)</label>
                  <input type="number" value={settings.revisionCycleDays} onChange={(e) => setSettings({ ...settings, revisionCycleDays: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <p className="text-xs text-slate-400 mt-1">Intervalo entre revisões obrigatórias</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Antecedência do Alerta (dias)</label>
                  <input type="number" value={settings.alertThresholdDays} onChange={(e) => setSettings({ ...settings, alertThresholdDays: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <p className="text-xs text-slate-400 mt-1">Quantos dias antes de vencer gera alerta</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Alerta de Óleo (KM restantes)</label>
                  <input type="number" value={settings.oilAlertThresholdKm} onChange={(e) => setSettings({ ...settings, oilAlertThresholdKm: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <p className="text-xs text-slate-400 mt-1">Alerta quando faltarem esses KM para troca de óleo</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Limite de Logs</label>
                  <input type="number" value={settings.maxLogsCount} onChange={(e) => setSettings({ ...settings, maxLogsCount: Number(e.target.value) })} min={10} max={1000} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <p className="text-xs text-slate-400 mt-1">Máximo de registros no log de auditoria</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  {settings.autoCheckUpdates ? <Bell size={18} className="text-blue-600" /> : <BellOff size={18} className="text-slate-400" />}
                  <div>
                    <p className="text-sm font-bold text-slate-700">Verificar atualizações automaticamente</p>
                    <p className="text-xs text-slate-500">Ao abrir o sistema, verificar novas versões</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, autoCheckUpdates: !settings.autoCheckUpdates })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoCheckUpdates ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.autoCheckUpdates ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
                  {saved ? <><CheckCircle2 size={16} /> Salvo!</> : <><Save size={16} /> Salvar Parâmetros</>}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ SEÇÃO: BANCO DE DADOS ═══════════ */}
          {activeSection === 'database' && (
            <div className="space-y-6">
              {/* Estatísticas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Database size={18} className="text-emerald-600" /> Banco de Dados Local</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{totalRecords}</p>
                    <p className="text-xs text-slate-500 font-medium">Registros</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{totalSizeKB.toFixed(1)}</p>
                    <p className="text-xs text-slate-500 font-medium">KB Utilizados</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-slate-800">{storageStats.filter(s => s.count > 0).length}</p>
                    <p className="text-xs text-slate-500 font-medium">Tabelas Ativas</p>
                  </div>
                </div>

                {/* Tabela de chaves */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tabela</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Registros</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase">Tamanho</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {storageStats.map((s) => (
                        <tr key={s.key} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{s.label}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{s.count}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{s.sizeKB > 0 ? `${s.sizeKB} KB` : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            {s.key !== 'frota_user' && s.key !== 'app_settings' && s.count > 0 && (
                              <button onClick={() => handleClearStorage(s.key, s.label)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Backup e Restauração */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><HardDrive size={18} className="text-blue-600" /> Backup e Restauração</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={handleExportData} className="flex flex-col items-center gap-2 p-6 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-100 transition-colors group">
                    <FileDown size={28} className="text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm text-blue-700">Exportar Backup</span>
                    <span className="text-xs text-blue-500">Salvar arquivo .json</span>
                  </button>
                  <button onClick={handleImportData} className="flex flex-col items-center gap-2 p-6 bg-amber-50 hover:bg-amber-100 rounded-2xl border border-amber-100 transition-colors group">
                    <FileUp size={28} className="text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm text-amber-700">Importar Backup</span>
                    <span className="text-xs text-amber-500">Restaurar arquivo .json</span>
                  </button>
                  <button onClick={handleClearAllData} className="flex flex-col items-center gap-2 p-6 bg-red-50 hover:bg-red-100 rounded-2xl border border-red-100 transition-colors group">
                    <AlertTriangle size={28} className="text-red-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm text-red-700">Apagar Tudo</span>
                    <span className="text-xs text-red-500">Reset completo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ SEÇÃO: ATUALIZAÇÃO ONLINE ═══════════ */}
          {activeSection === 'update' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ArrowUpCircle size={18} className="text-blue-600" /> Atualização Online do Sistema</h3>

              {/* Versão atual */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-200">FG</div>
                <div>
                  <p className="font-bold text-slate-800">FrotaGestor Pro</p>
                  <p className="text-sm text-slate-500">Versão instalada: <span className="font-mono font-bold text-blue-600">v{appVersion}</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">© 2026 FrotaGestor Pro. Infraestrutura produzido por Ananias Feliciano</p>
                </div>
              </div>

              {/* Status da atualização */}
              <div className="space-y-4">
                {/* Idle / Botão de verificar */}
                {(updateInfo.status === 'idle' || updateInfo.status === 'not-available') && (
                  <div className="text-center py-8 space-y-4">
                    {updateInfo.status === 'not-available' && (
                      <div className="flex items-center justify-center gap-2 text-emerald-600 mb-2">
                        <CheckCircle2 size={20} />
                        <span className="font-bold text-sm">Você está usando a versão mais recente!</span>
                      </div>
                    )}
                    <button
                      onClick={handleCheckUpdate}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-200"
                    >
                      <RefreshCw size={18} /> Verificar Atualizações
                    </button>
                    {!isElectron && (
                      <p className="text-xs text-amber-500 flex items-center justify-center gap-1"><AlertCircle size={14} /> Atualizações automáticas disponíveis apenas no app desktop.</p>
                    )}
                  </div>
                )}

                {/* Verificando */}
                {updateInfo.status === 'checking' && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                    <span className="font-semibold text-slate-600">Verificando atualizações no servidor...</span>
                  </div>
                )}

                {/* Disponível */}
                {updateInfo.status === 'available' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <Download size={24} className="text-blue-600" />
                      <div>
                        <p className="font-bold text-blue-800">Nova versão disponível: v{updateInfo.version}</p>
                        <p className="text-sm text-blue-600">Atual: v{appVersion} → Nova: v{updateInfo.version}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadUpdate}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                    >
                      <Download size={18} /> Baixar Atualização
                    </button>
                  </div>
                )}

                {/* Baixando */}
                {updateInfo.status === 'downloading' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3">
                      <Loader2 size={20} className="animate-spin text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">Baixando atualização...</p>
                        <p className="text-xs text-slate-500">{updateInfo.percent || 0}% concluído</p>
                      </div>
                      <span className="text-xl font-black text-blue-600">{updateInfo.percent || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out" style={{ width: `${updateInfo.percent || 0}%` }} />
                    </div>
                  </div>
                )}

                {/* Pronto */}
                {updateInfo.status === 'downloaded' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={24} className="text-emerald-600" />
                      <div>
                        <p className="font-bold text-emerald-800">Atualização pronta para instalar!</p>
                        <p className="text-sm text-emerald-600">Versão v{updateInfo.version} baixada com sucesso.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleInstallUpdate}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                      <RefreshCw size={18} /> Reiniciar e Instalar Agora
                    </button>
                  </div>
                )}

                {/* Erro */}
                {updateInfo.status === 'error' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                      <AlertCircle size={24} className="text-red-500" />
                      <div>
                        <p className="font-bold text-red-700">Erro na verificação</p>
                        <p className="text-sm text-red-500 line-clamp-2">{updateInfo.message}</p>
                      </div>
                    </div>
                    <button onClick={handleCheckUpdate} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                      <RefreshCw size={16} /> Tentar Novamente
                    </button>
                  </div>
                )}
              </div>

              {/* Info de como publicar */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-600 flex items-center gap-1"><Info size={14} /> Como funciona:</p>
                <p>• O sistema verifica automaticamente no GitHub Releases se existe uma versão mais nova.</p>
                <p>• Quando disponível, você pode baixar e instalar sem sair do sistema.</p>
                <p>• Após instalar, o app reinicia automaticamente com a nova versão.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;
