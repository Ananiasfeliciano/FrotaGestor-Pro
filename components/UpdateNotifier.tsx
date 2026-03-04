
import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, X, Loader2, ArrowUpCircle } from 'lucide-react';

/**
 * Tipagem global para a API exposta pelo preload.
 * Disponível em window.electronAPI quando rodando no Electron.
 */
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getVersion: () => Promise<string>;
      updater: {
        check: () => Promise<{ status: string; version?: string; message?: string }>;
        download: () => Promise<{ status: string; message?: string }>;
        install: () => void;
        onStatus: (cb: (data: UpdateStatusPayload) => void) => () => void;
      };
    };
  }
}

interface UpdateStatusPayload {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
  releaseNotes?: string;
}

const UpdateNotifier: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateStatusPayload | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.updater;

  useEffect(() => {
    if (!isElectron) return;

    // Obter versão atual
    window.electronAPI!.getVersion().then(v => setAppVersion(v));

    // Ouvir eventos de atualização do main process
    const cleanup = window.electronAPI!.updater.onStatus((data) => {
      setUpdateInfo(data);
      if (data.status === 'available' || data.status === 'downloaded') {
        setDismissed(false);
      }
    });

    return cleanup;
  }, [isElectron]);

  const handleCheckUpdate = async () => {
    if (!isElectron) return;
    setUpdateInfo({ status: 'checking' });
    await window.electronAPI!.updater.check();
  };

  const handleDownload = async () => {
    if (!isElectron) return;
    await window.electronAPI!.updater.download();
  };

  const handleInstall = () => {
    if (!isElectron) return;
    window.electronAPI!.updater.install();
  };

  // Não renderizar nada fora do Electron
  if (!isElectron) return null;

  // Banner dispensado pelo usuário
  if (dismissed && updateInfo?.status !== 'downloaded') return null;

  // Sem informação ou sem atualização disponível — mostra nada
  if (!updateInfo || updateInfo.status === 'not-available') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={18} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Atualização do Sistema</span>
          </div>
          {updateInfo.status !== 'downloading' && (
            <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Verificando */}
          {updateInfo.status === 'checking' && (
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span className="text-sm">Verificando atualizações...</span>
            </div>
          )}

          {/* Disponível */}
          {updateInfo.status === 'available' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <Download size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Nova versão disponível!</p>
                  <p className="text-xs text-slate-500">
                    v{appVersion} → v{updateInfo.version}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} /> Baixar Atualização
              </button>
            </>
          )}

          {/* Baixando */}
          {updateInfo.status === 'downloading' && (
            <>
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700">Baixando atualização...</p>
                  <p className="text-xs text-slate-500">{updateInfo.percent || 0}% concluído</p>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${updateInfo.percent || 0}%` }}
                />
              </div>
            </>
          )}

          {/* Pronto para instalar */}
          {updateInfo.status === 'downloaded' && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Atualização pronta!</p>
                  <p className="text-xs text-slate-500">
                    v{updateInfo.version} — Reinicie para aplicar
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDismissed(true)}
                  className="flex-1 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Depois
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} /> Reiniciar Agora
                </button>
              </div>
            </>
          )}

          {/* Erro */}
          {updateInfo.status === 'error' && (
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-600">Erro na atualização</p>
                <p className="text-xs text-slate-500 line-clamp-2">{updateInfo.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer version info */}
        {appVersion && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">Versão atual: v{appVersion}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateNotifier;
