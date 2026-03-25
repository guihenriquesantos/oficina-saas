import { useState, FormEvent, useEffect } from 'react';
import { collection, collectionGroup, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Budget, Company } from '../types';
import { Search, Car, FileText, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Calendar, Share2, Copy, Check, Wrench, Download } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { Link, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { generateBudgetPDF } from '../lib/pdf-generator';
import { api } from '../lib/api';

export default function PublicLookup() {
  const { companyId } = useParams();
  const [plate, setPlate] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

  useEffect(() => {
    if (companyId) {
      const fetchCompany = async () => {
        try {
          const data = await api.getPublicCompany(companyId);
          setCompany(data);
        } catch (error) {
          console.error('Error fetching company:', error);
        }
      };
      fetchCompany();
    }
  }, [companyId]);

  const handleGeneratePDF = async (budget: Budget) => {
    setGeneratingPDF(budget.id);
    try {
      // For public PDF, we might need a special endpoint or just use the budget data
      // Since budget already has services, and we have company info, we just need client/vehicle names
      // In a real app, we'd fetch these from public endpoints too if needed, or include them in the budget object
      
      generateBudgetPDF({
        budget,
        workshop: company,
        clientName: 'Cliente', // Placeholder or fetch if available
        vehicleName: budget.vehiclePlate
      });
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPDF(null);
    }
  };

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!plate || !companyId) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.lookupBudgets(companyId, plate.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      setBudgets(data);
    } catch (error) {
      console.error('Error looking up budget:', error);
      toast.error('Erro ao buscar orçamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header / Logo */}
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-200 mb-6 transform hover:rotate-12 transition-transform">
          <Wrench className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">
          {company ? company.name : 'Oficina Mecânica'}
        </h1>
        <p className="mt-3 text-slate-500 font-medium max-w-md mx-auto">
          Consulte o status do seu serviço de forma rápida e transparente.
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-8">
        {/* Search Form */}
        <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Car className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
              <input
                type="text"
                required
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="DIGITE A PLACA"
                className="w-full pl-16 pr-6 py-6 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 text-2xl font-black tracking-[0.2em] uppercase transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-6 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-blue-200 active:scale-95"
            >
              {loading ? (
                <Loader2 className="animate-spin w-7 h-7" />
              ) : (
                <>
                  <Search className="w-6 h-6 mr-3" />
                  Consultar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results Area */}
        <div className="space-y-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="bg-white h-64 rounded-3xl border border-slate-100 shadow-sm"></div>
              ))}
            </div>
          ) : budgets.length > 0 ? (
            budgets.map((budget, index) => (
              <div 
                key={budget.id} 
                className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Status Header */}
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Orçamento</p>
                      <h3 className="text-lg font-bold text-slate-900">#{budget.id.slice(-6).toUpperCase()}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleGeneratePDF(budget)}
                      disabled={generatingPDF === budget.id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                      {generatingPDF === budget.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      PDF
                    </button>
                    <StatusBadge status={budget.status} className="px-4 py-2 text-sm shadow-sm" />
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Services List */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviços e Peças</p>
                    <div className="space-y-3">
                      {budget.services.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <span className="text-slate-700 font-bold">{s.name}</span>
                          <span className="text-slate-900 font-black">R$ {s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observations */}
                  {budget.observations && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações da Oficina</p>
                      <div className="p-5 bg-blue-50/50 rounded-2xl text-slate-600 italic border border-blue-100/50 text-sm leading-relaxed">
                        "{budget.observations}"
                      </div>
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3 text-slate-500">
                      <div className="bg-slate-100 p-2 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Previsão de Entrega</p>
                        <p className="font-bold text-slate-900">
                          {budget.deliveryDate ? format(budget.deliveryDate.toDate(), 'dd/MM/yyyy') : 'A definir'}
                        </p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
                      <p className="text-4xl font-black text-blue-600 tracking-tight">
                        R$ {budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : searched ? (
            <div className="bg-white p-12 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Placa não encontrada</h3>
              <p className="text-slate-500 font-medium max-w-xs mx-auto">
                Não encontramos nenhum orçamento para a placa <span className="text-slate-900 font-bold">"{plate.toUpperCase()}"</span> nesta oficina.
              </p>
              <button 
                onClick={() => setSearched(false)}
                className="mt-8 text-blue-600 font-bold hover:underline"
              >
                Tentar outra placa
              </button>
            </div>
          ) : (
            <div className="text-center py-12 animate-in fade-in duration-1000">
              <p className="text-slate-400 font-medium flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Aguardando sua consulta...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-16 text-slate-400 text-sm font-medium flex items-center gap-2">
        <span>Desenvolvido por</span>
        <span className="text-slate-900 font-black tracking-tighter text-lg">MecânicaSaaS</span>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
