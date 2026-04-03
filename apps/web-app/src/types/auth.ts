export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  ageVerified: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface OAuthProvider {
  id: 'google' | 'discord';
  name: string;
  enabled: boolean;
}
