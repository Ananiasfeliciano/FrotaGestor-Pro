
import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  Car, 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  FileText, 
  Plus, 
  Droplet, 
  Wrench, 
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Bell,
  Calendar,
  AlertCircle,
  ChevronRight,
  BellOff,
  BellRing,
  Droplets,
  Gauge
} from 'lucide-react';
import { Vehicle, VehicleStatus, Inspection, Receipt } from '../types';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
);

interface MaintenanceAlert {
  id: string;
  placa: string;
  modelo: string;
  daysRemaining?: number;
  kmRemaining?: number;
  type: 'upcoming' | 'overdue' | 'oil_upcoming' | 'oil_overdue';
  dateOrKm: string;
}

const Dashboard: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<any[]>([]);
  const [recentOilChanges, setRecentOilChanges] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<number[]>(new Array(10).fill(0));
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    // Carregar Veículos
    const vSaved = localStorage.getItem('fleet_vehicles');
    const vData: Vehicle[] = vSaved ? JSON.parse(vSaved) : [];
    setVehicles(vData);

    // Carregar parceiros
    const workshops = JSON.parse(localStorage.getItem('fleet_workshops') || '[]');
    const stations = JSON.parse(localStorage.getItem('fleet_stations') || '[]');
    
    // Processar Alertas
    const REVISION_CYCLE_DAYS = 365;
    const ALERT_THRESHOLD_DAYS = 30;
    const OIL_THRESHOLD_KM = 1000;
    const now = new Date();
    
    const calculatedAlerts: MaintenanceAlert[] = [];
    const allOilChanges: any[] = [];

    vData.forEach(v => {
      // 1. Alertas de Revisão
      const lastRevision = new Date(v.data_ultima_revisao);
      const nextRevision = new Date(lastRevision);
      nextRevision.setDate(nextRevision.getDate() + REVISION_CYCLE_DAYS);
      
      const diffTime = nextRevision.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= ALERT_THRESHOLD_DAYS) {
        calculatedAlerts.push({
          id: `rev-${v.id}`,
          placa: v.placa,
          modelo: v.modelo,
          daysRemaining: diffDays,
          type: diffDays < 0 ? 'overdue' : 'upcoming',
          dateOrKm: nextRevision.toLocaleDateString('pt-BR')
        });
      }

      // 2. Alertas de Óleo e Histórico
      let latestOilReceipt: Receipt | null = null;
      [...workshops, ...stations].forEach((provider: any) => {
        provider.receipts?.forEach((r: Receipt) => {
          if (r.vehicleId === v.id && r.isOilChange) {
            allOilChanges.push({
              ...r,
              providerName: provider.nome,
              vehiclePlate: v.placa,
              vehicleModel: v.modelo
            });

            if (r.nextOilChangeKm) {
              if (!latestOilReceipt || new Date(r.date) > new Date(latestOilReceipt.date)) {
                latestOilReceipt = r;
              }
            }
          }
        });
      });

      if (latestOilReceipt && latestOilReceipt.nextOilChangeKm) {
        const kmRemaining = latestOilReceipt.nextOilChangeKm - v.quilometragem;
        if (kmRemaining <= OIL_THRESHOLD_KM) {
          calculatedAlerts.push({
            id: `oil-${v.id}`,
            placa: v.placa,
            modelo: v.modelo,
            kmRemaining: kmRemaining,
            type: kmRemaining < 0 ? 'oil_overdue' : 'oil_upcoming',
            dateOrKm: `${latestOilReceipt.nextOilChangeKm.toLocaleString()} KM`
          });
        }
      }
    });

    setAlerts(calculatedAlerts.sort((a, b) => {
      const aIsCritical = a.type.includes('overdue');
      const bIsCritical = b.type.includes('overdue');
      if (aIsCritical && !bIsCritical) return -1;
      if (!aIsCritical && bIsCritical) return 1;
      return 0;
    }));

    setRecentOilChanges(allOilChanges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));

    // Carregar Inspeções
    const iSaved = localStorage.getItem('fleet_inspections');
    setInspections(iSaved ? JSON.parse(iSaved) : []);

    // Consolidar Lançamentos
    const parts = JSON.parse(localStorage.getItem('fleet_parts') || '[]');
    const allReceipts: any[] = [];
    const spendingByMonth = new Array(10).fill(0);

    const processItem = (items: any[], typeLabel: string, icon: any, colorClass: string) => {
      items.forEach((provider: any) => {
        provider.receipts?.forEach((r: any) => {
          allReceipts.push({ ...r, provider: provider.nome, type: typeLabel, icon, colorClass });
          const date = new Date(r.date);
          const month = date.getMonth();
          if (month < 10 && date.getFullYear() === new Date().getFullYear()) {
            spendingByMonth[month] += r.value;
          }
        });
      });
    };

    processItem(stations, 'Abastecimento', <Droplet size={14} />, 'text-blue-500');
    processItem(workshops, 'Serviço', <Wrench size={14} />, 'text-amber-500');
    processItem(parts, 'Compra de Peças', <ShoppingBag size={14} />, 'text-purple-500');

    setMonthlyData(spendingByMonth);
    setRecentReceipts(allReceipts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6));
  }, []);

  const stats = [
    { label: 'Total Veículos', value: vehicles.length, icon: <Car size={28} />, color: 'blue' },
    { label: 'Alertas de Óleo', value: alerts.filter(a => a.type.includes('oil')).length, icon: <Droplets size={28} />, color: alerts.some(a => a.type === 'oil_overdue') ? 'red' : 'blue' },
    { label: 'Em Manutenção', value: vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length, icon: <AlertTriangle size={28} />, color: 'amber' },
    { label: 'Investimento Total', value: `R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(monthlyData.reduce((a, b) => a + b, 0))}`, icon: <DollarSign size={28} />, color: 'purple' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Central de Alertas Inteligente */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-700">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Central de Alertas de Manutenção</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Acompanhamento preventivo por KM e Tempo</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
              {alerts.length} Pendências
            </span>
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map((alert) => {
              const isOil = alert.type.includes('oil');
              const isOverdue = alert.type.includes('overdue');
              const bgColor = isOverdue ? 'bg-red-50 border-red-100' : (isOil ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100');
              const iconBg = isOverdue ? 'bg-red-600 text-white' : (isOil ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white');
              const tagColor = isOverdue ? 'text-red-600' : (isOil ? 'text-blue-600' : 'text-amber-600');
              const Icon = isOverdue ? AlertCircle : (isOil ? Droplets : Calendar);

              return (
                <div key={alert.id} className={`p-5 rounded-2xl border flex items-start gap-4 transition-all hover:shadow-lg ${bgColor}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${tagColor}`}>
                        {isOil ? (isOverdue ? 'Troca de Óleo Vencida' : 'Troca de Óleo Próxima') : (isOverdue ? 'Revisão Atrasada' : 'Próxima Revisão')}
                      </p>
                      <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-black uppercase tracking-widest shadow-sm">{alert.placa}</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-800 truncate mt-1">{alert.modelo}</h4>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      {isOil ? (
                         alert.kmRemaining !== undefined && alert.kmRemaining < 0 
                         ? `Excedido em ${Math.abs(alert.kmRemaining).toLocaleString()} KM` 
                         : `Faltam ${alert.kmRemaining?.toLocaleString()} KM para atingir ${alert.dateOrKm}`
                      ) : (
                         alert.daysRemaining !== undefined && alert.daysRemaining < 0 
                         ? `Atrasado há ${Math.abs(alert.daysRemaining)} dias` 
                         : `Vence em ${alert.daysRemaining} dias (${alert.dateOrKm})`
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 transition-all hover:shadow-md hover:translate-y-[-2px]">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg
              ${stat.color === 'blue' ? 'bg-blue-600 shadow-blue-100' : ''}
              ${stat.color === 'emerald' ? 'bg-emerald-500 shadow-emerald-100' : ''}
              ${stat.color === 'amber' ? 'bg-amber-500 shadow-amber-100' : ''}
              ${stat.color === 'purple' ? 'bg-purple-600 shadow-purple-100' : ''}
              ${stat.color === 'red' ? 'bg-red-600 shadow-red-100' : ''}
            `}>
              {stat.icon}
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="font-black text-slate-800 text-xl tracking-tighter flex items-center gap-2 uppercase mb-8">
            <TrendingUp size={24} className="text-blue-600" /> Fluxo de Despesas 2024
          </h3>
          <div className="h-[320px]">
            <Bar 
              data={{
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'],
                datasets: [{
                  label: 'Gastos (R$)',
                  data: monthlyData,
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  borderRadius: 8,
                }],
              }} 
              options={{ maintainAspectRatio: false }} 
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 text-xl mb-8 tracking-tighter uppercase">Disponibilidade da Frota</h3>
          <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900">{vehicles.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Veículos</span>
            </div>
            <Doughnut 
              data={{
                labels: ['Ativos', 'Manutenção', 'Inativos'],
                datasets: [{
                  data: [
                    vehicles.filter(v => v.status === VehicleStatus.ACTIVE).length || 0, 
                    vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length || 0, 
                    vehicles.filter(v => v.status === VehicleStatus.INACTIVE).length || 0
                  ],
                  backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                  borderWidth: 0,
                }],
              }}
              options={{ maintainAspectRatio: false, cutout: '82%' }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lançamentos Financeiros Recentes */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <DollarSign size={20} className="text-blue-600" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Lançamentos Recentes</h3>
          </div>
          <div className="p-4 space-y-3 flex-1">
             {recentReceipts.map((r) => (
               <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white border border-slate-200 ${r.colorClass}`}>{r.icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{r.type}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{r.provider}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">R$ {r.value.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{r.date.split('-').reverse().join('/')}</p>
                  </div>
               </div>
             ))}
          </div>
        </div>

        {/* Últimas Inspeções */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <ClipboardCheck size={20} className="text-emerald-600" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Inspeções Recentes</h3>
          </div>
          <div className="p-4 space-y-3 flex-1">
            {inspections.slice(0, 5).map((insp) => (
              <div key={insp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${insp.status_final === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {insp.status_final === 'Aprovado' ? 'OK' : 'X'}
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-800">{insp.veiculo_placa}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{insp.veiculo_modelo}</p>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[10px] font-black text-slate-800 uppercase">{insp.data.split(',')[0]}</p>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${insp.status_final === 'Aprovado' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {insp.status_final}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ÚLTIMAS 5 TROCAS DE ÓLEO - NOVA SEÇÃO */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col border-b-4 border-b-blue-600">
          <div className="p-6 border-b border-slate-100 bg-blue-50/50 flex items-center gap-3">
            <Droplets size={20} className="text-blue-600" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Últimas Trocas de Óleo</h3>
          </div>
          <div className="p-4 space-y-3 flex-1">
            {recentOilChanges.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-50">
                <Droplets size={40} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma troca registrada</p>
              </div>
            ) : (
              recentOilChanges.map((oil) => (
                <div key={oil.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                      <Gauge size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">{oil.vehiclePlate}</span>
                        <p className="text-[11px] font-black text-slate-800 truncate">{oil.vehicleModel}</p>
                      </div>
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5 truncate">{oil.providerName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-blue-700">{oil.mileage?.toLocaleString()} KM</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{oil.date.split('-').reverse().join('/')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentOilChanges.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Controle de Lubrificantes FrotaGestor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
