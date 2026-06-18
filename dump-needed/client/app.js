// app.js
import Modal from './design-system/components/modal/modal.js';

let websocket = null;
let helpModal = null;
let helpModalInitialized = false;

function closeUnexpectedOpenModals() {
  const overlays = document.querySelectorAll('.modal-overlay.open');
  if (overlays.length === 0) {
    return;
  }
  overlays.forEach((overlay) => {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  });
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  console.warn('[help-modal] Closed unexpected open modal overlay on startup');
}

// Initialize WebSocket connection
function initializeWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/ws`;

  try {
    websocket = new WebSocket(wsUrl);

    websocket.onopen = function(event) {
      console.log('WebSocket connected');
    };

    websocket.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' && data.message) {
          alert(data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = function(event) {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        initializeWebSocket();
      }, 3000);
    };

    websocket.onerror = function(error) {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
  }
}

async function loadHelpContentNode() {
  try {
    const response = await fetch('./help-content.html');
    if (!response.ok) {
      throw new Error(`Failed to load help content (${response.status})`);
    }
    const helpContent = await response.text();
    const template = document.createElement('template');
    template.innerHTML = helpContent;
    return template.content.cloneNode(true);
  } catch (error) {
    console.error('Failed to load help content:', error);
    const fallback = document.createElement('div');
    fallback.innerHTML = '<p>Help content could not be loaded. Please check that help-content.html exists.</p>';
    return fallback;
  }
}

// Load help content and initialize modal
async function initializeHelpModal() {
  if (helpModalInitialized) {
    closeUnexpectedOpenModals();
    return;
  }
  helpModalInitialized = true;
  try {
    const contentNode = await loadHelpContentNode();
    helpModal = Modal.createHelpModal({
      title: 'Help / User Guide',
      content: contentNode
    });

    const helpButton = document.getElementById('btn-help');
    if (helpButton) {
      helpButton.onclick = () => {
        if (!helpModal) {
          return;
        }
        helpModal.open();
      };
    }
  } catch (error) {
    console.error('Failed to initialize help modal:', error);
  } finally {
    if (helpModal && helpModal.isOpen) {
      helpModal.close();
    }
    closeUnexpectedOpenModals();
  }
}

// Initialize both help modal and WebSocket when DOM is ready
async function initialize() {
  await initializeHelpModal();
  initializeWebSocket();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
