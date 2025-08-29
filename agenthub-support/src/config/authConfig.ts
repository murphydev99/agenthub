import { LogLevel } from '@azure/msal-browser';
import type { Configuration } from '@azure/msal-browser';

// B2C Configuration
const b2cDomain = 'VistioSelfServiceDEV.b2clogin.com';
const tenantName = 'VistioSelfServiceDEV.onmicrosoft.com';
const clientId = '9bac66e0-6d6c-494e-b5a1-15e04d343110';
const signInPolicy = 'B2C_1_signin';

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: `https://${b2cDomain}/${tenantName}/${signInPolicy}`,
    knownAuthorities: [b2cDomain],
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Error,
      piiLoggingEnabled: false
    }
  }
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'https://VistioSelfServiceDEV.onmicrosoft.com/9bac66e0-6d6c-494e-b5a1-15e04d343110/access_as_user']
};