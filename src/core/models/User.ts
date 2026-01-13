import { UserRole } from '../../types/userRoles';

export interface User {
  username: string;
  name: string;
  email?: string;
  password?: string;
  role: UserRole;
  isVerified?: boolean;
  createdAt?: string;
  currentLocation?: {
    province?: string;
    municipality?: string;
  };
  pendingReportsCount?: number;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface CreateUserData {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  currentLocation?: {
    province?: string;
    municipality?: string;
  };
}
