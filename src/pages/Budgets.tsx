import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Budget, Client, Vehicle, Service, BudgetStatus } from '../types';
import { Search, Plus, Filter, Loader2, DollarSign, CheckCircle2, Play, Check, Trash2, X, FileText, Calendar, User, Wrench, ChevronDown } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import BudgetDetailsModal from '../components/BudgetDetailsModal';
import ClientModal from '../components/ClientModal';
import VehicleModal from '../components/VehicleModal';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BudgetsProps {
  user: UserProfile;
}

import { api } from '../lib/api';

export default function Budgets({ user }: BudgetsProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [newBudget, setNewBudget] = useState({
    clientId: '',
    vehicleId: '',
    selectedServices: [] as { serviceId: string, name: string, price: number }[],
    observations: '',
    deliveryDate: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user.companyId || user.companyId === 'pending_setup') {
      setLoading(false);
      return;
    }

    try {
      const [budgetsData, clientsData, vehiclesData, servicesData] = await Promise.all([
        api.getBudgets(),
        api.getClients(),
        api.getVehicles(),
        api.getServices()
      ]);

      setBudgets(budgetsData);
      setClients(clientsData);
      setVehicles(vehiclesData);
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados do servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      
      if (!newBudget.clientId || !newBudget.vehicleId) {
        toast.error('Selecione um cliente e um veículo');
        setSubmitting(false);
        return;
      }

      await api.createBudget({
        clientId: newBudget.clientId,
        vehicleId: newBudget.vehicleId,
        vehiclePlate: vehicle?.plate || '',
        services: newBudget.selectedServices,
        status: 'pending',
        totalValue: calculateTotal(),
        observations: newBudget.observations,
        deliveryDate: newBudget.deliveryDate ? new Date(newBudget.deliveryDate).toISOString() : null,
      });

      toast.success('Orçamento criado com sucesso!');
      setIsModalOpen(false);
      setNewBudget({ clientId: '', vehicleId: '', selectedServices: [], observations: '', deliveryDate: '' });
      setClientSearch('');
      setVehicleSearch('');
      fetchData();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setSubmitting(false);
    }
  };

  const updateBudgetStatus = async (budgetId: string, newStatus: BudgetStatus) => {
    try {
      await api.updateBudgetStatus(budgetId, newStatus);
      toast.success('Status atualizado!');
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'N/A';
  const getVehicleInfo = (id: string) => {
    const v = vehicles.find(v => v.id === id);
    return v ? `${v.brand} ${v.model}` : 'N/A';
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredVehicles = vehicles
    .filter(v => v.clientId === newBudget.clientId)
    .filter(v => 
      v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orçamentos</h2>
          <p className="text-gray-500">Gerencie orçamentos e ordens de serviço</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Orçamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os Status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="executing">Em Execução</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Placa / Veículo</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredBudgets.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedBudget(b)}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{b.vehiclePlate}</div>
                    <div className="text-xs text-gray-500">{getVehicleInfo(b.vehicleId)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {getClientName(b.clientId)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={b.status} />
                      {b.status === 'finished' && (
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full w-fit flex items-center gap-1",
                          b.paymentStatus === 'paid' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                        )}>
                          <DollarSign className="w-3 h-3" />
                          {b.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">
                    R$ {b.totalValue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {b.status === 'pending' && (
                        <button onClick={() => updateBudgetStatus(b.id, 'approved')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Aprovar">
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      {b.status === 'approved' && (
                        <button onClick={() => updateBudgetStatus(b.id, 'executing')} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Iniciar Execução">
                          <Play className="w-5 h-5" />
                        </button>
                      )}
                      {b.status === 'executing' && (
                        <button onClick={() => updateBudgetStatus(b.id, 'finished')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Finalizar">
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredBudgets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum orçamento encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBudget && (
        <BudgetDetailsModal 
          budget={selectedBudget} 
          onClose={() => setSelectedBudget(null)}
          clientName={getClientName(selectedBudget.clientId)}
          vehicleName={getVehicleInfo(selectedBudget.vehicleId)}
        />
      )}

      <ClientModal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        onSuccess={(client) => {
          setClients(prev => [...prev, client]);
          setNewBudget(prev => ({ ...prev, clientId: client.id, vehicleId: '' }));
          setClientSearch(client.name);
          setVehicleSearch('');
        }} 
      />

      <VehicleModal 
        isOpen={isVehicleModalOpen} 
        onClose={() => setIsVehicleModalOpen(false)} 
        clientId={newBudget.clientId}
        onSuccess={(vehicle) => {
          setVehicles(prev => [...prev, vehicle]);
          setNewBudget(prev => ({ ...prev, vehicleId: vehicle.id }));
          setVehicleSearch(`${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`);
        }} 
      />

      {/* Add Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Orçamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateBudget} className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                    <span>Cliente *</span>
                    <button 
                      type="button" 
                      onClick={() => setIsClientModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Novo Cliente
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar cliente..."
                      value={clientSearch}
                      onFocus={() => setShowClientResults(true)}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientResults(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                  
                  {showClientResults && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            onClick={() => {
                              setNewBudget({ ...newBudget, clientId: c.id, vehicleId: '' });
                              setClientSearch(c.name);
                              setVehicleSearch('');
                              setShowClientResults(false);
                            }}
                          >
                            <div className="font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email || c.phone}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic">Nenhum cliente encontrado</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                    <span>Veículo *</span>
                    <button 
                      type="button" 
                      disabled={!newBudget.clientId}
                      onClick={() => setIsVehicleModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Novo Veículo
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={newBudget.clientId ? "Pesquisar veículo..." : "Selecione um cliente primeiro"}
                      disabled={!newBudget.clientId}
                      value={vehicleSearch}
                      onFocus={() => setShowVehicleResults(true)}
                      onChange={(e) => {
                        setVehicleSearch(e.target.value);
                        setShowVehicleResults(true);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>

                  {showVehicleResults && newBudget.clientId && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredVehicles.length > 0 ? (
                        filteredVehicles.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                            onClick={() => {
                              setNewBudget({ ...newBudget, vehicleId: v.id });
                              setVehicleSearch(`${v.plate} - ${v.brand} ${v.model}`);
                              setShowVehicleResults(false);
                            }}
                          >
                            <div className="font-bold text-gray-900">{v.plate}</div>
                            <div className="text-xs text-gray-500">{v.brand} {v.model}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic">Nenhum veículo encontrado</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adicionar Serviços</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddServiceToBudget(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Selecione um serviço para adicionar...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>)}
                  </select>
                </div>
              </div>

              {/* Selected Services List */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Serviço</th>
                      <th className="px-4 py-2">Valor</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {newBudget.selectedServices.map((s, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{s.name}</td>
                        <td className="px-4 py-2 font-medium">R$ {s.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => removeServiceFromBudget(idx)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {newBudget.selectedServices.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">Nenhum serviço selecionado</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td className="px-4 py-2">Total</td>
                      <td colSpan={2} className="px-4 py-2 text-blue-600">R$ {calculateTotal().toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de Entrega</label>
                  <input
                    type="date"
                    value={newBudget.deliveryDate}
                    onChange={(e) => setNewBudget({ ...newBudget, deliveryDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={newBudget.observations}
                    onChange={(e) => setNewBudget({ ...newBudget, observations: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={1}
                    placeholder="Ex: Trocar filtro de ar também..."
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  {submitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : 'Criar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
