
import React from 'react';
import { Activity, Clock, User as UserIcon, Tag, Info } from 'lucide-react';
import { AuditLog } from '../types';

interface Props {
  logs: AuditLog[];
}

const LogsModule: React.FC<Props> = ({ logs }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity size={120} />
        </div>
        <h2 className="text-2xl font-bold relative z-10">Histórico de Auditoria</h2>
        <p className="text-slate-400 text-sm relative z-10 mt-1">Rastreamento completo de todas as alterações manuais no sistema.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-sm font-bold text-slate-500">Total de {logs.length} registros</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50">Limpar Filtros</button>
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">Exportar CSV</button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info size={32} />
              </div>
              <p className="text-slate-500 font-medium">Nenhum log registrado até o momento.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm
                      ${log.action.includes('CRIAÇÃO') ? 'bg-emerald-50 text-emerald-600' : ''}
                      ${log.action.includes('EXCLUSÃO') ? 'bg-red-50 text-red-600' : ''}
                      ${log.action.includes('ALTERAÇÃO') ? 'bg-amber-50 text-amber-600' : ''}
                      ${!['CRIAÇÃO', 'EXCLUSÃO', 'ALTERAÇÃO'].some(a => log.action.includes(a)) ? 'bg-slate-100 text-slate-500' : ''}
                    `}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm">{log.action}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black tracking-widest uppercase">{log.module}</span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{log.details}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><UserIcon size={12} /> {log.userName}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600"><Tag size={16} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsModule;
