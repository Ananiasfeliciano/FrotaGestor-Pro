
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  MapPin, 
  Phone, 
  Wrench, 
  Droplet, 
  ShoppingBag, 
  X, 
  Trash2, 
  Edit2, 
  FileText, 
  Calendar, 
  DollarSign, 
  Gauge, 
  ChevronRight,
  Info,
  Hash,
  ShieldCheck,
  PackagePlus,
  ArrowRightLeft,
  UserCheck,
  Droplets
} from 'lucide-react';
import { User, Receipt, ReceiptItem, Vehicle, VehicleStatus } from '../types';
import { readStorage, writeStorage } from '../utils/storage';

interface Props {
  type: 'station' | 'workshop' | 'parts';
  user: User;
  onAction?: (action: string, details: string) => void;
}

const ResourceModule: React.FC<Props> = ({ type, user, onAction }) => {
  const [data, setData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeItemForReceipts, setActiveItemForReceipts] = useState<any>(null);

  // Estados para o formulário de Nota Completa
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [fuelLiters, setFuelLiters] = useState<number>(0);
  const [fuelPrice, setFuelPrice] = useState<number>(0);
  const [isOilChange, setIsOilChange] = useState<boolean>(false);

  const configs = {
    station: { 
      title: 'Postos de Combustível', 
      icon: <Droplet className="text-blue-500" />, 
      detailField: 'combustiveis_disponiveis',
      detailLabel: 'Combustíveis Disponíveis', 
      receiptLabel: 'Notas de Abastecimento',
      storageKey: 'fleet_stations',
      themeColor: 'blue'
    },
    workshop: { 
      title: 'Oficinas Especializadas', 
      icon: <Wrench className="text-amber-500" />, 
      detailField: 'especialidades',
      detailLabel: 'Especialidades da Oficina', 
      receiptLabel: 'Ordens de Serviço (OS)',
      storageKey: 'fleet_workshops',
      themeColor: 'amber'
    },
    parts: { 
      title: 'Lojas de Autopeças', 
      icon: <ShoppingBag className="text-purple-500" />, 
      detailField: 'tipos_pecas',
      detailLabel: 'Categorias de Peças', 
      receiptLabel: 'Notas de Compra de Peças',
      storageKey: 'fleet_parts',
      themeColor: 'purple'
    },
  };

  const config = configs[type];

  useEffect(() => {
    setData(readStorage<any[]>(config.storageKey, []));
    setVehicles(readStorage<Vehicle[]>('fleet_vehicles', []));
  }, [type, config.storageKey]);

  const saveToStorage = (list: any[]) => {
    setData(list);
    writeStorage(config.storageKey, list);
  };

  const addReceiptItem = () => {
    setReceiptItems([...receiptItems, { id: Math.random().toString(), description: '', quantity: 1, unitValue: 0 }]);
  };

  const updateReceiptItem = (id: string, field: keyof ReceiptItem, value: any) => {
    setReceiptItems(receiptItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeReceiptItem = (id: string) => {
    setReceiptItems(receiptItems.filter(item => item.id !== id));
  };

  const totalReceiptValue = useMemo(() => {
    if (type === 'station') return fuelLiters * fuelPrice;
    return receiptItems.reduce((acc, item) => acc + (item.quantity * item.unitValue), 0);
  }, [type, fuelLiters, fuelPrice, receiptItems]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const itemData = Object.fromEntries(formData.entries()) as any;
    
    if (editingItem) {
      const updated = data.map(i => i.id === editingItem.id ? { ...editingItem, ...itemData } : i);
      saveToStorage(updated);
      onAction?.('ALTERAÇÃO', `${config.title}: ${itemData.nome} atualizado.`);
    } else {
      const newItem = { ...itemData, id: Math.random().toString(36).substr(2, 9), receipts: [] };
      saveToStorage([...data, newItem]);
      onAction?.('CRIAÇÃO', `${config.title}: ${itemData.nome} cadastrado.`);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleReceiptSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vehicleId = formData.get('vehicleId') as string;
    const mileage = formData.get('mileage') ? parseInt(formData.get('mileage') as string) : undefined;
    const manualVal = parseFloat(formData.get('manualValue') as string || '0');
    const nextOilKm = formData.get('nextOilChangeKm') ? parseInt(formData.get('nextOilChangeKm') as string) : undefined;

    const receiptData: Receipt = {
      id: Math.random().toString(36).substr(2, 9),
      date: formData.get('date') as string,
      value: totalReceiptValue || manualVal,
      description: formData.get('description') as string,
      vehicleId: vehicleId,
      documentNumber: formData.get('documentNumber') as string,
      mileage: mileage,
      fuelType: formData.get('fuelType') as string,
      liters: fuelLiters,
      pricePerLiter: fuelPrice,
      warrantyUntil: formData.get('warrantyUntil') as string,
      professional: formData.get('professional') as string,
      items: receiptItems.length > 0 ? receiptItems : undefined,
      isOilChange: isOilChange,
      nextOilChangeKm: isOilChange ? nextOilKm : undefined
    };

    const updatedData = data.map(item => {
      if (item.id === activeItemForReceipts.id) {
        return { ...item, receipts: [...(item.receipts || []), receiptData] };
      }
      return item;
    });

    // Atualização de Frota (KM e Status)
    if (vehicleId) {
      const vSaved = readStorage<Vehicle[] | null>('fleet_vehicles', null);
      if (vSaved) {
        const vList: Vehicle[] = vSaved;
        const updatedVList = vList.map(v => {
          if (v.id === vehicleId) {
            let uV = { ...v };
            if (mileage && mileage > v.quilometragem) uV.quilometragem = mileage;
            if (type === 'workshop' && v.status === VehicleStatus.MAINTENANCE) uV.status = VehicleStatus.ACTIVE;
            return uV;
          }
          return v;
        });
        writeStorage('fleet_vehicles', updatedVList);
        setVehicles(updatedVList);
      }
    }

    saveToStorage(updatedData);
    setActiveItemForReceipts(updatedData.find(i => i.id === activeItemForReceipts.id));
    setReceiptItems([]);
    setFuelLiters(0);
    setFuelPrice(0);
    setIsOilChange(false);
    onAction?.('LANÇAMENTO', `Nota/OS de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receiptData.value)} em ${activeItemForReceipts.nome}`);
    e.currentTarget.reset();
  };

  const handleDeleteReceipt = (receiptId: string) => {
    if (confirm('Estornar este lançamento financeiro?')) {
      const updated = data.map(item => {
        if (item.id === activeItemForReceipts.id) {
          return { ...item, receipts: item.receipts.filter((r: any) => r.id !== receiptId) };
        }
        return item;
      });
      saveToStorage(updated);
      setActiveItemForReceipts(updated.find(i => i.id === activeItemForReceipts.id));
      onAction?.('ESTORNO', `Lançamento removido de ${activeItemForReceipts.nome}`);
    }
  };

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tighter uppercase">
            {config.icon} {config.title}
          </h2>
          <p className="text-slate-500 text-sm font-medium">Gestão profissional de parceiros e custos de manutenção/insumos.</p>
        </div>
        <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl hover:scale-105 active:scale-95 uppercase text-xs tracking-widest">
          <Plus size={20} /> Adicionar Parceiro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {data.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
             <Info size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum parceiro credenciado.</p>
          </div>
        )}
        {data.map((item) => {
          const totalSpent = (item.receipts || []).reduce((acc: number, r: any) => acc + r.value, 0);
          return (
            <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-b-4 border-b-slate-100 hover:border-b-indigo-500">
              <div className="p-8 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                     {React.cloneElement(config.icon as React.ReactElement<any>, { size: 32 })}
                  </div>
                  <div className="flex gap-1">
                     <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={18} /></button>
                     <button onClick={() => { 
                       if(confirm(`Remover "${item.nome}"? Todos os lançamentos serão perdidos.`)) {
                         const updated = data.filter(i => i.id !== item.id);
                         saveToStorage(updated);
                         onAction?.('EXCLUSÃO', `Parceiro ${item.nome} removido.`);
                       }
                     }} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                
                <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">{item.nome}</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.cnpj || 'SEM CNPJ'}</span>
                
                <div className="mt-6 space-y-3">
                  <div className="flex gap-3 text-slate-600">
                    <MapPin size={18} className="shrink-0 text-slate-300" />
                    <p className="text-xs leading-relaxed font-bold">{item.endereco}</p>
                  </div>
                  <div className="flex gap-3 text-slate-600">
                    <Phone size={18} className="shrink-0 text-slate-300" />
                    <p className="text-xs font-black">{item.telefone || 'Sem telefone'}</p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Transacionado</p>
                    <p className="text-2xl font-black text-slate-900">{formatter.format(totalSpent)}</p>
                  </div>
                  <button onClick={() => { setActiveItemForReceipts(item); setIsReceiptModalOpen(true); }} className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
                    <FileText size={20} />
                  </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL LANÇAMENTO DE NOTA COMPLETA */}
      {isReceiptModalOpen && activeItemForReceipts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
          <div className="bg-white rounded-[3.5rem] w-full max-w-6xl shadow-2xl animate-in zoom-in-95 flex flex-col h-[92vh] overflow-hidden border border-white/20">
            
            <div className="px-12 py-10 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2.2rem] bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                   {React.cloneElement(config.icon as React.ReactElement<any>, { size: 40 })}
                </div>
                <div>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{config.receiptLabel}</h3>
                   <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Unidade: <span className="text-indigo-600">{activeItemForReceipts.nome}</span></p>
                </div>
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)} className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all hover:scale-110"><X size={32} /></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* FORMULÁRIO COMPLETO */}
              <div className="w-full lg:w-[480px] border-r border-slate-100 bg-white p-12 overflow-y-auto custom-scrollbar">
                <div className="mb-10 flex items-center justify-between">
                   <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <PackagePlus size={14} className="text-indigo-500" /> Entrada de Nota Fiscal
                   </h4>
                   <div className="h-[2px] w-20 bg-slate-100"></div>
                </div>
                
                <form onSubmit={handleReceiptSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Veículo</label>
                      <select name="vehicleId" required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 appearance-none">
                        <option value="">Escolha...</option>
                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} ({v.modelo})</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Data da Nota</label>
                      <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">KM no Momento</label>
                      <input name="mileage" type="number" required placeholder="Ex: 54000" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Nº Documento / NF</label>
                      <input name="documentNumber" placeholder="Ex: NF-2024" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                    </div>
                  </div>

                  {/* CAMPO PROFISSIONAL - EXCLUSIVO OFICINA */}
                  {type === 'workshop' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1.5">
                        <UserCheck size={12} /> Mecânico / Profissional Responsável
                      </label>
                      <input name="professional" required placeholder="Nome do profissional que realizou o serviço" className="w-full px-5 py-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-amber-500/10" />
                    </div>
                  )}

                  {/* CAMPOS DINÂMICOS POR TIPO */}
                  {type === 'station' ? (
                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-600 uppercase">Tipo de Combustível</label>
                          <select name="fuelType" className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl font-bold text-sm">
                            <option>Gasolina Comum</option>
                            <option>Gasolina Aditivada</option>
                            <option>Diesel S10</option>
                            <option>Diesel Comum</option>
                            <option>Etanol</option>
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-blue-600 uppercase">Qtd Litros</label>
                             <input type="number" step="0.001" value={fuelLiters} onChange={(e) => setFuelLiters(parseFloat(e.target.value) || 0)} className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl font-black text-sm" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-blue-600 uppercase">Preço p/ Litro</label>
                             <input type="number" step="0.001" value={fuelPrice} onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)} className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl font-black text-sm" />
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Itens da Nota (Peças/Serviços)</label>
                          <button type="button" onClick={addReceiptItem} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase hover:underline"><Plus size={12}/> Add Item</button>
                       </div>
                       <div className="space-y-3">
                          {receiptItems.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                               <p className="text-[10px] text-slate-400 font-black uppercase">Detalhamento opcional se preencher valor manual</p>
                            </div>
                          )}
                          {receiptItems.map((item, idx) => (
                            <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 relative group">
                               <button type="button" onClick={() => removeReceiptItem(item.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X size={12}/></button>
                               <input placeholder="Ex: Troca de pastilhas" value={item.description} onChange={(e) => updateReceiptItem(item.id, 'description', e.target.value)} className="w-full bg-transparent border-b border-slate-200 text-xs font-bold py-1 outline-none focus:border-indigo-500" />
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[9px] font-black text-slate-400 uppercase">Qtd:</span>
                                     <input type="number" value={item.quantity} onChange={(e) => updateReceiptItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-transparent border-b border-slate-200 text-xs font-black py-1 outline-none" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[9px] font-black text-slate-400 uppercase">Val:</span>
                                     <input type="number" step="0.01" value={item.unitValue} onChange={(e) => updateReceiptItem(item.id, 'unitValue', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border-b border-slate-200 text-xs font-black py-1 outline-none" />
                                  </div>
                               </div>
                            </div>
                          ))}
                          
                          {receiptItems.length === 0 && (
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase">Valor Total Manual (R$)</label>
                                <input name="manualValue" type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm" placeholder="0,00" />
                             </div>
                          )}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase">Garantia Até</label>
                            <input name="warrantyUntil" type="date" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" />
                         </div>
                       </div>

                       {/* CONTROLE DE TROCA DE ÓLEO */}
                       {type === 'workshop' && (
                         <div className="bg-slate-900/5 p-6 rounded-3xl border border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                               <input 
                                 type="checkbox" 
                                 id="oil-change-check" 
                                 checked={isOilChange} 
                                 onChange={(e) => setIsOilChange(e.target.checked)}
                                 className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                               />
                               <label htmlFor="oil-change-check" className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                                 <Droplets size={16} className="text-blue-500" /> Registrar Troca de Óleo
                               </label>
                            </div>
                            
                            {isOilChange && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-black text-blue-600 uppercase mb-2 block">Previsão Próxima Troca (KM)</label>
                                <input 
                                  name="nextOilChangeKm" 
                                  type="number" 
                                  required={isOilChange} 
                                  placeholder="KM da próxima troca" 
                                  className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl font-black text-sm focus:ring-4 focus:ring-blue-500/10 outline-none" 
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Um alerta será gerado no Dashboard ao atingir este KM.</p>
                              </div>
                            )}
                         </div>
                       )}
                    </div>
                  )}

                  <div className="bg-slate-900 rounded-[2rem] p-8 text-center shadow-2xl shadow-indigo-200/50">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Liquidado na Nota</p>
                     <h5 className="text-4xl font-black text-white tracking-tighter">
                        {totalReceiptValue > 0 ? formatter.format(totalReceiptValue) : 'Aguardando valores...'}
                     </h5>
                  </div>

                  <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 group uppercase tracking-widest text-xs">
                    Gravar Nota no Histórico <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>

              {/* HISTÓRICO DETALHADO */}
              <div className="flex-1 bg-slate-50/50 p-12 overflow-y-auto custom-scrollbar">
                 <div className="flex items-center justify-between mb-10">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                       <ArrowRightLeft size={18} className="text-slate-400" /> Histórico de Transações
                    </h4>
                    <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-400 px-5 py-2 rounded-full uppercase">{(activeItemForReceipts.receipts || []).length} Entradas</span>
                 </div>

                 <div className="space-y-8">
                    {(!activeItemForReceipts.receipts || activeItemForReceipts.receipts.length === 0) ? (
                      <div className="py-32 text-center flex flex-col items-center gap-6 opacity-20">
                        <FileText size={80} strokeWidth={1} />
                        <p className="font-black uppercase text-xs tracking-[0.4em]">Sem lançamentos para exibir</p>
                      </div>
                    ) : (
                      activeItemForReceipts.receipts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((r: Receipt) => {
                        const v = vehicles.find(veh => veh.id === r.vehicleId);
                        return (
                          <div key={r.id} className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden border-l-8 border-l-indigo-600">
                             <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                               <div className="flex-1 space-y-6">
                                  <div className="flex items-center flex-wrap gap-3">
                                     <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">{v?.placa || 'VEÍCULO N/D'}</span>
                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                       <Calendar size={14} /> {new Intl.DateTimeFormat('pt-BR').format(new Date(r.date))}
                                     </span>
                                     {r.professional && (
                                       <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                         <UserCheck size={12} /> {r.professional}
                                       </span>
                                     )}
                                     {r.isOilChange && (
                                       <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                         <Droplets size={12} /> Troca de Óleo
                                       </span>
                                     )}
                                  </div>
                                  
                                  {/* CONTEÚDO DA NOTA */}
                                  {r.fuelType ? (
                                    <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
                                       <div>
                                          <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Insumo</p>
                                          <p className="text-sm font-black text-slate-800">{r.fuelType}</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Volumetria</p>
                                          <p className="text-sm font-black text-slate-800">{r.liters?.toFixed(3)}L x {formatter.format(r.pricePerLiter || 0)}</p>
                                       </div>
                                    </div>
                                  ) : r.items ? (
                                    <div className="space-y-3">
                                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Itemização da Nota</p>
                                       <table className="w-full text-left text-[11px]">
                                          <thead className="text-slate-400 border-b border-slate-100">
                                             <tr>
                                                <th className="pb-2 font-black uppercase">Item</th>
                                                <th className="pb-2 font-black uppercase text-center">Qtd</th>
                                                <th className="pb-2 font-black uppercase text-right">Subtotal</th>
                                             </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                             {r.items.map(item => (
                                               <tr key={item.id}>
                                                  <td className="py-2 font-bold text-slate-700">{item.description}</td>
                                                  <td className="py-2 font-black text-slate-500 text-center">{item.quantity}x</td>
                                                  <td className="py-2 font-black text-slate-900 text-right">{formatter.format(item.quantity * item.unitValue)}</td>
                                               </tr>
                                             ))}
                                          </tbody>
                                       </table>
                                    </div>
                                  ) : (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                       <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Observações do Serviço</p>
                                       <p className="text-xs font-bold text-slate-700 italic">"{r.description || 'Lançamento manual de valor fixo.'}"</p>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-50">
                                     {r.mileage && (
                                       <div className="flex items-center gap-2 text-slate-500">
                                          <Gauge size={14} />
                                          <span className="text-[10px] font-black uppercase">{r.mileage.toLocaleString()} KM</span>
                                       </div>
                                     )}
                                     {r.documentNumber && (
                                       <div className="flex items-center gap-2 text-slate-500">
                                          <Hash size={14} />
                                          <span className="text-[10px] font-black uppercase">DOC: {r.documentNumber}</span>
                                       </div>
                                     )}
                                     {r.warrantyUntil && (
                                       <div className="flex items-center gap-2 text-emerald-600">
                                          <ShieldCheck size={14} />
                                          <span className="text-[10px] font-black uppercase">Garantia até {new Intl.DateTimeFormat('pt-BR').format(new Date(r.warrantyUntil))}</span>
                                       </div>
                                     )}
                                     {r.isOilChange && r.nextOilChangeKm && (
                                       <div className="flex items-center gap-2 text-blue-600">
                                          <Droplets size={14} />
                                          <span className="text-[10px] font-black uppercase">Próxima Troca: {r.nextOilChangeKm.toLocaleString()} KM</span>
                                       </div>
                                     )}
                                  </div>
                               </div>
                               
                               <div className="text-right shrink-0 flex flex-col justify-between items-end">
                                  <div>
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Liquidado</p>
                                     <p className="text-3xl font-black text-slate-900 leading-none">{formatter.format(r.value)}</p>
                                  </div>
                                  <button onClick={() => handleDeleteReceipt(r.id)} className="mt-8 text-slate-300 hover:text-red-500 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100"><Trash2 size={16} /> Estornar</button>
                               </div>
                             </div>
                          </div>
                        );
                      })
                    )}
                 </div>
              </div>
            </div>

            <div className="px-12 py-8 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
               <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">FrotaGestor Pro - Auditoria Financeira Conforme Requisitado</div>
               <button onClick={() => setIsReceiptModalOpen(false)} className="px-12 py-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all shadow-sm uppercase tracking-widest">Fechar Relatório</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO PARCEIRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl animate-in zoom-in-95">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">{editingItem ? 'Editar' : 'Cadastrar'} Parceiro</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Razão Social</label>
                   <input name="nome" placeholder="Ex: Oficina do João" defaultValue={editingItem?.nome} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">CNPJ</label>
                      <input name="cnpj" placeholder="00.000.000/0001-00" defaultValue={editingItem?.cnpj} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Contato</label>
                      <input name="telefone" placeholder="(00) 0000-0000" defaultValue={editingItem?.telefone} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase">Endereço Completo</label>
                   <input name="endereco" placeholder="Rua, Número, Bairro" defaultValue={editingItem?.endereco} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase">{config.detailLabel}</label>
                   <textarea name={config.detailField} placeholder={`Descreva ${config.detailLabel.toLowerCase()}`} defaultValue={editingItem?.[config.detailField]} required className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold resize-none" rows={3}></textarea>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl uppercase text-xs tracking-widest hover:bg-slate-800 transition-all">Salvar Credenciamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceModule;
