import { ErrorCustom } from "@/lib";

interface ITodo {
  id: string;
  title: string;
  description?: string;
  // Ahora completed almacena el estado textual del todo
  // 'pendiente' | 'en proceso' | 'completado'
  completed: string;
  category: string;
  userId?: string;
}

export class TodoService {
  private URL_API: string;
  constructor() {
    this.URL_API = import.meta.env.VITE_URL_API;
  }

  getToken() {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      return null;
    }
  }

  public async createTodo(data: Omit<ITodo, 'id'>): Promise<ITodo> {
    try {
      const rest = await fetch(`${this.URL_API}/todo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(data)
      })
      const result = await rest.json();

      if (!rest.ok) {
        throw new ErrorCustom(
          result.message || 'Error al registrar el todo',
          rest.status,
        );
      }

      return result;

    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Error al registrar el todo',
        error.status || 500,
      );
    }
  }

  public async getTodos(): Promise<ITodo[]> {
    try {
      const rest = await fetch(`${this.URL_API}/todo`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
      })
      const result = await rest.json();

      if (!rest.ok) {
        throw new ErrorCustom(
          result.message || 'Error al obtener los todos',
          rest.status,
        );
      }

      return result;

    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Error al obtener los todos',
        error.status || 500,
      );
    }
  }

  public async deleteTodo(id: string): Promise<boolean> {
    try {
      const rest = await fetch(`${this.URL_API}/todo/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
      })

      if (!rest.ok) {
        throw new ErrorCustom(
          'Error al eliminar el todo',
          rest.status,
        );
      }

      return true;

    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Error al eliminar el todo',
        error.status || 500,
      );
    }
  }

  public async deleteTodoAll(): Promise<boolean> {
    try {
      const rest = await fetch(`${this.URL_API}/todo`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
      })

      if (!rest.ok) {
        throw new ErrorCustom(
          'Error al eliminar todos los todos',
          rest.status,
        );
      }

      return true;

    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Error al eliminar todos los todos',
        error.status || 500,
      );
    }
  }

  public async updateTodo(id: string, data: Omit<ITodo, 'id'>): Promise<ITodo> {
    try {
      const rest = await fetch(`${this.URL_API}/todo/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(data)
      })
      const result = await rest.json();

      if (!rest.ok) {
        throw new ErrorCustom(
          result.message || 'Error al actualizar el todo',
          rest.status,
        );
      }

      return result;

    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Error al actualizar el todo',
        error.status || 500,
      );
    }
  }

}