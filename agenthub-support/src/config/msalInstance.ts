import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from './authConfigB2C';

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Track initialization state
let initializePromise: Promise<void> | null = null;
let isInitialized = false;

// Initialize MSAL only once
export const initializeMsal = (): Promise<void> => {
  if (!initializePromise) {
    initializePromise = msalInstance.initialize().then(() => {
      isInitialized = true;
    });
  }
  return initializePromise;
};

// Export a function to handle the redirect
export const handleRedirectPromise = async () => {
  // ONLY call handleRedirectPromise if we're actually coming back from a B2C redirect
  // B2C returns with either #id_token or #error in the hash
  const hash = window.location.hash;
  
  // B2C specific: Check for B2C redirect patterns
  if (!hash || (!hash.includes('id_token') && !hash.includes('error') && !hash.includes('state='))) {
    // Not a B2C redirect, don't call handleRedirectPromise
    return null;
  }
  
  try {
    // We have B2C params, so handle the redirect
    const response = await msalInstance.handleRedirectPromise();
    
    if (response && response.account) {
      msalInstance.setActiveAccount(response.account);
      console.log('Successfully logged in:', response.account.username);
      
      // Clear the hash to prevent re-processing
      window.location.hash = '';
    }
    
    return response;
  } catch (error: any) {
    if (error?.errorCode && error.errorCode !== 'no_interaction_in_progress') {
      console.error('Error handling redirect:', error);
    }
    return null;
  }
};