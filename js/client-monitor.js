// ===============================================
// CLIENT MONITOR MODULE
// ===============================================
const ClientMonitor = (() => {
  let clientWindow = null;
  const channel = new BroadcastChannel('shapeup_client_display');

  function openMonitor() {
    // Open client-display.html in a new window (move to second monitor)
    if (clientWindow && !clientWindow.closed) {
      clientWindow.focus();
      return;
    }
    clientWindow = window.open(
      'client-display.html',
      'ShapeUpClientDisplay',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    // Update button
    const btn = document.getElementById('clientDisplayBtn');
    if (btn) {
      btn.textContent = '🖥️ Display Open';
      btn.classList.add('opacity-75');
    }
  }

  function closeMonitor() {
    if (clientWindow && !clientWindow.closed) {
      clientWindow.close();
    }
    clientWindow = null;
    const btn = document.getElementById('clientDisplayBtn');
    if (btn) {
      btn.textContent = '🖥️ Client Display';
      btn.classList.remove('opacity-75');
    }
  }

  function showIdle() {
    channel.postMessage({ type: 'show_idle' });
  }

  function showMemberCard(member, action) {
    // If window not open yet, open it first
    if (!clientWindow || clientWindow.closed) {
      openMonitor();
      // Small delay to let window load before sending message
      setTimeout(() => {
        channel.postMessage({ type: 'show_member', member, action });
      }, 1200);
    } else {
      channel.postMessage({ type: 'show_member', member, action });
    }
  }

  // Detect if window was closed externally
  setInterval(() => {
    if (clientWindow && clientWindow.closed) {
      clientWindow = null;
      const btn = document.getElementById('clientDisplayBtn');
      if (btn) {
        btn.textContent = '🖥️ Client Display';
        btn.classList.remove('opacity-75');
      }
    }
  }, 1000);

  return { openMonitor, closeMonitor, showIdle, showMemberCard };
})();


