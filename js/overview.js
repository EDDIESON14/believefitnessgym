// OVERVIEW MODULE
// ===============================================
const OverviewModule = (() => {
  function updateLiveVisitors() {
    const todayAttendance = StorageModule.getTodayAttendance();
    const activeVisitors = todayAttendance.filter(a => !a.checkOutTime).length;
    document.getElementById('liveVisitors').textContent = activeVisitors;
    const percentage = Math.round((activeVisitors / Config.MAX_GYM_CAPACITY) * 100);
    document.getElementById('capacityPercentage').textContent = `${percentage}%`;
    document.getElementById('capacityBar').style.width = `${percentage}%`;
    document.getElementById('capacityCount').textContent = `${activeVisitors} / ${Config.MAX_GYM_CAPACITY}`;
    let status = 'Available';
    if (percentage >= 100) status = '🔴 FULL';
    else if (percentage >= 80) status = '⚠️ Almost Full';
    else if (percentage >= 50) status = 'Moderate';
    document.getElementById('capacityStatus').textContent = status;
  }

  // ── Expiry Calendar ──────────────────────────
  let calendarYear  = new Date().getFullYear();
  let calendarMonth = new Date().getMonth();

  function prevMonth() {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    renderExpiryCalendar();
  }

  function nextMonth() {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    renderExpiryCalendar();
  }

  function renderExpiryCalendar() {
    const container  = document.getElementById('expiryCalendar');
    const labelEl    = document.getElementById('calendarMonthLabel');
    if (!container || !labelEl) return;

    const today      = new Date();
    today.setHours(0,0,0,0);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    labelEl.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

    // Build expiry map: { 'YYYY-MM-DD': [member, ...] }
    const members   = StorageModule.getAllMembers();
    const expiryMap = {};
    members.forEach(m => {
      if (!m.expiryDate) return;
      const key = m.expiryDate.substring(0,10);
      if (!expiryMap[key]) expiryMap[key] = [];
      expiryMap[key].push(m);
    });

    const firstDay  = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const dayNames  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let html = '<div class="grid grid-cols-7 gap-1">';
    // Day headers
    dayNames.forEach(d => {
      html += `<div class="text-center text-xs font-bold text-[#C0C0C0] pb-1 border-b border-gray-200">${d}</div>`;
    });
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="min-h-[56px]"></div>';
    }
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr   = `${calendarYear}-${String(calendarMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const cellDate  = new Date(calendarYear, calendarMonth, day);
      cellDate.setHours(0,0,0,0);
      const expiring  = expiryMap[dateStr] || [];
      const count     = expiring.length;
      const isToday   = cellDate.getTime() === today.getTime();
      const isPast    = cellDate < today;
      const diffDays  = Math.ceil((cellDate - today) / (1000*60*60*24));

      let cellBg    = 'bg-white border border-gray-200 hover:bg-gray-50';
      let dotColor  = '';
      let countBadge = '';
      let numColor  = isPast ? 'text-[#C0C0C0]' : 'text-gray-700';

      if (count > 0) {
        if (diffDays <= 0)       { cellBg = 'bg-red-50 border-red-300 hover:bg-red-100';       dotColor = 'bg-red-500';    countBadge = `<span class="text-xs font-bold text-red-600 leading-none">${count} exp</span>`; }
        else if (diffDays <= 3)  { cellBg = 'bg-red-50 border-red-200 hover:bg-red-100';       dotColor = 'bg-red-400';    countBadge = `<span class="text-xs font-bold text-red-500 leading-none">${count}⚠️</span>`; }
        else if (diffDays <= 7)  { cellBg = 'bg-orange-50 border-orange-200 hover:bg-orange-100'; dotColor = 'bg-orange-400'; countBadge = `<span class="text-xs font-bold text-orange-500 leading-none">${count}🔔</span>`; }
        else if (diffDays <= 14) { cellBg = 'bg-gray-50 border-gray-200 hover:bg-gray-900'; dotColor = 'bg-[#00BFFF]'; countBadge = `<span class="text-xs font-bold text-[#00BFFF] leading-none">${count}</span>`; }
        else                     { cellBg = 'bg-green-50 border-green-200 hover:bg-green-100';   dotColor = 'bg-green-400';  countBadge = `<span class="text-xs font-bold text-green-600 leading-none">${count}</span>`; }
      }

      const todayStyle = isToday ? 'ring-2 ring-[#00BFFF] ring-offset-1' : '';
      const numStyle   = isToday
        ? 'w-7 h-7 flex items-center justify-center rounded-full bg-[#00BFFF] text-black text-sm font-bold'
        : `text-sm font-bold ${numColor}`;
      const clickable  = count > 0
        ? `onclick="OverviewModule.showExpiryPopup('${dateStr}', ${JSON.stringify(expiring.map(m=>m.name)).replace(/"/g,'&quot;')})" style="cursor:pointer"`
        : '';

      html += `<div class="rounded-lg min-h-[56px] flex flex-col items-center justify-between p-1.5 ${cellBg} ${todayStyle} transition-all" ${clickable}>
        <span class="${numStyle}">${day}</span>
        <div class="flex flex-col items-center gap-0.5 w-full">
          ${dotColor ? `<span class="w-1.5 h-1.5 rounded-full ${dotColor} mx-auto"></span>` : ''}
          ${countBadge}
        </div>
      </div>`;
    }
    html += '</div>';

    // Legend
    html += `<div class="flex flex-wrap gap-2 mt-3 text-xs text-[#C0C0C0]">
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-200 inline-block"></span> Expired/Today</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-orange-200 inline-block"></span> ≤3 days</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-yellow-200 inline-block"></span> ≤14 days</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-green-200 inline-block"></span> Future</span>
    </div>`;

    container.innerHTML = html;

    // Hide popup when re-rendering
    const popup = document.getElementById('expiryPopup');
    if (popup) popup.classList.add('hidden');
  }

  function showExpiryPopup(dateStr, names) {
    const popup    = document.getElementById('expiryPopup');
    const title    = document.getElementById('expiryPopupTitle');
    const list     = document.getElementById('expiryPopupList');
    if (!popup) return;
    const d = new Date(dateStr + 'T00:00:00');
    title.textContent = `📋 Expiring on ${d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} (${names.length} member${names.length > 1 ? 's' : ''})`;
    list.innerHTML = names.map(name => `<p class="text-sm text-gray-700 flex items-center gap-2"><span class="text-[#00BFFF]">👤</span>${name}</p>`).join('');
    popup.classList.remove('hidden');
  }


  function loadPhotos() { const s = localStorage.getItem(Config.PHOTOS_KEY); return s ? JSON.parse(s) : []; }
  function savePhotos(p) { localStorage.setItem(Config.PHOTOS_KEY, JSON.stringify(p)); }

  function renderPhotoWall() {
    const photos = loadPhotos();
    const container = document.getElementById('photoWall');
    if (photos.length === 0) { container.innerHTML = '<p class="text-[#C0C0C0] text-sm col-span-full text-center py-8">No transformation photos yet.</p>'; return; }
    container.innerHTML = photos.map(photo => `<div class="photo-item bg-gray-100" onclick="OverviewModule.deletePhoto('${photo.id}')"><img src="${photo.imageUrl}" alt="${photo.memberName}" loading="lazy" onerror="this.style.display='none'"><div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3"><p class="text-white text-xs font-bold">${photo.memberName}</p><p class="text-white text-xs">${photo.caption}</p></div></div>`).join('');
  }

  function openPhotoUpload() { document.getElementById('photoUploadModal').classList.add('active'); }
  function closePhotoUpload() { document.getElementById('photoUploadModal').classList.remove('active'); document.getElementById('photoUploadForm').reset(); }

  function addPhoto(photoData) {
    const photos = loadPhotos();
    photos.push({ id: Date.now().toString(), ...photoData, createdAt: new Date().toISOString() });
    savePhotos(photos);
    renderPhotoWall();
  }

  function deletePhoto(photoId) {
    if (!confirm('Delete this photo?')) return;
    savePhotos(loadPhotos().filter(p => p.id !== photoId));
    renderPhotoWall();
    UIModule.showToast('Photo deleted!', 'success');
  }

  function loadEvents() { const s = localStorage.getItem(Config.EVENTS_KEY); return s ? JSON.parse(s) : []; }
  function saveEvents(e) { localStorage.setItem(Config.EVENTS_KEY, JSON.stringify(e)); }

  function renderUpcomingEvents() {
    const events = loadEvents().sort((a,b) => a.date.localeCompare(b.date));
    const container = document.getElementById('upcomingEvents');
    if (events.length === 0) { container.innerHTML = '<p class="text-[#C0C0C0] text-xs text-center py-4">No upcoming events</p>'; return; }
    container.innerHTML = events.slice(0,5).map(event => `<div class="p-3 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200"><div class="flex justify-between items-start mb-1"><h4 class="font-bold text-sm text-gray-800">${event.title}</h4><button onclick="OverviewModule.deleteEvent('${event.id}')" class="text-red-500 text-xs hover:text-red-700">✕</button></div><p class="text-xs text-[#00BFFF] mb-1">📅 ${new Date(event.date).toLocaleDateString()}</p>${event.description ? `<p class="text-xs text-[#C0C0C0]">${event.description}</p>` : ''}</div>`).join('');
  }

  function openEventForm() { document.getElementById('eventFormModal').classList.add('active'); }
  function closeEventForm() { document.getElementById('eventFormModal').classList.remove('active'); document.getElementById('eventForm').reset(); }

  function addEvent(eventData) {
    const events = loadEvents();
    events.push({ id: Date.now().toString(), ...eventData, createdAt: new Date().toISOString() });
    saveEvents(events);
    renderUpcomingEvents();
  }

  function deleteEvent(eventId) {
    saveEvents(loadEvents().filter(e => e.id !== eventId));
    renderUpcomingEvents();
    UIModule.showToast('Event deleted!', 'success');
  }

  function updateOverviewTab() {
    updateLiveVisitors(); renderExpiryCalendar();
    renderUpcomingEvents();
  }

  return { updateOverviewTab, renderExpiryCalendar, prevMonth, nextMonth, showExpiryPopup, openEventForm, closeEventForm, addEvent, deleteEvent, renderUpcomingEvents };
})();


