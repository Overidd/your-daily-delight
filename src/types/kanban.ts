export interface Task {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
