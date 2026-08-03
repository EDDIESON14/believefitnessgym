// DASHBOARD MODULE
// ===============================================
const DashboardModule = (() => {
  function updateStats() {
    const allMembers = StorageModule.getAllMembers();
    const activeMembers = MembersModule.getActiveMembers();
    const todayCheckins = StorageModule.getTodayAttendance();
    const now = new Date();
    const monthlyRevenue = StorageModule.getAllPayments().filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('totalMembers').textContent = allMembers.length;
    document.getElementById('activeMembers').textContent = activeMembers.length;
    document.getElementById('monthlyRevenue').textContent = `₱${monthlyRevenue.toLocaleString()}`;
    document.getElementById('todayCheckins').textContent = todayCheckins.length;
  }

  function updateRecentActivities() {
    const container = document.getElementById('recentActivities');
    const recentData = [
      ...StorageModule.getAllMembers().map(m => ({ ...m, sortTime: m.startDate, type: 'member' })),
      ...StorageModule.getAllAttendance().map(a => ({ ...a, sortTime: a.checkInTime, type: 'attendance' })),
      ...StorageModule.getAllPayments().map(p => ({ ...p, sortTime: p.date, type: 'payment' }))
    ].sort((a,b) => b.sortTime.localeCompare(a.sortTime)).slice(0,5);

    if (recentData.length === 0) { container.innerHTML = '<p class="text-gray-500 text-sm">No recent activities</p>'; return; }
    container.innerHTML = recentData.map(item => {
      let activity = '', icon = '';
      if (item.type === 'member') { activity = `New member: ${item.name}`; icon = '👤'; }
      else if (item.type === 'attendance') { activity = `Check-in: ${item.memberName}`; icon = '✓'; }
      else if (item.type === 'payment') { activity = `Payment: ${item.memberName} - ₱${item.amount}`; icon = '💰'; }
      return `<div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"><div class="text-2xl">${icon}</div><div class="flex-1"><p class="text-sm font-medium text-gray-800">${activity}</p></div></div>`;
    }).join('');
  }

  function updateAlerts() {
    const container = document.getElementById('alertsList');
    const expiringSoon = MembersModule.getExpiringSoonMembers();
    if (expiringSoon.length === 0) { container.innerHTML = '<p class="text-gray-500 text-sm">No alerts</p>'; return; }
    container.innerHTML = expiringSoon.map(member => {
      const daysLeft = Math.ceil((new Date(member.expiryDate) - new Date()) / (1000*60*60*24));
      const isUrgent = daysLeft <= 1;
      return `<div class="flex items-center space-x-3 p-3 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'} rounded-lg"><div class="text-2xl">${isUrgent ? '🔴' : '⚠️'}</div><div class="flex-1"><p class="text-sm font-medium text-gray-800">${member.name} - expires ${isUrgent ? 'SOON' : 'in ' + daysLeft + ' days'}</p><p class="text-xs text-gray-600">Expiry: ${member.expiryDate}</p></div></div>`;
    }).join('');
  }

  function updateDashboard() {
    updateStats(); updateRecentActivities(); updateAlerts();
    MembersModule.renderMembersList();
    AttendanceModule.renderAttendanceRecords();
    AttendanceModule.updateCheckInMemberSelect();
    AttendanceModule.renderMemberStatusTable();
    OverviewModule.updateOverviewTab();
    NotifModule.refresh();
  }

  return { updateDashboard };
})();


