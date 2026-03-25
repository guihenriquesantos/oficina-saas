import { X, FileText, User, Wrench, Calendar, Download, Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Budget, Company, Client } from '../types';
import StatusBadge from './StatusBadge';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateBudgetPDF } from '../lib/pdf-generator';
import { toast } from 'sonner';

interface BudgetDetailsModalProps {
  budget: Budget;
  onClose: () => void;
  clientName?: string;
  vehicleName?: string;
}

export default function BudgetDetailsModal({ budget, onClose, clientName, vehicleName }: BudgetDetailsModalProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companySnap, clientSnap] = await Promise.all([
          getDoc(doc(db, 'companies', budget.companyId)),
          getDoc(doc(db, `clients/${budget.clientId}`))
        ]);

        if (companySnap.exists()) {
          setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
        }
        if (clientSnap.exists()) {
          setClient({ id: clientSnap.id, ...clientSnap.data() } as Client);
        }
      } catch (error) {
        console.error('Error fetching data for modal:', error);
      }
    };
    fetchData();
  }, [budget.companyId, budget.clientId]);

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      generateBudgetPDF({
        budget,
        workshop: company, // Keep prop name for compatibility or update pdf-generator
        clientName: clientName || client?.name || 'N/A',
        vehicleName: vehicleName || 'N/A'
      });
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = client?.whatsapp || client?.phone;
    if (!phone) {
      toast.error('Cliente não possui número de WhatsApp cadastrado');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      approved: 'Aprovado',
      executing: 'Em Execução',
      finished: 'Finalizado'
    };

    const publicUrl = `${window.location.origin}/lookup/${budget.companyId}`;
    const message = `Olá ${client?.name}! 🚗\n\n` +
      `Seu orçamento na *${company?.name || 'nossa oficina'}* está pronto.\n\n` +
      `*Veículo:* ${vehicleName || 'Seu veículo'}\n` +
      `*Placa:* ${budget.vehiclePlate}\n` +
      `*Status:* ${statusLabels[budget.status] || budget.status}\n` +
      `*Valor Total:* R$ ${budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `Você pode conferir todos os detalhes e o status em tempo real clicando no link abaixo:\n` +
      `${publicUrl}\n\n` +
      `Qualquer dúvida, estamos à disposição!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Orçamento #{budget.id.slice(-6).toUpperCase()}</h3>
              <p className="text-xs text-gray-500">
                {budget.createdAt?.toDate ? format(budget.createdAt.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Data não disponível'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-all"
              title="Enviar via WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button 
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
              title="Gerar PDF"
            >
              {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status do Orçamento</p>
              <StatusBadge status={budget.status} className="px-3 py-1.5 text-xs" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Placa do Veículo</p>
              <p className="text-lg font-black text-gray-900">{budget.vehiclePlate}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-bold">{clientName || 'Carregando...'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Veículo</p>
              <div className="flex items-center gap-2 text-gray-700">
                <Wrench className="w-4 h-4 text-gray-400" />
                <span className="font-bold">{vehicleName || 'Carregando...'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serviços e Peças</p>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left">Descrição</th>
                    <th className="px-4 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {budget.services.map((s, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-gray-700">{s.name}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">R$ {s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50/50 font-black">
                  <tr>
                    <td className="px-4 py-3 text-blue-900">Total Geral</td>
                    <td className="px-4 py-3 text-right text-blue-600 text-lg">R$ {budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {budget.observations && (
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações</p>
              <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 italic border border-gray-100">
                "{budget.observations}"
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-gray-50">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Calendar className="w-4 h-4" />
              <span>Previsão: {budget.deliveryDate?.toDate ? format(budget.deliveryDate.toDate(), "dd/MM/yyyy") : 'Não informada'}</span>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
