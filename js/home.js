// HOME MODULE
// ===============================================
const HomeModule = (() => {

  function updateHome() {
    updateWelcomeBanner();
    updateGymStatus();
    updateExpiringSoon();
    updateNewestMember();
  }

  // ── Welcome Banner ────────────────────────────
  function updateWelcomeBanner() {
    const user = AuthModule.getCurrentUser();
    const welcomeEl = document.getElementById('homeWelcome');
    const dateEl    = document.getElementById('homeDateDisplay');

    if (welcomeEl && user) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? ' Good morning' : hour < 18 ? ' Good afternoon' : ' Good evening';
      welcomeEl.textContent = `${greeting}, ${user.fullName}!`;
    }
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }

  // ── Gym Open/Closed + Live Status ─────────────
  function updateGymStatus() {
    const settings   = SettingsModule.getSettings();
    const now        = new Date();
    const day        = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // Check operating hours
    let isOpen = false;
    let hoursText = '';
    if (settings && settings.operatingHours && settings.operatingHours[day]) {
      const hours = settings.operatingHours[day];
      if (hours.open && hours.close && hours.isOpen !== false) {
        const [oh, om] = hours.open.split(':').map(Number);
        const [ch, cm] = hours.close.split(':').map(Number);
        const openMin  = oh * 60 + om;
        const closeMin = ch * 60 + cm;
        isOpen    = currentMin >= openMin && currentMin < closeMin;
        hoursText = `Hours: ${hours.open} – ${hours.close}`;
      } else {
        hoursText = 'Closed today';
      }
    } else {
      isOpen    = true;
      hoursText = 'Operating hours not set';
    }

    // Status badge in banner
    const statusEl = document.getElementById('homeGymStatus');
    const hoursEl  = document.getElementById('homeGymHours');
    if (statusEl) {
      statusEl.textContent = isOpen ? '🟢 OPEN' : '🔴 CLOSED';
      statusEl.className = `inline-flex items-center gap-2 rounded-full px-4 py-2 font-bold text-sm ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;
    }
    if (hoursEl) hoursEl.textContent = hoursText;

    // Live visitors
    const active  = StorageModule.getTodayAttendance().filter(a => !a.checkOutTime).length;
    const cap     = Config.MAX_GYM_CAPACITY;
    const pct     = Math.round((active / cap) * 100);

    setEl('homeLiveVisitors', active);
    setEl('homeCapacityCount', `${active} / ${cap}`);

    const bar = document.getElementById('homeCapacityBar');
    if (bar) {
      bar.style.width = `${Math.min(pct, 100)}%`;
      bar.className = `h-3 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-emerald-500'}`;
    }

    const statusBg = document.getElementById('homeStatusBg');
    if (statusBg) statusBg.className = `flex items-center justify-between p-4 rounded-xl ${isOpen ? 'bg-green-50' : 'bg-gray-100'}`;

    const badge = document.getElementById('homeOpenBadge');
    if (badge) {
      badge.textContent = isOpen ? '🟢 OPEN' : '🔴 CLOSED';
      badge.className   = `text-sm font-bold px-3 py-1 rounded-full ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`;
    }

    let status = '🟢 Available';
    if (pct >= 100)     status = '🔴 FULL';
    else if (pct >= 80) status = '🟠 Almost Full';
    else if (pct >= 50) status = '🟡 Moderate';
    setEl('homeCapacityStatus', status);
  }

  // ── Expiring Soon ─────────────────────────────
  function updateExpiringSoon() {
    const container = document.getElementById('homeExpiringSoon');
    if (!container) return;
    const today   = new Date(); today.setHours(0,0,0,0);
    const members = StorageModule.getAllMembers();
    const expiring = members
      .filter(m => m.expiryDate)
      .map(m => ({ ...m, daysLeft: Math.ceil((new Date(m.expiryDate) - today) / (1000*60*60*24)) }))
      .filter(m => m.daysLeft <= 7 && m.daysLeft >= -3)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    if (expiring.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">No members expiring within 7 days</p>';
      return;
    }
    container.innerHTML = expiring.map(m => {
      let bgColor = 'bg-gray-50 border-gray-200';
      let badge   = `<span class="text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full">${m.daysLeft}d left</span>`;
      if (m.daysLeft <= 0) {
        bgColor = 'bg-red-50 border-red-200';
        badge   = `<span class="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">${m.daysLeft === 0 ? 'Today!' : Math.abs(m.daysLeft) + 'd ago'}</span>`;
      } else if (m.daysLeft <= 3) {
        bgColor = 'bg-orange-50 border-orange-200';
        badge   = `<span class="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">${m.daysLeft}d left ⚠️</span>`;
      }
      return `<div class="flex items-center justify-between p-3 rounded-lg border ${bgColor}">
        <div>
          <p class="text-sm font-semibold text-gray-800">👤 ${m.name}</p>
          <p class="text-xs text-gray-600">${m.membershipType}</p>
        </div>
        ${badge}
      </div>`;
    }).join('');
  }

  // ── Newest Member ─────────────────────────────
  function updateNewestMember() {
    const container = document.getElementById('homeNewestMember');
    if (!container) return;
    const members = StorageModule.getAllMembers();
    if (members.length === 0) {
      container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">No members yet</p>';
      return;
    }
    const newest = members.slice().sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))[0];
    const joinDate = new Date(newest.createdAt || newest.startDate).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    const today    = new Date(); today.setHours(0,0,0,0);
    const daysLeft = newest.expiryDate ? Math.ceil((new Date(newest.expiryDate) - today) / (1000*60*60*24)) : null;
    const expiryColor = daysLeft !== null ? (daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-500' : 'text-green-600') : 'text-gray-600';

    // Profile photo or avatar
    const photoHtml = newest.profilePhoto
      ? `<img src="${newest.profilePhoto}" class="w-16 h-16 rounded-full object-cover border-4 border-emerald-500">`
      : `<div class="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-2xl font-bold text-black">${newest.name.charAt(0).toUpperCase()}</div>`;

    container.innerHTML = `
      <div class="flex flex-col items-center text-center gap-3">
        ${photoHtml}
        <div>
          <p class="text-xl font-bold text-gray-800">${newest.name}</p>
          <p class="text-sm text-gray-600">${newest.membershipType}</p>
          <p class="text-xs text-gray-400 mt-1">Joined: ${joinDate}</p>
          ${daysLeft !== null ? `<p class="text-sm font-semibold mt-2 ${expiryColor}">${daysLeft > 0 ? daysLeft + ' days remaining' : daysLeft === 0 ? 'Expires today!' : 'Expired'}</p>` : ''}
        </div>
        <span class="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">🆕 Latest Member</span>
      </div>`;
  }

  // ── Helper ────────────────────────────────────
  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  return { updateHome };
})();

// ===============================================
