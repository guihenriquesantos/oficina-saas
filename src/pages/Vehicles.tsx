import { useState, useEffect, FormEvent } from 'react';
import { collection, query, getDocs, addDoc, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Vehicle, Client } from '../types';
import { Plus, Search, Car, User, Calendar, Hash, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface VehiclesProps {
  user: UserProfile;
}

import { api } from '../lib/api';

export default function Vehicles({ user }: VehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    brand: '',
    model: '',
    year: '',
    mileage: 0,
    clientId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user.companyId || user.companyId === 'pending_setup') {
      setLoading(false);
      return;
    }

    try {
      const [vehiclesData, clientsData] = await Promise.all([
        api.getVehicles(),
        api.getClients()
      ]);
      setVehicles(vehiclesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.companyId]);

  const handleAddVehicle = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check if plate already exists in this company
      const plateCheck = query(
        collection(db, `vehicles`),
        where('companyId', '==', user.companyId),
        where('plate', '==', newVehicle.plate.toUpperCase())
      );
      const plateSnap = await getDocs(plateCheck);
      
      if (!plateSnap.empty) {
        toast.error('Esta placa já está cadastrada nesta oficina');
        setSubmitting(false);
        return;
      }

      await api.createVehicle(newVehicle);
      
      toast.success('Veículo cadastrado com sucesso!');
      setIsModalOpen(false);
      setNewVehicle({ plate: '', brand: '', model: '', year: '', mileage: 0, clientId: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Erro ao cadastrar veículo');
    } finally {
      setSubmitting(false);
    }
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'Cliente não encontrado';
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Veículos</h2>
          <p className="text-gray-500">Gerencie os veículos dos seus clientes</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Veículo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por placa, marca ou modelo..."
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
                <th className="px-6 py-3">Placa</th>
                <th className="px-6 py-3">Veículo</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">KM</th>
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
              ) : filteredVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="bg-gray-100 border border-gray-300 px-2 py-1 rounded text-sm font-bold tracking-widest text-gray-800 inline-block">
                      {v.plate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full mr-3">
                        <Car className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{v.brand} {v.model}</div>
                        <div className="text-xs text-gray-500">{v.year || 'Ano não informado'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 flex items-center">
                      <User className="w-3 h-3 mr-1" /> {getClientName(v.clientId)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {v.mileage?.toLocaleString()} km
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver Orçamentos</button>
                  </td>
                </tr>
              ))}
              {!loading && filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum veículo encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Novo Veículo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
                  <input
                    required
                    type="text"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder="ABC1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                  <input
                    type="text"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="2020"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
                  <input
                    required
                    type="text"
                    value={newVehicle.brand}
                    onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Toyota"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                  <input
                    required
                    type="text"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Corolla"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quilometragem</label>
                <input
                  type="number"
                  value={newVehicle.mileage}
                  onChange={(e) => setNewVehicle({ ...newVehicle, mileage: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proprietário *</label>
                <select
                  required
                  value={newVehicle.clientId}
                  onChange={(e) => setNewVehicle({ ...newVehicle, clientId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
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
                  {submitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
