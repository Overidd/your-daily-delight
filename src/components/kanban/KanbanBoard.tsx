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
import { useAuth } from '@/hooks/useAuth';
import { Board, Column, Task } from '@/types/kanban';
import { KanbanColumn } from './KanbanColumn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, LogOut, LayoutGrid, X, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfileSettings } from '@/components/ProfileSettings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Profile } from '@/types/profile';
import { todoService } from '@/service';

export const KanbanBoard = () => {
  const { user, signOut } = useAuth();
  const [board, setBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (user) {
      initializeBoard();
      loadProfile();
    }
  }, [user]);

  const loadProfile = () => {
    if (!user) return;

    // Ya no usamos Supabase para el perfil; solo usamos la info básica del usuario
    setProfile({
      id: user.id,
      user_id: user.id,
      full_name: user.name,
      avatar_url: null,
      created_at: '',
      updated_at: '',
    });
  };

  const initializeBoard = async () => {
    if (!user) return;

    const now = new Date().toISOString();

    // Tablero solo de frontend con 3 columnas fijas
    const localBoard: Board = {
      id: 'local-board',
      user_id: user.id,
      title: 'Mi Tablero',
      created_at: now,
      updated_at: now,
    };

    const fixedColumns: Column[] = [
      {
        id: 'Pendiente',
        board_id: localBoard.id,
        title: 'Pendiente',
        position: 0,
        created_at: now,
      },
      {
        id: 'En proceso',
        board_id: localBoard.id,
        title: 'En proceso',
        position: 1,
        created_at: now,
      },
      {
        id: 'Completados',
        board_id: localBoard.id,
        title: 'Completados',
        position: 2,
        created_at: now,
      },
    ];

    setBoard(localBoard);
    setColumns(fixedColumns);

    try {
      const todos = await todoService.getTodos();
      const validCategories = new Set(fixedColumns.map((c) => c.title));

      const mappedTasks: Task[] = todos.map((todo, index) => {
        // completed y category deberían contener el nombre de la columna
        const completedValue = String(todo.completed || '');

        let category = 'Pendiente';
        if (todo.category && validCategories.has(todo.category)) {
          category = todo.category;
        } else if (completedValue && validCategories.has(completedValue)) {
          category = completedValue;
        }

        return {
          id: todo.id,
          column_id: category,
          title: todo.title,
          description: todo.description ?? null,
          position: index,
          created_at: now,
          updated_at: now,
        };
      });

      setTasks(mappedTasks);
    } catch (error) {
      toast.error('Error al cargar tus tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddColumn = () => {
    // Crear columnas está deshabilitado
    toast.error('La creación de nuevas columnas está deshabilitada.');
  };

  const handleDeleteColumn = (columnId: string) => {
    // Columnas fijas: no permitimos eliminarlas
    toast.error('No puedes eliminar las columnas fijas.');
  };

  const handleUpdateColumn = (columnId: string, title: string) => {
    // Columnas fijas: no permitimos renombrarlas
    toast.error('No puedes renombrar las columnas fijas.');
  };

  const handleAddTask = async (columnId: string, title: string) => {
    try {
      const column = columns.find((c) => c.id === columnId);
      const categoryName = column?.title ?? columnId;

      // Guardamos el nombre de la columna tanto en completed como en category
      const newTodo = await todoService.createTodo({
        title,
        description: '',
        completed: categoryName,
        category: categoryName,
      });

      const columnTasks = tasks.filter((t) => t.column_id === categoryName);

      const newTask: Task = {
        id: newTodo.id,
        column_id: categoryName,
        title: newTodo.title,
        description: newTodo.description ?? null,
        position: columnTasks.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTasks([...tasks, newTask]);
      toast.success('Tarea creada');
    } catch (error) {
      toast.error('Error al crear la tarea');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await todoService.deleteTodo(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
      toast.success('Tarea eliminada');
    } catch (error) {
      toast.error('Error al eliminar la tarea');
    }
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

    const overColumn = columns.find((c) => c.id === overId);
    if (overColumn) {
      if (activeTask.column_id !== overId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId
              ? {
                ...t,
                column_id: overId,
                position: tasks.filter((t) => t.column_id === overId).length,
              }
              : t
          )
        );
      }
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.column_id !== overTask.column_id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, column_id: overTask.column_id } : t
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

    let targetColumnId = activeTask.column_id;
    const overColumn = columns.find((c) => c.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (overColumn) {
      targetColumnId = overColumn.id;
    } else if (overTask) {
      targetColumnId = overTask.column_id;
    }

    const columnTasks = tasks.filter((t) => t.column_id === targetColumnId);
    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const newIndex = overTask
      ? columnTasks.findIndex((t) => t.id === overId)
      : columnTasks.length;

    if (oldIndex !== -1) {
      const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);

      const updatedTasks = tasks.map((t) => {
        if (t.column_id === targetColumnId) {
          const index = reorderedTasks.findIndex((rt) => rt.id === t.id);
          return { ...t, position: index };
        }
        return t;
      });

      setTasks(updatedTasks);
    }

    // Actualizar el estado "completed" y la category del todo cuando cambie de columna
    try {
      const movedTask = tasks.find((t) => t.id === activeId);
      const targetColumn = columns.find((c) => c.id === targetColumnId);
      const categoryName = targetColumn?.title ?? targetColumnId;

      if (movedTask) {
        // Sincronizamos ambos campos con el nombre de la columna destino
        await todoService.updateTodo(activeId, {
          title: movedTask.title,
          description: movedTask.description ?? '',
          completed: categoryName,
          category: categoryName,
        });
      }
    } catch (error) {
      toast.error('Error al actualizar la tarea');
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl mx-auto animate-pulse bg-primary" />
          <p className="text-muted-foreground">Cargando tablero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary">
              <LayoutGrid className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">{board?.title}</h1>
              <p className="text-xs text-muted-foreground">
                {profile?.full_name || user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url || ''} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} alt="Avatar" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {profile?.full_name || 'Sin nombre'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

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

            <Button
              variant="outline"
              className="w-72 h-12 flex-shrink-0 border-dashed"
              disabled
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar columna (deshabilitado)
            </Button>
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

      <ProfileSettings
        open={profileOpen}
        onOpenChange={(open) => {
          setProfileOpen(open);
        }}
      />
    </div>
  );
};
