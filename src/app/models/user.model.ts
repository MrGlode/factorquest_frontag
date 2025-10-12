export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // en secondes
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgetPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface TokenPayload {
  sub: string; // userId
  username: string;
  email: string;
  roles: string[];
  iat: number; // issued at
  exp: number; // expiration
}