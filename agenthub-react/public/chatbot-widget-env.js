(function() {
  // This approach uses a single token that you configure per environment
  // The token should be injected at build/deploy time
  
  // For development, use localhost token
  // For production, this would be replaced during deployment
  const CHATBOT_TOKEN = 'CHATBOT_TOKEN_PLACEHOLDER';
  
  // Detect if we're using a placeholder (development)
  const token = CHATBOT_TOKEN === 'CHATBOT_TOKEN_PLACEHOLDER' 
    ? '91b7f6f845a950cfaadc0cf478ee2e8d6b0fc1232b9e9757d8133a8b10624cdd' // localhost token
    : CHATBOT_TOKEN;
  
  // Create iframe for the chatbot
  const iframe = document.createElement('iframe');
  iframe.src = `${window.location.protocol}//${window.location.host}/chatbot`;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  iframe.style.zIndex = '9999';
  iframe.style.display = 'none'; // Start hidden
  
  // Pass configuration to iframe
  iframe.onload = function() {
    // Send the configuration to the iframe
    iframe.contentWindow.postMessage({
      type: 'AGENTHUB_CONFIG',
      config: {
        token: token,
        position: window.agentHubConfig?.position || 'bottom-right',
        primaryColor: window.agentHubConfig?.primaryColor || '#3B82F6',
        title: window.agentHubConfig?.title,
        welcomeMessage: window.agentHubConfig?.welcomeMessage
      }
    }, '*');
    
    // Show the iframe after config is sent
    setTimeout(() => {
      iframe.style.display = 'block';
    }, 100);
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