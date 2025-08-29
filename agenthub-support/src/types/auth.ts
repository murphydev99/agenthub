export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  stores: UserStore[];
  role: UserRole;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStore {
  storeNumber: string;
  pcNumber: string;
  role: StoreRole;
  permissions: string[];
}

export enum UserRole {
  ADMIN = 'admin',
  FRANCHISEE = 'franchisee',
  STORE_MANAGER = 'store_manager',
  EMPLOYEE = 'employee'
}

export enum StoreRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface MFAChallenge {
  challengeId: string;
  type: MFAType;
  destination?: string; // Phone number or email (masked)
}

export enum MFAType {
  SMS = 'sms',
  EMAIL = 'email',
  AUTHENTICATOR = 'authenticator'
}

export interface AuthResponse {
  token: string;
  user: User;
  mfaRequired?: boolean;
  mfaChallenge?: MFAChallenge;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: string;
}