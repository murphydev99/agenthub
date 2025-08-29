import { LogLevel } from '@azure/msal-browser';
import type { Configuration } from '@azure/msal-browser';

// Azure AD B2C Configuration
export const b2cPolicies = {
  names: {
    signUpSignIn: 'B2C_1_signin',
    forgotPassword: 'B2C_1_passwordreset',
    editProfile: 'B2C_1_profileedit'
  },
  authorities: {
    signUpSignIn: {
      authority: `https://VistioSelfServiceDEV.b2clogin.com/VistioSelfServiceDEV.onmicrosoft.com/B2C_1_signin`
    },
    forgotPassword: {
      authority: `https://VistioSelfServiceDEV.b2clogin.com/VistioSelfServiceDEV.onmicrosoft.com/B2C_1_passwordreset`
    },
    editProfile: {
      authority: `https://VistioSelfServiceDEV.b2clogin.com/VistioSelfServiceDEV.onmicrosoft.com/B2C_1_profileedit`
    }
  },
  authorityDomain: 'VistioSelfServiceDEV.b2clogin.com'
};

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: '9bac66e0-6d6c-494e-b5a1-15e04d343110',
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: [b2cPolicies.authorityDomain],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true
  },
  cache: {
    cacheLocation: 'localStorage', // Better for persistent login
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Error
    }
  }
};

// API scope for accessing the backend
export const apiConfig = {
  scopes: [`https://VistioSelfServiceDEV.onmicrosoft.com/9bac66e0-6d6c-494e-b5a1-15e04d343110/access_as_user`],
  uri: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
};

// Scopes for ID token
export const loginRequest = {
  scopes: ['openid', 'profile', 'offline_access']
};

// Custom claims that might be returned from B2C
export interface B2CIdTokenClaims {
  // Standard claims
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  sub: string;
  
  // B2C specific
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  emails?: string[];
  
  // Custom claims from user attributes
  storeNumbers?: string[];
  pcNumbers?: string[];
  role?: string;
  franchiseeName?: string;
  franchiseeId?: string;
  phoneNumber?: string;
}