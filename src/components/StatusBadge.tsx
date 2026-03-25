import { BudgetStatus } from '../types';

interface StatusBadgeProps {
  status: BudgetStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = {
    pending: {
      label: 'Pendente',
      classes: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    approved: {
      label: 'Aprovado',
      classes: 'bg-green-100 text-green-700 border-green-200',
    },
    executing: {
      label: 'Em Execução',
      classes: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    finished: {
      label: 'Finalizado',
      classes: 'bg-gray-100 text-gray-700 border-gray-200',
    },
  };

  const { label, classes } = config[status] || config.pending;

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider inline-flex items-center justify-center ${classes} ${className}`}>
      {label}
    </span>
  );
}
