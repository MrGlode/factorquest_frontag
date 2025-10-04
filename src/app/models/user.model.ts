export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number; // en secondes
}

export interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}