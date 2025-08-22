(function() {
  // Token configuration for different environments
  const tokenConfig = {
    'localhost:5173': 'fa0203a5dcac18d6524422d35b46d25fb21da314ec925d47e8092984e8d22ff4',
    'localhost:5174': '91b7f6f845a950cfaadc0cf478ee2e8d6b0fc1232b9e9757d8133a8b10624cdd',
    'agenthubdev.azurewebsites.net': '8716430d54c4cdc020842713c396450e9080c6252db1a1a84938b0f583da82d0',
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
  iframe.src = `${window.location.protocol}//${window.location.host}/chatbot?embedded=true&defaultOpen=true`;
  iframe.style.position = 'fixed';
  iframe.style.border = 'none';
  iframe.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.12)';
  iframe.style.zIndex = '9999';
  iframe.style.display = 'block'; // Always visible
  iframe.style.background = 'white';
  iframe.style.colorScheme = 'light';
  
  // Function to calculate and set iframe dimensions
  function calculateDimensions() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get available space (considering any user-specified constraints)
    const config = window.agentHubConfig || {};
    const maxWidth = config.maxWidth || 450;
    const maxHeight = config.maxHeight || 650;
    const minWidth = config.minWidth || 320;
    const minHeight = config.minHeight || 400;
    const margin = config.margin || 20;
    
    // Position can be customized via config
    const position = config.position || 'bottom-right';
    
    // Calculate dimensions based on viewport
    let width, height, top, right, bottom, left;
    
    // On small screens, use more of the viewport
    if (viewportWidth < 600) {
      width = Math.min(viewportWidth - (margin * 2), maxWidth);
      height = Math.min(viewportHeight - (margin * 2), maxHeight);
    } else {
      // On larger screens, use configured or default sizes
      width = Math.min(maxWidth, viewportWidth - (margin * 2));
      height = Math.min(maxHeight, viewportHeight - (margin * 2));
    }
    
    // Ensure minimum sizes
    width = Math.max(width, minWidth);
    height = Math.max(height, minHeight);
    
    // Position the iframe based on config
    switch(position) {
      case 'bottom-left':
        bottom = margin + 'px';
        left = margin + 'px';
        iframe.style.bottom = bottom;
        iframe.style.left = left;
        iframe.style.right = 'auto';
        iframe.style.top = 'auto';
        break;
      case 'top-right':
        top = margin + 'px';
        right = margin + 'px';
        iframe.style.top = top;
        iframe.style.right = right;
        iframe.style.bottom = 'auto';
        iframe.style.left = 'auto';
        break;
      case 'top-left':
        top = margin + 'px';
        left = margin + 'px';
        iframe.style.top = top;
        iframe.style.left = left;
        iframe.style.right = 'auto';
        iframe.style.bottom = 'auto';
        break;
      case 'center':
        // Center the widget
        iframe.style.top = '50%';
        iframe.style.left = '50%';
        iframe.style.transform = 'translate(-50%, -50%)';
        iframe.style.right = 'auto';
        iframe.style.bottom = 'auto';
        break;
      case 'fullscreen':
        // Take up entire viewport
        width = viewportWidth;
        height = viewportHeight;
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        margin = 0; // No margin in fullscreen
        break;
      case 'bottom-right':
      default:
        bottom = margin + 'px';
        right = margin + 'px';
        iframe.style.bottom = bottom;
        iframe.style.right = right;
        iframe.style.left = 'auto';
        iframe.style.top = 'auto';
        break;
    }
    
    // Apply dimensions
    iframe.style.width = width + 'px';
    iframe.style.height = height + 'px';
    
    // Apply border radius based on position and size
    if (position === 'fullscreen' || (viewportWidth < 450 && config.position !== 'center')) {
      iframe.style.borderRadius = '0';
    } else {
      iframe.style.borderRadius = '12px';
    }
  }
  
  // Initial dimension calculation
  calculateDimensions();
  
  // Pass configuration to iframe
  iframe.onload = function() {
    // Merge token with any user-provided config
    const config = {
      ...(window.agentHubConfig || {}),
      token: token, // Token from our config takes precedence
      defaultOpen: true // Force the widget to be open by default
    };
    
    // Send the configuration to the iframe
    iframe.contentWindow.postMessage({
      type: 'AGENTHUB_CONFIG',
      config: config
    }, '*');
  };
  
  // Add iframe to page
  document.body.appendChild(iframe);
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(calculateDimensions, 250);
  });
  
  // Listen for messages from the iframe (if needed for future features)
  window.addEventListener('message', function(event) {
    // Only handle messages from our iframe
    if (event.source !== iframe.contentWindow) return;
    
    if (event.data.type === 'AGENTHUB_RESIZE') {
      // Handle custom resize requests from the chatbot
      if (event.data.width) {
        iframe.style.width = event.data.width + 'px';
      }
      if (event.data.height) {
        iframe.style.height = event.data.height + 'px';
      }
    }
  });
  
  // Expose API for programmatic control
  window.agentHub = window.agentHub || {};
  window.agentHub.resize = calculateDimensions;
  window.agentHub.setPosition = function(position) {
    window.agentHubConfig = window.agentHubConfig || {};
    window.agentHubConfig.position = position;
    calculateDimensions();
  };
  window.agentHub.setDimensions = function(width, height) {
    if (width) iframe.style.width = width + 'px';
    if (height) iframe.style.height = height + 'px';
  };
})();