import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Budget } from '../types';
import { FileText, Clock, TrendingUp, Users, Share2, Copy, Check, ExternalLink, DollarSign, Plus, X, Calendar, User, Wrench, Search } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import BudgetDetailsModal from '../components/BudgetDetailsModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState({
    monthlyBudgets: 0,
    pendingBudgets: 0,
    monthlyRevenue: 0,
    totalClients: 0
  });
  const [recentBudgets, setRecentBudgets] = useState<Budget[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ name: string, value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [selectedBudgetClient, setSelectedBudgetClient] = useState<string>('');
  const [selectedBudgetVehicle, setSelectedBudgetVehicle] = useState<string>('');

  const publicLookupUrl = `${window.location.origin}/lookup/${user.companyId}`;

  useEffect(() => {
    const fetchBudgetDetails = async () => {
      if (!selectedBudget || !user.companyId) return;
      
      try {
        const clientDoc = await getDoc(doc(db, `clients/${selectedBudget.clientId}`));
        if (clientDoc.exists()) {
          setSelectedBudgetClient(clientDoc.data().name);
        }

        const vehicleDoc = await getDoc(doc(db, `vehicles/${selectedBudget.vehicleId}`));
        if (vehicleDoc.exists()) {
          const v = vehicleDoc.data();
          setSelectedBudgetVehicle(`${v.brand} ${v.model} (${v.plate})`);
        }
      } catch (error) {
        console.error('Error fetching budget details:', error);
      }
    };

    fetchBudgetDetails();
  }, [selectedBudget, user.companyId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLookupUrl);
    setCopied(true);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user.companyId || user.companyId === 'pending_setup') {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const startM = startOfMonth(now);
        const endM = endOfMonth(now);
        const startW = startOfWeek(now, { weekStartsOn: 1 });
        const endW = endOfWeek(now, { weekStartsOn: 1 });

        // 1. Monthly Budgets & Revenue
        const budgetsQuery = query(
          collection(db, `budgets`),
          where('companyId', '==', user.companyId),
          where('createdAt', '>=', startM),
          where('createdAt', '<=', endM)
        );
        const budgetsSnap = await getDocs(budgetsQuery);
        
        let revenue = 0;
        budgetsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.paymentStatus === 'paid') {
            revenue += data.totalValue || 0;
          }
        });

        // 2. Pending Budgets
        const pendingQuery = query(
          collection(db, `budgets`),
          where('companyId', '==', user.companyId),
          where('status', '==', 'pending')
        );
        const pendingSnap = await getDocs(pendingQuery);

        // 3. Total Clients
        const clientsSnap = await getDocs(query(collection(db, `clients`), where('companyId', '==', user.companyId)));

        // 4. Recent Budgets
        const recentQuery = query(
          collection(db, `budgets`),
          where('companyId', '==', user.companyId),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const recentSnap = await getDocs(recentQuery);

        // 5. Weekly Revenue Data
        const weeklyQuery = query(
          collection(db, `budgets`),
          where('companyId', '==', user.companyId),
          where('paidAt', '>=', startW),
          where('paidAt', '<=', endW)
        );
        const weeklySnap = await getDocs(weeklyQuery);
        
        const days = eachDayOfInterval({ start: startW, end: endW });
        const weekData = days.map(day => {
          const dayRevenue = weeklySnap.docs
            .filter(doc => {
              const paidAt = doc.data().paidAt?.toDate();
              return paidAt && isSameDay(paidAt, day);
            })
            .reduce((acc, doc) => acc + (doc.data().totalValue || 0), 0);
          
          return {
            name: format(day, 'EEE', { locale: ptBR }),
            value: dayRevenue
          };
        });

        setStats({
          monthlyBudgets: budgetsSnap.size,
          pendingBudgets: pendingSnap.size,
          monthlyRevenue: revenue,
          totalClients: clientsSnap.size
        });
        setRecentBudgets(recentSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Budget)));
        setWeeklyData(weekData);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user.companyId]);

  const statCards = [
    { label: 'Orçamentos no Mês', value: stats.monthlyBudgets, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Orçamentos Pendentes', value: stats.pendingBudgets, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { label: 'Receita no Mês', value: `R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Total de Clientes', value: stats.totalClients, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h2>
          <p className="text-gray-500 font-medium">Visão geral da sua oficina em {format(new Date(), 'MMMM yyyy', { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/billing" 
            className="hidden sm:inline-flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <DollarSign className="w-4 h-4 mr-2 text-green-600" />
            Faturamento
          </Link>
          <Link 
            to="/orcamentos/novo" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Orçamento
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div 
            key={stat.label} 
            className="group bg-white p-7 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-gray-100 hover:-translate-y-1 transition-all duration-300 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</p>
              </div>
              <div className={`${stat.bg} p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Budgets Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900">Últimos Orçamentos</h3>
            </div>
            <Link to="/budgets" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
              Ver todos
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Placa</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  // Skeleton Loading
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-16 ml-auto"></div></td>
                    </tr>
                  ))
                ) : recentBudgets.length > 0 ? (
                  recentBudgets.map((budget) => (
                    <tr 
                      key={budget.id} 
                      onClick={() => setSelectedBudget(budget)}
                      className="hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                        {budget.createdAt?.toDate ? format(budget.createdAt.toDate(), 'dd/MM/yy') : '--/--/--'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {budget.vehiclePlate}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={budget.status} className="text-[10px] px-2 py-0.5" />
                          {budget.status === 'finished' && (
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-full w-fit flex items-center gap-1 ${
                              budget.paymentStatus === 'paid' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                              <DollarSign className="w-2 h-2" />
                              {budget.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-black text-right">
                        R$ {budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-gray-50 p-4 rounded-full">
                          <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <div>
                          <p className="text-gray-900 font-bold">Nenhum orçamento ainda</p>
                          <p className="text-gray-400 text-sm">Comece criando seu primeiro orçamento!</p>
                        </div>
                        <Link 
                          to="/orcamentos/novo" 
                          className="mt-2 text-sm font-bold text-blue-600 hover:underline"
                        >
                          Criar orçamento agora
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-6">Faturamento Semanal (Recebido)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 700 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                  {weeklyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={isSameDay(eachDayOfInterval({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) })[index], new Date()) ? '#2563eb' : '#e5e7eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {selectedBudget && (
        <BudgetDetailsModal 
          budget={selectedBudget} 
          onClose={() => {
            setSelectedBudget(null);
            setSelectedBudgetClient('');
            setSelectedBudgetVehicle('');
          }}
          clientName={selectedBudgetClient}
          vehicleName={selectedBudgetVehicle}
        />
      )}
    </div>
  );
}
