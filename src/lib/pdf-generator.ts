import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Budget, Company } from '../types';

interface GeneratePDFProps {
  budget: Budget;
  workshop: Company | null;
  clientName: string;
  vehicleName: string;
}

export const generateBudgetPDF = ({ budget, workshop, clientName, vehicleName }: GeneratePDFProps) => {
  const doc = new jsPDF() as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header - Workshop Info
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.setFont('helvetica', 'bold');
  doc.text(workshop?.name || 'Oficina Mecânica', 20, 25);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'normal');
  if (workshop?.address) doc.text(workshop.address, 20, 32);
  if (workshop?.phone) doc.text(`Tel: ${workshop.phone}`, 20, 37);
  if (workshop?.email) doc.text(`Email: ${workshop.email}`, 20, 42);

  // Budget Title & ID
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.setFont('helvetica', 'bold');
  doc.text(`ORÇAMENTO #${budget.id.slice(-6).toUpperCase()}`, pageWidth - 20, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  const dateStr = budget.createdAt?.toDate 
    ? format(budget.createdAt.toDate(), "dd/MM/yyyy HH:mm") 
    : format(new Date(), "dd/MM/yyyy HH:mm");
  doc.text(`Data: ${dateStr}`, pageWidth - 20, 32, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.line(20, 50, pageWidth - 20, 50);

  // Client & Vehicle Info Section
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE E VEÍCULO', 20, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // Slate-600
  
  // Left Column: Client
  doc.text('Cliente:', 20, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName, 45, 70);
  
  // Right Column: Vehicle
  doc.setFont('helvetica', 'normal');
  doc.text('Veículo:', 110, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(vehicleName, 135, 70);

  doc.setFont('helvetica', 'normal');
  doc.text('Placa:', 110, 77);
  doc.setFont('helvetica', 'bold');
  doc.text(budget.vehiclePlate, 135, 77);

  // Status Badge (Simulated)
  const statusLabels: Record<string, string> = {
    pending: 'PENDENTE',
    approved: 'APROVADO',
    executing: 'EM EXECUÇÃO',
    finished: 'FINALIZADO'
  };
  
  doc.setFont('helvetica', 'normal');
  doc.text('Status:', 20, 77);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabels[budget.status] || budget.status.toUpperCase(), 45, 77);

  // Services Table
  const tableData = budget.services.map(s => [
    s.name,
    `R$ ${s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  ]);

  doc.autoTable({
    startY: 85,
    head: [['Descrição do Serviço / Peça', 'Valor']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      1: { halign: 'right', cellWidth: 40 }
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    margin: { left: 20, right: 20 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

  // Total Value
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR TOTAL: R$ ${budget.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 15, { align: 'right' });

  // Observations
  if (budget.observations) {
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', 20, finalY + 15);
    
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'italic');
    const splitObs = doc.splitTextToSize(budget.observations, pageWidth - 40);
    doc.text(splitObs, 20, finalY + 22);
  }

  // Delivery Date
  if (budget.deliveryDate) {
    const deliveryY = budget.observations ? finalY + 40 : finalY + 30;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('PREVISÃO DE ENTREGA:', 20, deliveryY);
    
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    const deliveryStr = format(budget.deliveryDate.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.text(deliveryStr, 70, deliveryY);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Este documento é um orçamento sujeito a alterações após desmontagem ou análise técnica detalhada.', pageWidth / 2, 285, { align: 'center' });
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} - MecânicaSaaS`, pageWidth / 2, 290, { align: 'center' });

  // Save the PDF
  doc.save(`orcamento_${budget.vehiclePlate}_${budget.id.slice(-6)}.pdf`);
};
