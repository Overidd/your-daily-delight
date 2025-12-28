import { ErrorCustom } from '@/lib';



export interface ILoginDTO {
  email: string;
  password: string;
  name: string;
}

export interface IAuthResponse {
  token: string;
  user: IUser;
}

interface IUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export class AuthService {
  private readonly URL_API = import.meta.env.VITE_URL_API;

  async login(data: Omit<ILoginDTO, 'name'>): Promise<IAuthResponse> {
    console.log(this.URL_API)
    try {
      const resp = await fetch(`${this.URL_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new ErrorCustom(
          result?.error ?? 'Credenciales inválidas',
          resp.status,
          result
        );
      }
      return result;

    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Credenciales inválidas',
        error.status || 500
      );
    }
  }

  async register(data: ILoginDTO): Promise<IAuthResponse> {
    try {
      const resp = await fetch(`${this.URL_API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new ErrorCustom(
          result?.error ?? 'Error al registrar el usuario',
          resp.status,
          result
        );
      }

      return result;
    } catch (error) {
      throw new ErrorCustom(
        error.message || 'Error al registrar el usuario',
        error.status || 500
      );
    }
  }

  async verify(token: string): Promise<IUser> {
    const resp = await fetch(`${this.URL_API}/auth/verify`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),

    });

    const result = await resp.json();

    if (!resp.ok) {
      throw new ErrorCustom('Token inválido', resp.status);
    }

    return result.user;
  }

  logout() {
    localStorage.removeItem('token');
  }
}
