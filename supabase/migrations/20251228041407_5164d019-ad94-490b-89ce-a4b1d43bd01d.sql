-- Create boards table
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Mi Tablero',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create columns table
CREATE TABLE public.columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Boards policies
CREATE POLICY "Users can view their own boards" ON public.boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boards" ON public.boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boards" ON public.boards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own boards" ON public.boards
  FOR DELETE USING (auth.uid() = user_id);

-- Columns policies (through board ownership)
CREATE POLICY "Users can view columns of their boards" ON public.columns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
  );

CREATE POLICY "Users can create columns in their boards" ON public.columns
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
  );

CREATE POLICY "Users can update columns in their boards" ON public.columns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
  );

CREATE POLICY "Users can delete columns from their boards" ON public.columns
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.boards WHERE boards.id = columns.board_id AND boards.user_id = auth.uid())
  );

-- Tasks policies (through column -> board ownership)
CREATE POLICY "Users can view tasks in their boards" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id = tasks.column_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their boards" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id = tasks.column_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their boards" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id = tasks.column_id AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks from their boards" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.columns c
      JOIN public.boards b ON b.id = c.board_id
      WHERE c.id = tasks.column_id AND b.user_id = auth.uid()
    )
  );

-- Update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;