import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function MailingButton() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate('/phone-setup')}
      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors"
      title="רישום טלפון ודיוור"
    >
      <Mail className="w-4 h-4" />
      <span className="hidden sm:inline">רישום ודיוור</span>
    </button>
  );
}