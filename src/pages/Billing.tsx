import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Budget, UserProfile, PaymentMethod } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  CreditCard, 
  Banknote, 
  QrCode, 
  MoreHorizontal,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BillingProps {
  user: UserProfile;
}

import { api } from '../lib/api';

export default function Billing({ user }: BillingProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');

  useEffect(() => {
    if (!user.companyId || user.companyId === 'pending_setup') {
      setLoading(false);
      return;
    }

    const fetchBudgets = async () => {
      try {
        const data = await api.getBudgets();
        // Filter only finished budgets for billing
        setBudgets(data.filter((b: Budget) => b.status === 'finished'));
      } catch (error) {
        console.error('Error fetching budgets for billing:', error);
        toast.error('Erro ao carregar faturamento');
      } finally {
        setLoading(false);
      }
    };

    fetchBudgets();
  }, [user.companyId]);

  const handleMarkAsPaid = async (budgetId: string, method: PaymentMethod) => {
    try {
      await api.updateBudgetPayment(budgetId, {
        paymentStatus: 'paid',
        paymentMethod: method,
      });
      toast.success('Pagamento registrado com sucesso!');
      
      // Refresh local state
      setBudgets(prev => prev.map(b => 
        b.id === budgetId 
          ? { ...b, paymentStatus: 'paid', paymentMethod: method, paidAt: { toDate: () => new Date() } as any } 
          : b
      ));
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Erro ao registrar pagamento.');
    }
  };

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || b.paymentStatus === filterStatus || (!b.paymentStatus && filterStatus === 'pending');
    return matchesSearch && matchesStatus;
  });

  // Financial Stats
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const totalBilled = budgets.reduce((acc, b) => acc + (b.paymentStatus === 'paid' ? b.totalValue : 0), 0);
  const pendingBilled = budgets.reduce((acc, b) => acc + (b.paymentStatus !== 'paid' ? b.totalValue : 0), 0);
  
  const thisMonthRevenue = budgets
    .filter(b => b.paymentStatus === 'paid' && b.paidAt && isWithinInterval(b.paidAt.toDate(), { start: thisMonthStart, end: thisMonthEnd }))
    .reduce((acc, b) => acc + b.totalValue, 0);

  const lastMonthRevenue = budgets
    .filter(b => b.paymentStatus === 'paid' && b.paidAt && isWithinInterval(b.paidAt.toDate(), { start: lastMonthStart, end: lastMonthEnd }))
    .reduce((acc, b) => acc + b.totalValue, 0);

  const revenueGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  // Chart Data (Last 6 months)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(now, 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthRevenue = budgets
      .filter(b => b.paymentStatus === 'paid' && b.paidAt && isWithinInterval(b.paidAt.toDate(), { start, end }))
      .reduce((acc, b) => acc + b.totalValue, 0);
    
    return {
      name: format(date, 'MMM', { locale: ptBR }),
      revenue: monthRevenue
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faturamento</h1>
          <p className="text-gray-500">Gerencie os pagamentos e acompanhe sua receita</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            {revenueGrowth !== 0 && (
              <div className={`flex items-center text-sm font-medium ${revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth > 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                {Math.abs(revenueGrowth).toFixed(1)}%
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Receita Este Mês</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">R$ {thisMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Recebido</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">R$ {totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">A Receber (Finalizados)</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">R$ {pendingBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Evolução da Receita (6 meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `R$ ${value}`}
              />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-900">Serviços Finalizados</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterStatus === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterStatus === 'paid' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Pagos
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filterStatus === 'pending' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Pendentes
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Placa / Orçamento</th>
                <th className="px-6 py-4">Data Finalização</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status Pagamento</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBudgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-2 rounded-lg mr-3">
                        <Calendar className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{budget.vehiclePlate}</div>
                        <div className="text-xs text-gray-500">#{budget.id.slice(-6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {budget.deliveryDate ? format(budget.deliveryDate.toDate(), 'dd/MM/yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    R$ {budget.totalValue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      budget.paymentStatus === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {budget.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {budget.paymentMethod ? (
                      <div className="flex items-center text-sm text-gray-600">
                        {budget.paymentMethod === 'pix' && <QrCode className="w-4 h-4 mr-2 text-blue-500" />}
                        {budget.paymentMethod === 'card' && <CreditCard className="w-4 h-4 mr-2 text-purple-500" />}
                        {budget.paymentMethod === 'cash' && <Banknote className="w-4 h-4 mr-2 text-green-500" />}
                        {budget.paymentMethod === 'other' && <MoreHorizontal className="w-4 h-4 mr-2 text-gray-500" />}
                        <span className="capitalize">{budget.paymentMethod}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {budget.paymentStatus !== 'paid' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleMarkAsPaid(budget.id, 'pix')}
                          title="Pagar com PIX"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAsPaid(budget.id, 'card')}
                          title="Pagar com Cartão"
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <CreditCard className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleMarkAsPaid(budget.id, 'cash')}
                          title="Pagar com Dinheiro"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Banknote className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    {budget.paymentStatus === 'paid' && (
                      <div className="text-green-600 flex justify-end">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredBudgets.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum serviço finalizado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
