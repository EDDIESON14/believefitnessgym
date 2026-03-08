// APP INIT
// ===============================================
const App = (() => {
  function init() {
    StorageModule.loadData();
    AccountsModule.loadAccounts();
    SettingsModule.loadSettings();
    EmailModule.loadEmailConfig();
    setupEventListeners();
    setInitialDate();
    // Restore login session after page refresh
    if (AuthModule.restoreSession()) {
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      UIModule.updateUIForRole();
      DashboardModule.updateDashboard();
      NotifModule.updateBell();
      UIModule.switchTab('home');
    }
  }

  function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
    document.querySelectorAll('.nav-tab').forEach(tab => tab.addEventListener('click', () => UIModule.switchTab(tab.dataset.tab)));
    document.getElementById('addMemberForm').addEventListener('submit', handleAddMember);
    document.getElementById('checkInForm').addEventListener('submit', handleCheckIn);
    document.getElementById('closeQrModal').addEventListener('click', QRModule.closeQrModal);
    document.getElementById('downloadBarcode').addEventListener('click', QRModule.downloadBarcode);
    document.getElementById('printBarcode').addEventListener('click', QRModule.printBarcode);
    document.getElementById('show1DBarcode').addEventListener('click', QRModule.show1D);
    document.getElementById('show2DBarcode').addEventListener('click', QRModule.show2D);
    document.getElementById('createAccountForm').addEventListener('submit', handleCreateAccount);
    document.getElementById('confirmDelete').addEventListener('click', AccountsModule.executeDelete);
    document.getElementById('cancelDelete').addEventListener('click', AccountsModule.cancelDelete);
    document.getElementById('confirmDeleteMember').addEventListener('click', MembersModule.executeDeleteMember);
    document.getElementById('cancelDeleteMember').addEventListener('click', MembersModule.cancelDeleteMember);
    document.getElementById('eventForm').addEventListener('submit', handleEventSubmit);
    document.getElementById('emailConfigForm').addEventListener('submit', handleEmailConfigUpdate);
    document.getElementById('pricingForm').addEventListener('submit', handlePricingUpdate);
    document.getElementById('operatingHoursForm').addEventListener('submit', handleOperatingHoursUpdate);
    AttendanceModule.initScanner();
  }

  function setInitialDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('eventDate').value = today;
  }

  // Track failed login attempts per username
  const failedAttempts = {};
  const MAX_ATTEMPTS = 5;

  function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const warningEl = document.getElementById('loginWarning');

    const result = AuthModule.login(username, password);

    if (result.success) {
      // Reset attempts on successful login
      delete failedAttempts[username];
      warningEl.classList.add('hidden');
      document.getElementById('loginPage').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      UIModule.updateUIForRole();
      DashboardModule.updateDashboard();
      NotifModule.updateBell();
      UIModule.switchTab('home');
      UIModule.showToast(result.message, 'success');
    } else {
      // Track failed attempt
      if (!failedAttempts[username]) failedAttempts[username] = 0;
      failedAttempts[username]++;
      const attempts = failedAttempts[username];
      const remaining = MAX_ATTEMPTS - attempts;

      warningEl.classList.remove('hidden', 'bg-yellow-50', 'border-yellow-400', 'text-yellow-800',
                                             'bg-orange-50', 'border-orange-400', 'text-orange-800',
                                             'bg-red-50',    'border-red-500',    'text-red-800');

      if (attempts >= MAX_ATTEMPTS) {
        // 5th+ attempt — contact admin
        warningEl.classList.add('bg-red-50', 'border-red-500', 'text-red-800');
        warningEl.innerHTML = `
          <div class="flex items-start gap-2">
            <span class="text-xl">🚫</span>
            <div>
              <p class="font-bold">Too many failed attempts!</p>
              <p class="text-sm mt-1">Please contact your <strong>admin</strong> to verify your password or reset it in the Staff Account Management.</p>
            </div>
          </div>`;
      } else if (attempts >= 3) {
        // 3rd-4th attempt — orange, urgent
        warningEl.classList.add('bg-orange-50', 'border-orange-400', 'text-orange-800');
        warningEl.innerHTML = `
          <div class="flex items-start gap-2">
            <span class="text-xl">⚠️</span>
            <div>
              <p class="font-bold">Incorrect username or password</p>
              <p class="text-sm mt-1">Only <strong>${remaining} attempt${remaining !== 1 ? 's' : ''} remaining</strong>. Please double-check your credentials or use Forgot Password.</p>
            </div>
          </div>`;
      } else {
        // 1st-2nd attempt — yellow, mild
        warningEl.classList.add('bg-yellow-50', 'border-yellow-400', 'text-yellow-800');
        warningEl.innerHTML = `
          <div class="flex items-start gap-2">
            <span class="text-xl">⚠️</span>
            <div>
              <p class="font-bold">Incorrect username or password</p>
              <p class="text-sm mt-1">${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before you are advised to contact admin.</p>
            </div>
          </div>`;
      }
    }
  }

  function handleLogout() {
    AuthModule.logout();
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    ClientMonitor.closeMonitor();
    UIModule.showToast('Logged out successfully', 'success');
  }

  async function handleAddMember(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('addMemberBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding Member...';
    const result = await MembersModule.addMember({
      name: document.getElementById('memberName').value,
      email: document.getElementById('memberEmail').value,
      membershipType: document.getElementById('membershipType').value,
      startDate: document.getElementById('startDate').value,
      paymentMethod: document.getElementById('paymentMethod').value,
      profilePhoto: MembersModule.getPhotoDataUrl()
    });
    if (result.success) {
      DashboardModule.updateDashboard();
      UIModule.showToast(result.message, 'success');
      document.getElementById('addMemberForm').reset();
      MembersModule.clearPhoto();
      setInitialDate();
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Member & Send QR Code';
  }

  function handleCheckIn(e) {
    e.preventDefault();
    const memberId = document.getElementById('checkInMember').value;
    if (!memberId) { UIModule.showToast('Please select a member', 'error'); return; }
    // Get full member data including profilePhoto
    const fullMember = StorageModule.getMemberById(memberId);
    const result = AttendanceModule.checkInOut(memberId);
    if (result.success) {
      // Show profile photo on Last Scanned box
      if (fullMember) AttendanceModule.updateMemberProfile(fullMember, result.action);
      // Show on client display window
      if (fullMember) ClientMonitor.showMemberCard(fullMember, result.action);
      DashboardModule.updateDashboard();
      UIModule.showToast(result.message, 'success');
      document.getElementById('checkInForm').reset();
    } else UIModule.showToast(result.message, 'error');
  }

  function handleCreateAccount(e) {
    e.preventDefault();
    const result = AccountsModule.createAccount({ username: document.getElementById('newUsername').value, password: document.getElementById('newPassword').value, fullName: document.getElementById('newFullName').value, role: document.getElementById('newRole').value, email: document.getElementById('newEmail').value.trim() });
    if (result.success) { UIModule.showToast(result.message, 'success'); AccountsModule.renderAccountsList(); document.getElementById('createAccountForm').reset(); }
    else UIModule.showToast(result.message, 'error');
  }


  function handleEventSubmit(e) {
    e.preventDefault();
    OverviewModule.addEvent({ title: document.getElementById('eventTitle').value, date: document.getElementById('eventDate').value, description: document.getElementById('eventDescription').value });
    OverviewModule.closeEventForm();
    UIModule.showToast('Event added successfully!', 'success');
  }

  function handleEmailConfigUpdate(e) {
    e.preventDefault();
    const otpTpl = document.getElementById('otpTemplateId');
    EmailModule.saveEmailConfig({ serviceId: document.getElementById('emailServiceId').value, templateId: document.getElementById('emailTemplateId').value, publicKey: document.getElementById('emailPublicKey').value, otpTemplateId: otpTpl ? otpTpl.value : '' });
    UIModule.showToast('EmailJS configuration saved successfully!', 'success');
  }

  function handlePricingUpdate(e) {
    e.preventDefault();
    const result = SettingsModule.updatePricing({ dayPassStudent: document.getElementById('dayPassStudentPrice').value, dayPassRegular: document.getElementById('dayPassRegularPrice').value, monthlyStudent: document.getElementById('monthlyStudentPrice').value, monthlyRegular: document.getElementById('monthlyRegularPrice').value });
    UIModule.showToast(result.message, 'success');
  }

  function handleOperatingHoursUpdate(e) {
    e.preventDefault();
    const days = [];
    ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(day => { if (document.getElementById(`day${day}`).checked) days.push(day); });
    const result = SettingsModule.updateOperatingHours({ openingTime: document.getElementById('openingTime').value, closingTime: document.getElementById('closingTime').value, days });
    UIModule.showToast(result.message, 'success');
  }

  function getSmsServer() {
    return window.location.port === '3000' ? '' : 'http://localhost:3000';
  }

  async function handleSmsConfigUpdate(e) {
    e.preventDefault();
    const apiKey     = document.getElementById('semaphoreApiKey').value.trim();
    const senderName = document.getElementById('semaphoreSender').value.trim();
    if (!apiKey) { UIModule.showToast('Please enter your Semaphore API key.', 'error'); return; }
    try {
      const res  = await fetch(getSmsServer() + '/api/sms-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ apiKey, senderName })
      });
      const data = await res.json();
      if (data.success) {
        UIModule.showToast('✅ SMS configuration saved!', 'success');
        checkSmsStatus();
      } else {
        UIModule.showToast('❌ ' + data.message, 'error');
      }
    } catch (err) {
      UIModule.showToast('❌ Cannot reach SMS server. Make sure node server.js is running.', 'error');
    }
  }

  async function checkSmsStatus() {
    const statusEl = document.getElementById('smsStatusText');
    if (!statusEl) return;
    try {
      const health = await fetch(getSmsServer() + '/api/health', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (!health || !health.ok) {
        statusEl.innerHTML = '<span class="text-red-600 font-bold">❌ Server Offline</span><br><span class="text-sm text-[#C0C0C0]">Run: <code class="bg-gray-100 px-1 rounded">node server.js</code> in your project folder</span>';
        return;
      }
      const cfg = await fetch(getSmsServer() + '/api/sms-config').then(r => r.json()).catch(() => null);
      if (cfg && cfg.configured) {
        statusEl.innerHTML = `<span class="text-green-600 font-bold">✅ SMS Configured & Server Running</span><br><span class="text-sm text-[#C0C0C0]">Sender: <strong>${cfg.senderName}</strong></span>`;
      } else {
        statusEl.innerHTML = '<span class="text-orange-500 font-bold">⚠️ Server Running — API Key Not Set</span><br><span class="text-sm text-[#C0C0C0]">Enter your Semaphore API key above and save.</span>';
      }
    } catch (err) {
      statusEl.innerHTML = '<span class="text-red-600 font-bold">❌ Server Offline</span><br><span class="text-sm text-[#C0C0C0]">Run: <code class="bg-gray-100 px-1 rounded">node server.js</code> in your project folder</span>';
    }
  }

  return { init };
})();

App.init();