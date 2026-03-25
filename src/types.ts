export type BudgetStatus = 'pending' | 'approved' | 'executing' | 'finished';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMethod = 'pix' | 'card' | 'cash' | 'other';

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email: string;
  createdAt: any;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  companyId: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  companyId: string;
  createdAt: any;
}

export interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year?: string;
  mileage?: number;
  clientId: string;
  companyId: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedTime?: string;
  active: boolean;
  companyId: string;
}

export interface BudgetService {
  serviceId: string;
  name: string;
  price: number;
}

export interface Budget {
  id: string;
  clientId: string;
  vehicleId: string;
  vehiclePlate: string;
  services: BudgetService[];
  status: BudgetStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: any;
  totalValue: number;
  observations?: string;
  companyId: string;
  createdAt: any;
  deliveryDate?: any;
}
