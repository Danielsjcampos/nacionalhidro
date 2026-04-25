import jwtConfig from './jwtConfig';

const auth = {
  getToken(): string | null {
    return localStorage.getItem(jwtConfig.storageTokenKeyName);
  },

  setToken(value: string): void {
    localStorage.setItem(jwtConfig.storageTokenKeyName, value);
  },

  clearToken(): void {
    localStorage.removeItem(jwtConfig.storageTokenKeyName);
    localStorage.removeItem(jwtConfig.storageRefreshTokenKeyName);
  },

  getUserInfo(): Record<string, unknown> | null {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUserInfo(user: Record<string, unknown>): void {
    localStorage.setItem('userData', JSON.stringify(user));
  },

  clearUserInfo(): void {
    localStorage.removeItem('userData');
  },
};

export default auth;
