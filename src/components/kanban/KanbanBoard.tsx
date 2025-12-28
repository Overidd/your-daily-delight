import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Board, Column, Task } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, LogOut, LayoutGrid, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

export const KanbanBoard = () => {
  const { user, signOut } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (user) {
      loadOrCreateBoard();
    }
  }, [user]);

  const loadOrCreateBoard = async () => {
    if (!user) return;

    // Try to get existing board
    const { data: existingBoard } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingBoard) {
      setBoard(existingBoard);
      await loadBoardData(existingBoard.id);
    } else {
      // Create new board with default columns
      const { data: newBoard, error } = await supabase
        .from('boards')
        .insert({ user_id: user.id, title: 'Mi Tablero' })
        .select()
        .single();

      if (error) {
        toast.error('Error al crear el tablero');
        return;
      }

      setBoard(newBoard);

      // Create default columns
      const defaultColumns = ['Por Hacer', 'En Progreso', 'Completado'];
      const { data: createdColumns } = await supabase
        .from('columns')
        .insert(
          defaultColumns.map((title, index) => ({
            board_id: newBoard.id,
            title,
            position: index,
          }))
        )
        .select();

      if (createdColumns) {
        setColumns(createdColumns);
      }
    }
    setLoading(false);
  };

  const loadBoardData = async (boardId: string) => {
    const [columnsResult, tasksResult] = await Promise.all([
      supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position'),
      supabase.from('tasks').select('*').order('position'),
    ]);

    if (columnsResult.data) {
      setColumns(columnsResult.data);
    }
    if (tasksResult.data) {
      // Filter tasks to only those in this board's columns
      const columnIds = columnsResult.data?.map(c => c.id) || [];
      setTasks(tasksResult.data.filter(t => columnIds.includes(t.column_id)));
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !board) return;

    const { data, error } = await supabase
      .from('columns')
      .insert({
        board_id: board.id,
        title: newColumnTitle.trim(),
        position: columns.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Error al crear la columna');
      return;
    }

    setColumns([...columns, data]);
    setNewColumnTitle('');
    setIsAddingColumn(false);
    toast.success('Columna creada');
  };

  const handleDeleteColumn = async (columnId: string) => {
    const { error } = await supabase.from('columns').delete().eq('id', columnId);

    if (error) {
      toast.error('Error al eliminar la columna');
      return;
    }

    setColumns(columns.filter((c) => c.id !== columnId));
    setTasks(tasks.filter((t) => t.column_id !== columnId));
    toast.success('Columna eliminada');
  };

  const handleUpdateColumn = async (columnId: string, title: string) => {
    const { error } = await supabase
      .from('columns')
      .update({ title })
      .eq('id', columnId);

    if (error) {
      toast.error('Error al actualizar la columna');
      return;
    }

    setColumns(columns.map((c) => (c.id === columnId ? { ...c, title } : c)));
  };

  const handleAddTask = async (columnId: string, title: string) => {
    const columnTasks = tasks.filter((t) => t.column_id === columnId);
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        column_id: columnId,
        title,
        position: columnTasks.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Error al crear la tarea');
      return;
    }

    setTasks([...tasks, data]);
    toast.success('Tarea creada');
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);

    if (error) {
      toast.error('Error al eliminar la tarea');
      return;
    }

    setTasks(tasks.filter((t) => t.id !== taskId));
    toast.success('Tarea eliminada');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column
    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      // Moving to empty column or column itself
      if (activeTask.column_id !== overId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId
              ? { ...t, column_id: overId, position: tasks.filter(t => t.column_id === overId).length }
              : t
          )
        );
      }
      return;
    }

    // Check if dropping over another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.column_id !== overTask.column_id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, column_id: overTask.column_id }
            : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Get the target column
    let targetColumnId = activeTask.column_id;
    const overColumn = columns.find((c) => c.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (overColumn) {
      targetColumnId = overColumn.id;
    } else if (overTask) {
      targetColumnId = overTask.column_id;
    }

    // Reorder tasks in target column
    const columnTasks = tasks.filter((t) => t.column_id === targetColumnId);
    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const newIndex = overTask 
      ? columnTasks.findIndex((t) => t.id === overId)
      : columnTasks.length;

    if (oldIndex !== -1) {
      const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
      
      // Update positions
      const updatedTasks = tasks.map((t) => {
        if (t.column_id === targetColumnId) {
          const index = reorderedTasks.findIndex((rt) => rt.id === t.id);
          return { ...t, position: index };
        }
        return t;
      });

      setTasks(updatedTasks);

      // Update in database
      await Promise.all(
        reorderedTasks.map((t, index) =>
          supabase
            .from('tasks')
            .update({ position: index, column_id: targetColumnId })
            .eq('id', t.id)
        )
      );
    } else {
      // Task moved from different column
      const newPosition = overTask 
        ? columnTasks.findIndex((t) => t.id === overId)
        : columnTasks.length;

      await supabase
        .from('tasks')
        .update({ column_id: targetColumnId, position: newPosition })
        .eq('id', activeId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl mx-auto animate-pulse" style={{ background: 'var(--gradient-primary)' }} />
          <p className="text-muted-foreground">Cargando tablero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <LayoutGrid className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">{board?.title}</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={tasks
                    .filter((t) => t.column_id === column.id)
                    .sort((a, b) => a.position - b.position)}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onDeleteColumn={handleDeleteColumn}
                  onUpdateColumn={handleUpdateColumn}
                />
              ))}

            {/* Add Column */}
            {isAddingColumn ? (
              <div className="w-72 flex-shrink-0 bg-secondary/50 rounded-xl p-3 space-y-2">
                <Input
                  placeholder="Nombre de la columna..."
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddColumn} className="flex-1">
                    Crear
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-72 h-12 flex-shrink-0 border-dashed"
                onClick={() => setIsAddingColumn(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar columna
              </Button>
            )}
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="p-3 rotate-3 drag-shadow">
                <p className="text-sm font-medium">{activeTask.title}</p>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
};
