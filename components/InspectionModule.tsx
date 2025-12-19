
import React, { useState, useEffect } from 'react';
import { Plus, Camera, FileText, CheckCircle2, AlertCircle, XCircle, X, ChevronRight, ClipboardList } from 'lucide-react';
import { User, InspectionItemStatus, InspectionResult, Vehicle, VehicleStatus } from '../types';

interface Props {
  user: User;
  onAction: (action: string, details: string) => void;
}

const CHECKLIST_ITEMS = [
  'Pneus dianteiros', 'Pneus traseiros', 'Freios', 'Suspensão', 
  'Direção', 'Iluminação', 'Bateria', 'Óleo do motor', 
  'Água do radiador', 'Lataria', 'Vidros', 'Limpador', 
  'Extintor', 'Documentação'
];

const InspectionModule: React.FC<Props> = ({ user, onAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [inspections, setInspections] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [inspectionData, setInspectionData] = useState<any>({
    veiculo_id: '',
    items: CHECKLIST_ITEMS.map((name, i) => ({ id: String(i), name, status: InspectionItemStatus.OK, observation: '' })),
    status_final: InspectionResult.APPROVED
  });

  useEffect(() => {
    const vSaved = localStorage.getItem('fleet_vehicles');
    if (vSaved) setVehicles(JSON.parse(vSaved));
    
    const iSaved = localStorage.getItem('fleet_inspections');
    if (iSaved) setInspections(JSON.parse(iSaved));
  }, []);

  const updateItemStatus = (id: string, status: InspectionItemStatus) => {
    setInspectionData({
      ...inspectionData,
      items: inspectionData.items.map((it: any) => it.id === id ? { ...it, status } : it)
    });
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionData.veiculo_id) return alert('Selecione um veículo.');

    const targetVehicle = vehicles.find(v => v.id === inspectionData.veiculo_id);
    const newInspection = {
      ...inspectionData,
      id: Math.random().toString(36).substr(2, 9),
      data: new Date().toLocaleString('pt-BR'),
      responsavel: user.name,
      veiculo_placa: targetVehicle?.placa || 'N/D',
      veiculo_modelo: targetVehicle?.modelo || 'N/D'
    };

    const updatedInspections = [newInspection, ...inspections];
    setInspections(updatedInspections);
    localStorage.setItem('fleet_inspections', JSON.stringify(updatedInspections));

    // Se reprovado, coloca veículo em manutenção
    if (inspectionData.status_final === InspectionResult.REJECTED && targetVehicle) {
      const updatedVehicles = vehicles.map(v => 
        v.id === targetVehicle.id ? { ...v, status: VehicleStatus.MAINTENANCE } : v
      );
      localStorage.setItem('fleet_vehicles', JSON.stringify(updatedVehicles));
    }

    onAction('FINALIZAÇÃO', `Inspeção do veículo ${newInspection.veiculo_placa} finalizada como ${newInspection.status_final}.`);
    setIsModalOpen(false);
    setCurrentStep(1);
    alert('Inspeção concluída com sucesso!');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-slate-800 font-bold text-lg flex items-center gap-2">
          <ClipboardList className="text-blue-600" /> Histórico de Inspeções Digitais
        </h2>
        <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg">
          <Plus size={18} className="inline mr-2" /> Iniciar Inspeção
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspections.length === 0 && <div className="col-span-full py-20 text-center text-slate-400">Nenhuma inspeção registrada.</div>}
        {inspections.map((i) => (
          <div key={i.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg transition-all">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-700 tracking-widest uppercase">{i.veiculo_placa}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${i.status_final === InspectionResult.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {i.status_final.toUpperCase()}
              </span>
            </div>
            <div className="p-5 flex-1">
              <p className="text-sm font-bold text-slate-800">{i.veiculo_modelo}</p>
              <p className="text-xs text-slate-500 mt-1">Realizada em {i.data}</p>
              <p className="text-[10px] text-slate-400 mt-2 uppercase font-medium">Por: {i.responsavel}</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button className="flex-1 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg"><FileText size={14} className="inline mr-1"/> PDF</button>
              <button className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg">Detalhes</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
               <h3 className="text-xl font-bold text-slate-800">Checklist Digital de Inspeção</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
               {currentStep === 1 ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Veículo para Inspeção</label>
                        <select 
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none"
                          onChange={(e) => setInspectionData({...inspectionData, veiculo_id: e.target.value})}
                          value={inspectionData.veiculo_id}
                        >
                          <option value="">Selecione um veículo...</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-4">Itens do Checklist</label>
                      <div className="grid grid-cols-1 gap-2">
                        {inspectionData.items.map((it: any) => (
                          <div key={it.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700">{it.name}</span>
                            <div className="flex gap-2">
                               <button onClick={() => updateItemStatus(it.id, InspectionItemStatus.OK)} className={`p-2 rounded-lg ${it.status === InspectionItemStatus.OK ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}><CheckCircle2 size={16} /></button>
                               <button onClick={() => updateItemStatus(it.id, InspectionItemStatus.WARNING)} className={`p-2 rounded-lg ${it.status === InspectionItemStatus.WARNING ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}><AlertCircle size={16} /></button>
                               <button onClick={() => updateItemStatus(it.id, InspectionItemStatus.PROBLEM)} className={`p-2 rounded-lg ${it.status === InspectionItemStatus.PROBLEM ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}><XCircle size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setCurrentStep(2)} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2">Próximo Passo <ChevronRight size={20} /></button>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Resultado Final da Inspeção</label>
                      <div className="flex gap-4">
                        <button onClick={() => setInspectionData({...inspectionData, status_final: InspectionResult.APPROVED})} className={`flex-1 py-6 rounded-2xl border-2 font-bold transition-all ${inspectionData.status_final === InspectionResult.APPROVED ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-300'}`}>APROVADO</button>
                        <button onClick={() => setInspectionData({...inspectionData, status_final: InspectionResult.REJECTED})} className={`flex-1 py-6 rounded-2xl border-2 font-bold transition-all ${inspectionData.status_final === InspectionResult.REJECTED ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 text-slate-300'}`}>REPROVADO</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Capturar Fotos (Simulação)</label>
                      <button className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2 hover:border-blue-400 hover:text-blue-500 transition-all"><Camera size={40} /><span className="text-xs font-bold uppercase">Clique para abrir câmera</span></button>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Voltar</button>
                       <button onClick={handleFinish} className="flex-[2] py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg">Finalizar e Gerar Log</button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionModule;
