export interface User {
  id: string;
  email: string;
  role: 'Student' | 'SecurityOfficer' | 'Administrator' | string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}
