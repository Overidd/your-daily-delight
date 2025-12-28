import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-xl animate-pulse bg-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <KanbanBoard />;
};

export default Index;
