import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task } from '@/types/kanban';
import { TaskCard } from './TaskCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, Trash2, X, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onUpdateColumn: (columnId: string, title: string) => void;
}

export const KanbanColumn = ({
  column,
  tasks,
  onAddTask,
  onDeleteTask,
  onDeleteColumn,
  onUpdateColumn,
}: KanbanColumnProps) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(column.id, newTaskTitle.trim());
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  const handleUpdateTitle = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateColumn(column.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`flex flex-col w-72 flex-shrink-0 rounded-xl p-3 transition-colors duration-200 ${
        isOver ? 'bg-primary/10' : 'bg-secondary/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-8 text-sm font-semibold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUpdateTitle();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdateTitle}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <h3 
              className="font-semibold text-sm text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {column.title}
            </h3>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {tasks.length}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    Editar nombre
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDeleteColumn(column.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar columna
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 min-h-[100px]"
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>

      {isAddingTask ? (
        <div className="mt-2 space-y-2">
          <Input
            placeholder="Título de la tarea..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTask();
              if (e.key === 'Escape') setIsAddingTask(false);
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddTask} className="flex-1">
              Agregar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsAddingTask(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setIsAddingTask(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar tarea
        </Button>
      )}
    </div>
  );
};
