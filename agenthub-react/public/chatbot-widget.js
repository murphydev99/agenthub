(function() {
  // Token configuration for different environments
  const tokenConfig = {
    'localhost:5173': 'fa0203a5dcac18d6524422d35b46d25fb21da314ec925d47e8092984e8d22ff4',
    'localhost:5174': '91b7f6f845a950cfaadc0cf478ee2e8d6b0fc1232b9e9757d8133a8b10624cdd',
    'agenthubdev.azurewebsites.net': '8716430d54c4cdc020842713c396450e9080c6252db1a1a84938b0f583da82d0', // Generate this token in admin panel
    // Add more domains and tokens as needed
  };
  
  // Get current domain
  const currentDomain = window.location.host;
  
  // Find matching token
  const token = tokenConfig[currentDomain];
  
  if (!token || token === 'AZURE_TOKEN_PLACEHOLDER') {
    console.warn('AgentHub: No valid token configured for domain:', currentDomain);
    console.warn('Please generate a token for this domain in the admin panel at /admin/tokens');
    // Still continue to load the widget, but it may fail authorization
  }
  
  // Create iframe for the chatbot
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.protocol}//${window.location.host}/chatbot?embedded=true`;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = 'none'; // Remove shadow completely
  iframe.style.zIndex = '9999';
  iframe.style.display = 'block'; // Always show the iframe so the button is visible
  iframe.style.background = 'transparent';
  iframe.style.colorScheme = 'light';
  
  // Pass configuration to iframe
  iframe.onload = function() {
    // Merge token with any user-provided config
    const config = {
      ...(window.agentHubConfig || {}),
      token: token // Token from our config takes precedence
    };
    
    // Send the configuration to the iframe
    iframe.contentWindow.postMessage({
      type: 'AGENTHUB_CONFIG',
      config: config
    }, '*');
    
    // Don't show the iframe immediately - wait for it to be opened
    // The iframe will be shown when the user clicks the chat button
  };
  
  // Add iframe to page
  document.body.appendChild(iframe);
  
  // Handle responsive sizing
  function adjustSize() {
    if (window.innerWidth < 450) {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.borderRadius = '0';
    } else {
      iframe.style.width = '400px';
      iframe.style.height = '600px';
      iframe.style.bottom = '20px';
      iframe.style.right = '20px';
      iframe.style.borderRadius = '12px';
    }
  }
  
  window.addEventListener('resize', adjustSize);
  adjustSize();
})();