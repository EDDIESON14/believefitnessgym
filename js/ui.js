// UI MODULE
// ===============================================
const UIModule = (() => {
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => { // tab switching
    tab.classList.remove('bg-gray-400','text-black'); tab.classList.add('text-gray-700','hover:bg-gray-=600'); });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) { activeTab.classList.remove('text-gray-700','hover:bg-gray-900'); activeTab.classList.add('bg-gray-400','text-black'); }
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const selected = document.getElementById(`${tabName}Tab`);
    if (selected) selected.classList.add('active');

    if (tabName === 'attendance') { AttendanceModule.updateCheckInMemberSelect(); AttendanceModule.renderMemberStatusTable(); setTimeout(() => document.getElementById('scannerInput')?.focus(), 100); }
    else if (tabName === 'reports') ReportsModule.updateReports();
    else if (tabName === 'accounts') AccountsModule.renderAccountsList();
    else if (tabName === 'settings') { SettingsModule.loadPricingForm(); SettingsModule.loadOperatingHoursForm(); EmailModule.loadEmailConfigForm(); }
    else if (tabName === 'overview') OverviewModule.updateOverviewTab();
    else if (tabName === 'home') HomeModule.updateHome();
  }

  function updateUIForRole() {
    const currentUser = AuthModule.getCurrentUser();
    if (!currentUser) return;
    document.getElementById('userRoleDisplay').textContent = `Logged in as: ${currentUser.fullName} (${currentUser.role})`;
    const showAdmin = AuthModule.isAdmin();
    document.getElementById('accountsTabBtn').classList.toggle('hidden', !showAdmin);
    document.getElementById('settingsTabBtn').classList.toggle('hidden', !showAdmin);
  }

  return { showToast, switchTab, updateUIForRole };
})();

// ===============================================
