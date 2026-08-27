// NOTIFICATION MODULE
// ===============================================
const NotifModule = (() => {
  let readIds = new Set();
  let isOpen = false;

  function getDaysUntilExpiry(expiryDate) {
    const now = new Date();
    now.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    exp.setHours(0,0,0,0);
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  }

  function getAlertMembers() {
    return StorageModule.getAllMembers()
      .map(m => ({ ...m, daysLeft: getDaysUntilExpiry(m.expiryDate) }))
      .filter(m => m.daysLeft <= 3)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  function updateBell() {
    const alerts = getAlertMembers();
    const unread = alerts.filter(m => !readIds.has(m.id));
    const badge = document.getElementById('notifBadge');
    const bellBtn = document.getElementById('notifBell');

    if (unread.length > 0) {
      badge.textContent = unread.length > 9 ? '9+' : unread.length;
      badge.classList.remove('hidden');
      bellBtn.classList.add('pulse-ring');
    } else {
      badge.classList.add('hidden');
      bellBtn.classList.remove('pulse-ring');
    }
  }

  function renderDropdown() {
    const alerts = getAlertMembers();
    const container = document.getElementById('notifList');
    const footer = document.getElementById('notifFooter');

    if (alerts.length === 0) {
      container.innerHTML = '<div class="px-4 py-8 text-center"><p class="text-4xl mb-2">🗸</p><p class="text-[#C0C0C0] text-sm">All memberships are OK</p></div>';
      footer.textContent = 'No expiring memberships';
      return;
    }

    footer.textContent = `${alerts.length} member${alerts.length > 1 ? 's' : ''} expiring soon`;

    container.innerHTML = alerts.map(m => {
      const isNew = !readIds.has(m.id);
      let colorClass, icon, urgencyText;

      if (m.daysLeft <= 0) {
        colorClass = 'notif-item-red';
        icon = '🔴';
        urgencyText = m.daysLeft === 0 ? 'Expires TODAY!' : `Expired ${Math.abs(m.daysLeft)} day${Math.abs(m.daysLeft) !== 1 ? 's' : ''} ago`;
      } else if (m.daysLeft === 1) {
        colorClass = 'notif-item-red';
        icon = '🔴';
        urgencyText = 'Expires TOMORROW!';
      } else {
        colorClass = 'notif-item-yellow';
        icon = '🟡';
        urgencyText = `Expires in ${m.daysLeft} days`;
      }

      return `
        <div class="px-4 py-3 ${colorClass} border-b border-gray-100 slide-in-left ${isNew ? 'font-semibold' : ''}">
          <div class="flex items-start space-x-3">
            <span class="text-lg flex-shrink-0 mt-0.5">${icon}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 font-bold truncate">${m.name}</p>
              <p class="text-xs text-[#00BFFF] mt-0.5">${m.membershipType}</p>
              <p class="text-xs font-bold mt-1 ${m.daysLeft <= 1 ? 'text-red-600' : 'text-amber-600'}">${urgencyText}</p>
            </div>
            ${isNew ? '<span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2"></span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function toggleDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    isOpen = !isOpen;
    if (isOpen) {
      renderDropdown();
      dropdown.classList.add('show');
    } else {
      dropdown.classList.remove('show');
    }
  }

  function markAllRead() {
    const alerts = getAlertMembers();
    alerts.forEach(m => readIds.add(m.id));
    updateBell();
    renderDropdown();
  }

  function refresh() {
    updateBell();
    if (isOpen) renderDropdown();
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    const container = document.getElementById('notifContainer');
    if (container && !container.contains(e.target) && isOpen) {
      isOpen = false;
      document.getElementById('notifDropdown').classList.remove('show');
    }
  });

  return { updateBell, renderDropdown, toggleDropdown, markAllRead, refresh, getDaysUntilExpiry, getAlertMembers };
})();


