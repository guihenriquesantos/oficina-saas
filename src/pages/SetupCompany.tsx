import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { Building, Loader2, LogOut } from 'lucide-react';

import { api } from '../lib/api';

export default function SetupCompany() {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);

    try {
      await api.setupCompany(companyName);
      toast.success('Empresa configurada com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Error in setup:', error);
      toast.error('Erro ao configurar empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Quase lá!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Dê um nome para sua empresa para começar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSetup}>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Nome da Empresa
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Ex: Oficina do João"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Finalizar Configuração'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
