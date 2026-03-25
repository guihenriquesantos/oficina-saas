import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Client, Vehicle, Service } from '../types';
import { ArrowLeft, Loader2, Trash2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

interface NewBudgetProps {
  user: UserProfile;
}

import { api } from '../lib/api';

export default function NewBudget({ user }: NewBudgetProps) {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newBudget, setNewBudget] = useState({
    clientId: '',
    vehicleId: '',
    selectedServices: [] as { serviceId: string, name: string, price: number }[],
    observations: '',
    deliveryDate: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user.companyId || user.companyId === 'pending_setup') {
        setLoading(false);
        return;
      }

      try {
        const [cData, vData, sData] = await Promise.all([
          api.getClients(),
          api.getVehicles(),
          api.getServices()
        ]);

        setClients(cData);
        setVehicles(vData);
        setServices(sData.filter((s: Service) => s.active));
      } catch (error) {
        console.error('Error fetching data for new budget:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.companyId]);

  const handleAddServiceToBudget = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setNewBudget({
        ...newBudget,
        selectedServices: [...newBudget.selectedServices, { serviceId: service.id, name: service.name, price: service.price }]
      });
    }
  };

  const removeServiceFromBudget = (index: number) => {
    const updated = [...newBudget.selectedServices];
    updated.splice(index, 1);
    setNewBudget({ ...newBudget, selectedServices: updated });
  };

  const calculateTotal = () => {
    return newBudget.selectedServices.reduce((acc, s) => acc + s.price, 0);
  };

  const handleCreateBudget = async (e: FormEvent) => {
    e.preventDefault();
    if (newBudget.selectedServices.length === 0) {
      toast.error('Adicione pelo menos um serviço ao orçamento');
      return;
    }
    setSubmitting(true);

    try {
      const vehicle = vehicles.find(v => v.id === newBudget.vehicleId);
      
      await api.createBudget({
        clientId: newBudget.clientId,
        vehicleId: newBudget.vehicleId,
        vehiclePlate: vehicle?.plate || '',
        services: newBudget.selectedServices,
        status: 'pending',
        totalValue: calculateTotal(),
        observations: newBudget.observations,
        deliveryDate: newBudget.deliveryDate || null,
      });

      toast.success('Orçamento criado com sucesso!');
      navigate('/budgets');
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Novo Orçamento</h2>
          <p className="text-gray-500">Preencha os dados para gerar um novo orçamento ou ordem de serviço</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleCreateBudget} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente *</label>
              <select
                required
                value={newBudget.clientId}
                onChange={(e) => setNewBudget({ ...newBudget, clientId: e.target.value, vehicleId: '' })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Selecione um cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Veículo *</label>
              <select
                required
                disabled={!newBudget.clientId}
                value={newBudget.vehicleId}
                onChange={(e) => setNewBudget({ ...newBudget, vehicleId: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 transition-all"
              >
                <option value="">Selecione um veículo</option>
                {vehicles.filter(v => v.clientId === newBudget.clientId).map(v => (
                  <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Serviços</label>
            <div className="flex gap-3">
              <select
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddServiceToBudget(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">Adicionar serviço...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>)}
              </select>
            </div>

            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3">Serviço</th>
                    <th className="px-6 py-3">Valor</th>
                    <th className="px-6 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {newBudget.selectedServices.map((s, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{s.name}</td>
                      <td className="px-6 py-4 text-gray-600 font-semibold">R$ {s.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button type="button" onClick={() => removeServiceFromBudget(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {newBudget.selectedServices.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <PlusCircle className="w-8 h-8 opacity-20" />
                          Nenhum serviço selecionado
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-blue-50/50 font-bold">
                  <tr>
                    <td className="px-6 py-4 text-blue-900">Total do Orçamento</td>
                    <td colSpan={2} className="px-6 py-4 text-blue-600 text-lg">R$ {calculateTotal().toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Previsão de Entrega</label>
              <input
                type="date"
                value={newBudget.deliveryDate}
                onChange={(e) => setNewBudget({ ...newBudget, deliveryDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Observações Internas</label>
              <textarea
                value={newBudget.observations}
                onChange={(e) => setNewBudget({ ...newBudget, observations: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                rows={3}
                placeholder="Detalhes adicionais sobre o estado do veículo..."
              />
            </div>
          </div>

          <div className="pt-6 flex items-center justify-end gap-4 border-t border-gray-50">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : 'Salvar Orçamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
