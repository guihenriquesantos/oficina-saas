import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Service } from '../types';
import { Plus, Search, Wrench, DollarSign, Clock, Loader2, X, Check, Power } from 'lucide-react';
import { toast } from 'sonner';

interface ServicesProps {
  user: UserProfile;
}

import { api } from '../lib/api';

export default function Services({ user }: ServicesProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: 0,
    estimatedTime: '',
    active: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    if (!user.companyId || user.companyId === 'pending_setup') {
      setLoading(false);
      return;
    }

    try {
      const data = await api.getServices();
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [user.companyId]);

  const handleAddService = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.createService(newService);
      toast.success('Serviço cadastrado com sucesso!');
      setIsModalOpen(false);
      setNewService({ name: '', description: '', price: 0, estimatedTime: '', active: true });
      fetchServices();
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Erro ao cadastrar serviço');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      await api.updateService(service.id, { active: !service.active });
      toast.success(`Serviço ${!service.active ? 'ativado' : 'desativado'} com sucesso!`);
      fetchServices();
    } catch (error) {
      console.error('Error updating service status:', error);
      toast.error('Erro ao atualizar status do serviço');
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Serviços</h2>
          <p className="text-gray-500">Gerencie o catálogo de serviços da sua oficina</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Serviço
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Serviço</th>
                <th className="px-6 py-3">Valor Padrão</th>
                <th className="px-6 py-3">Tempo Est.</th>
                <th className="px-6 py-3">Status</th>
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
              ) : filteredServices.map((s) => (
                <tr key={s.id} className={cn("hover:bg-gray-50", !s.active && "opacity-60")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <Wrench className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{s.description || 'Sem descrição'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">R$ {s.price.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" /> {s.estimatedTime || 'Não informado'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      s.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {s.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => toggleServiceStatus(s)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        s.active ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                      )}
                      title={s.active ? "Desativar" : "Ativar"}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredServices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum serviço encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Serviço</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddService} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço *</label>
                <input
                  required
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Troca de Óleo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalhes do serviço..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Padrão (R$) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newService.price}
                      onChange={(e) => setNewService({ ...newService, price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo Estimado</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={newService.estimatedTime}
                      onChange={(e) => setNewService({ ...newService, estimatedTime: e.target.value })}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 1h 30min"
                    />
                  </div>
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
                  {submitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : 'Salvar Serviço'}
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
