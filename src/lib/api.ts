import { auth } from './firebase';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export const api = {
  getBudgets: () => apiFetch('/api/budgets'),
  createBudget: (data: any) => apiFetch('/api/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getClients: () => apiFetch('/api/clients'),
  createClient: (data: any) => apiFetch('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getVehicles: () => apiFetch('/api/vehicles'),
  createVehicle: (data: any) => apiFetch('/api/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getServices: () => apiFetch('/api/services'),
  createService: (data: any) => apiFetch('/api/services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateService: (id: string, data: any) => apiFetch(`/api/services/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  updateBudgetPayment: (id: string, data: any) => apiFetch(`/api/budgets/${id}/payment`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  updateBudgetStatus: (id: string, status: string) => apiFetch(`/api/budgets/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  getCompany: () => apiFetch('/api/company'),
  setupCompany: (companyName: string) => apiFetch('/api/setup', {
    method: 'POST',
    body: JSON.stringify({ companyName }),
  }),
  // Public
  getPublicCompany: (id: string) => fetch(`/api/public/company/${id}`).then(res => res.json()),
  lookupBudgets: (companyId: string, plate: string) => fetch(`/api/public/budgets/${companyId}/${plate}`).then(res => res.json()),
};
