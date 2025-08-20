(function(window, document) {
  'use strict';

  // Create namespace
  window.AgentHubChat = window.AgentHubChat || {};

  // Configuration defaults
  const defaults = {
    workflowId: null,
    position: 'bottom-right',
    primaryColor: '#6366f1',
    title: 'AgentHub Assistant',
    placeholder: 'Type your message...',
    welcomeMessage: 'Hello! How can I help you today?',
    apiKey: null,
    baseUrl: window.location.origin
  };

  // Initialize the chatbot
  window.AgentHubChat.init = function(config) {
    const settings = Object.assign({}, defaults, config);
    
    // Store callbacks separately (they can't be sent via postMessage)
    const callbacks = {
      onWorkflowStart: config.onWorkflowStart || null,
      onWorkflowComplete: config.onWorkflowComplete || null
    };
    
    // Create iframe container
    const container = document.createElement('div');
    container.id = 'agenthub-chat-container';
    container.style.cssText = `
      position: fixed;
      z-index: 999999;
      ${settings.position === 'bottom-right' ? 'right: 20px; bottom: 20px;' : 'left: 20px; bottom: 20px;'}
      width: 420px;
      height: 680px;
      pointer-events: none;
    `;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'agenthub-chat-iframe';
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: transparent;
      pointer-events: auto;
      color-scheme: normal;
    `;
    iframe.setAttribute('allowtransparency', 'true');

    // Build iframe URL with parameters
    const params = new URLSearchParams({
      embedded: 'true',
      position: settings.position,
      color: settings.primaryColor,
      title: settings.title,
      welcome: settings.welcomeMessage
    });
    
    // Add either workflowId or workflowAlias
    if (settings.workflowAlias) {
      params.append('workflowAlias', settings.workflowAlias);
    } else if (settings.workflowId) {
      params.append('workflowId', settings.workflowId);
    }

    iframe.src = `${settings.baseUrl}/chatbot?${params.toString()}`;

    // Add iframe to container and container to body
    container.appendChild(iframe);
    document.body.appendChild(container);

    // Handle messages from iframe
    window.addEventListener('message', function(event) {
      if (event.origin !== settings.baseUrl) return;
      
      const { type, data } = event.data;
      
      switch(type) {
        case 'resize':
          // Handle resize events if needed
          break;
        case 'minimize':
          // Handle minimize events - shrink container to just header
          container.style.height = '60px';
          iframe.style.height = '60px';
          break;
        case 'maximize':
          // Restore full size
          container.style.height = '680px';
          iframe.style.height = '100%';
          break;
        case 'close':
          container.style.display = 'none';
          break;
        case 'workflow-started':
          // Handle workflow started event
          if (callbacks.onWorkflowStart) {
            callbacks.onWorkflowStart(data);
          }
          break;
        case 'workflow-completed':
          // Handle workflow completed event
          if (callbacks.onWorkflowComplete) {
            callbacks.onWorkflowComplete(data);
          }
          break;
      }
    });

    // Send configuration to iframe once loaded
    iframe.onload = function() {
      // Only send serializable data, not functions
      const serializableConfig = {
        workflowId: settings.workflowId,
        workflowAlias: settings.workflowAlias,
        position: settings.position,
        primaryColor: settings.primaryColor,
        title: settings.title,
        placeholder: settings.placeholder,
        welcomeMessage: settings.welcomeMessage,
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        autoDetectWorkflow: settings.autoDetectWorkflow
      };
      
      iframe.contentWindow.postMessage({
        type: 'configure',
        config: serializableConfig
      }, settings.baseUrl);
    };

    return {
      show: function() {
        container.style.display = 'block';
      },
      hide: function() {
        container.style.display = 'none';
      },
      minimize: function() {
        iframe.contentWindow.postMessage({ type: 'minimize' }, settings.baseUrl);
      },
      maximize: function() {
        iframe.contentWindow.postMessage({ type: 'maximize' }, settings.baseUrl);
      },
      sendMessage: function(message) {
        iframe.contentWindow.postMessage({
          type: 'send-message',
          message: message
        }, settings.baseUrl);
      }
    };
  };

  // Auto-initialize if data attributes are present
  document.addEventListener('DOMContentLoaded', function() {
    const script = document.querySelector('script[data-agenthub-chat]');
    if (script) {
      const config = {};
      
      // Read data attributes
      if (script.dataset.workflowId) config.workflowId = script.dataset.workflowId;
      if (script.dataset.position) config.position = script.dataset.position;
      if (script.dataset.color) config.primaryColor = script.dataset.color;
      if (script.dataset.title) config.title = script.dataset.title;
      if (script.dataset.welcome) config.welcomeMessage = script.dataset.welcome;
      if (script.dataset.apiKey) config.apiKey = script.dataset.apiKey;
      
      window.AgentHubChat.init(config);
    }
  });

})(window, document);