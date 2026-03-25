import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Client, Vehicle, Service } from '../types';
import { toast } from 'sonner';

export function useDataLists(companyId: string) {
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshClients = useCallback(async () => {
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  const refreshVehicles = useCallback(async () => {
    try {
      const data = await api.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }, []);

  const refreshServices = useCallback(async () => {
    try {
      const data = await api.getServices();
      setServices(data.filter((s: Service) => s.active));
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!companyId || companyId === 'pending_setup') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await Promise.all([refreshClients(), refreshVehicles(), refreshServices()]);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [companyId, refreshClients, refreshVehicles, refreshServices]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    clients,
    vehicles,
    services,
    loading,
    refreshClients,
    refreshVehicles,
    refreshServices,
    refreshAll,
    setClients,
    setVehicles
  };
}
