
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, X, Upload, Car, Save } from 'lucide-react';
import { Vehicle, VehicleStatus, User, UserRole } from '../types';
import { generateSecureId } from '../utils/crypto';
import { useSyncState } from '../utils/useSyncState';

interface Props {
  user: User;
  onAction: (action: string, details: string) => void;
}

const VehicleModule: React.FC<Props> = ({ user, onAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useSyncState<Vehicle[]>('fleet_vehicles', [
    {
      id: '1', placa: 'SART-2024', renavam: '123456789', chassi: '9BW123', marca: 'VW', modelo: 'Gol',
      ano_fabricacao: 2023, ano_modelo: 2024, tipo_veiculo: 'Leve', cor: 'Branco', combustivel: 'Flex',
      quilometragem: 1000, data_ultima_revisao: '2023-10-01', status: VehicleStatus.ACTIVE, observacoes: 'Frota inicial'
    }
  ]);

  const saveToStorage = (list: Vehicle[]) => {
    setVehicles(list);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData.entries()) as any;
    // Normalização de tipos para campos numéricos e datas
    const vehicleData: Partial<Vehicle> = {
      placa: (raw.placa || '').toString().toUpperCase(),
      marca: (raw.marca || '').toString(),
      modelo: (raw.modelo || '').toString(),
      renavam: (raw.renavam || '').toString(),
      chassi: (raw.chassi || '').toString(),
      cor: (raw.cor || '').toString(),
      combustivel: (raw.combustivel || '').toString(),
      ano_fabricacao: raw.ano_fabricacao ? Number(raw.ano_fabricacao) : undefined,
      ano_modelo: raw.ano_modelo ? Number(raw.ano_modelo) : undefined,
      quilometragem: raw.quilometragem ? Number(raw.quilometragem) : 0,
      data_ultima_revisao: raw.data_ultima_revisao ? String(raw.data_ultima_revisao) : new Date().toISOString().slice(0,10),
      status: editingVehicle?.status ?? VehicleStatus.ACTIVE,
      observacoes: editingVehicle?.observacoes ?? ''
    };
    
    if (editingVehicle) {
      const updated = vehicles.map(v => v.id === editingVehicle.id ? { ...editingVehicle, ...vehicleData } as Vehicle : v);
      saveToStorage(updated);
      onAction('ALTERAÇÃO', `Veículo ${vehicleData.placa} atualizado.`);
    } else {
      const newVehicle: Vehicle = {
        id: generateSecureId(),
        placa: vehicleData.placa || '',
        renavam: vehicleData.renavam || '',
        chassi: vehicleData.chassi || '',
        marca: vehicleData.marca || '',
        modelo: vehicleData.modelo || '',
        ano_fabricacao: vehicleData.ano_fabricacao ?? new Date().getFullYear(),
        ano_modelo: vehicleData.ano_modelo ?? new Date().getFullYear(),
        tipo_veiculo: 'Leve',
        cor: vehicleData.cor || '',
        combustivel: vehicleData.combustivel || 'Flex',
        quilometragem: vehicleData.quilometragem ?? 0,
        data_ultima_revisao: vehicleData.data_ultima_revisao || new Date().toISOString().slice(0,10),
        status: VehicleStatus.ACTIVE,
        observacoes: ''
      };
      saveToStorage([...vehicles, newVehicle]);
      onAction('CRIAÇÃO', `Novo veículo placa ${vehicleData.placa} adicionado.`);
    }
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  const handleDelete = (id: string, placa: string) => {
    if (confirm(`Excluir veículo ${placa}?`)) {
      const updated = vehicles.filter(v => v.id !== id);
      saveToStorage(updated);
      onAction('EXCLUSÃO', `Veículo ${placa} removido do sistema.`);
    }
  };

  const filtered = vehicles.filter(v => v.placa.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Buscar placa..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {user.role === UserRole.ADMIN && (
          <button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">
            <Plus size={18} /> Novo Veículo
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Veículo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Placa / Renavam</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><Car size={20} /></div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{v.marca} {v.modelo}</p>
                      <p className="text-xs text-slate-500">{v.ano_modelo} - {v.cor}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-sm tracking-widest">{v.placa}</p>
                  <p className="text-[10px] text-slate-400 uppercase">RN: {v.renavam}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    v.status === VehicleStatus.ACTIVE ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                    v.status === VehicleStatus.MAINTENANCE ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {v.status === VehicleStatus.ACTIVE ? 'Ativo' : v.status === VehicleStatus.MAINTENANCE ? 'Manutenção' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingVehicle(v); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                    {user.role === UserRole.ADMIN && (
                      <button onClick={() => handleDelete(v.id, v.placa)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Placa</label>
                <input name="placa" defaultValue={editingVehicle?.placa} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm uppercase" placeholder="ABC-1234" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                <input name="marca" defaultValue={editingVehicle?.marca} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Ex: VW" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                <input name="modelo" defaultValue={editingVehicle?.modelo} required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Ex: Gol 1.0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Renavam</label>
                <input name="renavam" defaultValue={editingVehicle?.renavam} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Chassi</label>
                <input name="chassi" defaultValue={editingVehicle?.chassi} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Cor</label>
                <input name="cor" defaultValue={editingVehicle?.cor} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Ano Fab.</label>
                <input name="ano_fabricacao" type="number" defaultValue={editingVehicle?.ano_fabricacao} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Ano Mod.</label>
                <input name="ano_modelo" type="number" defaultValue={editingVehicle?.ano_modelo} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Quilometragem</label>
                <input name="quilometragem" type="number" defaultValue={editingVehicle?.quilometragem ?? 0} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Combustível</label>
                <select name="combustivel" defaultValue={editingVehicle?.combustivel} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <option>Flex</option><option>Gasolina</option><option>Diesel</option><option>Etanol</option><option>Elétrico</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Data Última Revisão</label>
                <input name="data_ultima_revisao" type="date" defaultValue={editingVehicle?.data_ultima_revisao} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-3 pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-400">Cancelar</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2">
                  <Save size={18} /> {editingVehicle ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleModule;
