// Simple Azure AD B2C Configuration without MSAL for now
// This will be replaced with actual MSAL config when B2C is set up

export const b2cConfig = {
  tenantName: import.meta.env.VITE_B2C_TENANT_NAME || 'yourtenantname',
  clientId: import.meta.env.VITE_B2C_CLIENT_ID || 'your-client-id',
  signUpSignInPolicy: import.meta.env.VITE_B2C_SIGNUP_SIGNIN_POLICY || 'B2C_1_SignUpSignIn',
  passwordResetPolicy: import.meta.env.VITE_B2C_PASSWORD_RESET_POLICY || 'B2C_1_PasswordReset',
  profileEditPolicy: import.meta.env.VITE_B2C_PROFILE_EDIT_POLICY || 'B2C_1_ProfileEdit',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
};

export interface User {
  id: string;
  email: string;
  name?: string;
  storeNumbers?: string[];
  franchiseeId?: string;
}

// Mock auth for development
export const mockUser: User = {
  id: 'mock-user-123',
  email: 'franchise.owner@example.com',
  name: 'John Franchise Owner',
  storeNumbers: ['0234', '0567', '0891'],
  franchiseeId: 'FR-12345'
};