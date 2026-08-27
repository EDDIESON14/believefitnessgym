// ACCOUNTS MODULE — Firebase Firestore
// ===============================================
const AccountsModule = (() => {
  let accounts = [];
  let accountToDelete    = null;
  let accountToEditEmail = null;
  let db = null;
  let _initialized = false;

  async function loadAccounts() {
    try {
      db = firebase.firestore();
      const snap = await db.collection('accounts').get();
      if (snap.empty) {
        // First time — seed default admin
        accounts = [Config.DEFAULT_ADMIN];
        await db.collection('accounts').doc('admin').set(Config.DEFAULT_ADMIN);
      } else {
        accounts = snap.docs.map(d => ({ ...d.data(), username: d.id }));
      }
      _initialized = true;

      // Real-time listener
      db.collection('accounts').onSnapshot(s => {
        accounts = s.docs.map(d => ({ ...d.data(), username: d.id }));
      });
    } catch(e) {
      console.error('[Accounts] Firebase failed, using localStorage:', e);
      const stored = localStorage.getItem(Config.ACCOUNTS_KEY);
      accounts = stored ? JSON.parse(stored) : [Config.DEFAULT_ADMIN];
      if (!stored) localStorage.setItem(Config.ACCOUNTS_KEY, JSON.stringify(accounts));
    }
    return accounts;
  }

  async function saveAccounts() {
    if (!_initialized) { localStorage.setItem(Config.ACCOUNTS_KEY, JSON.stringify(accounts)); return; }
    // individual saves done per operation
  }

  async function _saveAccount(account) {
    if (!_initialized) { localStorage.setItem(Config.ACCOUNTS_KEY, JSON.stringify(accounts)); return; }
    try {
      const { username, ...rest } = account;
      await db.collection('accounts').doc(username).set(rest);
    } catch(e) { console.error('[Accounts] save failed:', e); }
  }

  async function updatePassword(username, newPassword) {
    const account = accounts.find(a => a.username === username);
    if (!account) return false;
    account.password = newPassword;
    await _saveAccount(account);
    return true;
  }

  async function updateEmail(username, email) {
    const account = accounts.find(a => a.username === username);
    if (!account) return false;
    account.email = email;
    await _saveAccount(account);
    return true;
  }

  function getAllAccounts() { return accounts; }
  function getAccountByUsername(username) { return accounts.find(a => a.username === username); }

  async function createAccount(accountData) {
    if (getAccountByUsername(accountData.username))
      return { success: false, message: 'Username already exists!' };
    const newAcc = { ...accountData, createdAt: new Date().toISOString() };
    accounts.push(newAcc);
    await _saveAccount(newAcc);
    return { success: true, message: `Account for ${accountData.fullName} created successfully!` };
  }

  async function deleteAccount(username) {
    if (username === 'admin')
      return { success: false, message: 'Cannot delete default admin account!' };
    const index = accounts.findIndex(a => a.username === username);
    if (index !== -1) {
      const deleted = accounts.splice(index, 1)[0];
      if (_initialized) {
        try { await db.collection('accounts').doc(username).delete(); } catch(e) {}
      } else {
        localStorage.setItem(Config.ACCOUNTS_KEY, JSON.stringify(accounts));
      }
      return { success: true, message: `Account ${deleted.fullName} deleted successfully!` };
    }
    return { success: false, message: 'Account not found!' };
  }

  function renderAccountsList() {
    const container = document.getElementById('accountsList');
    const allAccounts = getAllAccounts();
    if (allAccounts.length === 0) {
      container.innerHTML = '<p class="text-gray-600 text-center py-8">No accounts found</p>';
      return;
    }
    container.innerHTML = allAccounts
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map(account => {
        const isDefaultAdmin = account.username === 'admin';
        const hasEmail = account.email && account.email.trim() !== '';
        const emailDisplay = hasEmail
          ? `<p class="flex items-center gap-1">📧 Email: <strong>${account.email}</strong>
               <button onclick="AccountsModule.openEditEmail('${account.username}')"
                 class="ml-1 text-xs text-emerald-600 hover:text-gray-700 hover:underline font-medium"> Edit</button></p>`
          : `<p class="flex items-center gap-2">📧 Email:
               <span class="text-orange-500 font-medium">⚠️ No email set</span>
               <button onclick="AccountsModule.openEditEmail('${account.username}')"
                 class="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-medium transition">Add Email</button></p>`;
        return `
          <div class="p-4 border ${account.role === 'admin' ? 'border-emerald-500 bg-gray-50' : 'border-gray-200'} rounded-lg hover:shadow-md transition">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center flex-wrap gap-2 mb-2">
                  <h4 class="font-bold text-lg text-gray-800">${account.fullName}</h4>
                  <span class="px-3 py-1 rounded-full text-xs font-bold ${account.role === 'admin' ? 'bg-emerald-500 text-black' : 'bg-white text-black border-2 border-black'}">${account.role.toUpperCase()}</span>
                  ${isDefaultAdmin ? '<span class="px-2 py-1 rounded text-xs bg-black text-white font-bold">DEFAULT</span>' : ''}
                  ${!hasEmail ? '<span class="px-2 py-1 rounded text-xs bg-orange-400 text-white font-bold">NO EMAIL</span>'
                              : '<span class="px-2 py-1 rounded text-xs bg-green-100 text-green-700 font-bold">✓ EMAIL SET</span>'}
                </div>
                <div class="space-y-1 text-sm text-emerald-600">
                  <p>👤 Username: <strong>${account.username}</strong></p>
                  <p class="flex items-center gap-2">🔑 Password:
                    <span id="pw_${account.username}" class="font-mono bg-gray-100 px-2 py-0.5 rounded tracking-widest">••••••••</span>
                    <button onclick="AccountsModule.togglePassword('${account.username}')" id="pwBtn_${account.username}"
                      class="text-xs text-emerald-600 hover:text-gray-700 font-medium hover:underline">👁 Show</button>
                  </p>
                  ${emailDisplay}
                  <p>📅 Created: ${new Date(account.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div class="flex flex-col items-end space-y-2">
                ${!isDefaultAdmin
                  ? `<button onclick="AccountsModule.confirmDelete('${account.username}')"
                       class="text-black hover:text-gray-700 text-sm font-medium">Delete</button>`
                  : ''}
              </div>
            </div>
          </div>`;
      }).join('');
  }

  function openEditEmail(username) {
    const account = getAccountByUsername(username);
    if (!account) return;
    accountToEditEmail = username;
    document.getElementById('editEmailAccountName').textContent = account.fullName;
    document.getElementById('editEmailInput').value = account.email || '';
    document.getElementById('editEmailError').classList.add('hidden');
    document.getElementById('editEmailModal').classList.add('active');
  }

  function closeEditEmail() {
    accountToEditEmail = null;
    document.getElementById('editEmailModal').classList.remove('active');
  }

  async function saveEditEmail() {
    const email = document.getElementById('editEmailInput').value.trim();
    const errorEl = document.getElementById('editEmailError');
    errorEl.classList.add('hidden');
    if (!email) { errorEl.textContent = 'Please enter an email address.'; errorEl.classList.remove('hidden'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { errorEl.textContent = 'Please enter a valid email address.'; errorEl.classList.remove('hidden'); return; }
    if (await updateEmail(accountToEditEmail, email)) {
      closeEditEmail(); renderAccountsList();
      UIModule.showToast('Email updated successfully!', 'success');
    } else {
      errorEl.textContent = 'Failed to update. Please try again.'; errorEl.classList.remove('hidden');
    }
  }

  function togglePassword(username) {
    const account = getAccountByUsername(username);
    if (!account) return;
    const span = document.getElementById('pw_' + username);
    const btn  = document.getElementById('pwBtn_' + username);
    if (!span || !btn) return;
    if (span.dataset.visible === 'true') {
      span.textContent = '••••••••'; span.dataset.visible = 'false'; btn.textContent = '👁 Show';
    } else {
      span.textContent = account.password; span.dataset.visible = 'true'; btn.textContent = 'Hide';
    }
  }

  function confirmDelete(username) {
    const account = getAccountByUsername(username);
    if (!account) return;
    accountToDelete = username;
    document.getElementById('deleteAccountName').textContent = account.fullName;
    document.getElementById('deleteModal').classList.add('active');
  }

  function cancelDelete() { accountToDelete = null; document.getElementById('deleteModal').classList.remove('active'); }

  async function executeDelete() {
    if (!accountToDelete) return;
    const result = await deleteAccount(accountToDelete);
    if (result.success) { UIModule.showToast(result.message, 'success'); renderAccountsList(); }
    else UIModule.showToast(result.message, 'error');
    accountToDelete = null;
    document.getElementById('deleteModal').classList.remove('active');
  }

  return {
    loadAccounts, getAllAccounts, getAccountByUsername, createAccount, deleteAccount,
    updatePassword, updateEmail, openEditEmail, closeEditEmail, saveEditEmail,
    renderAccountsList, togglePassword, confirmDelete, cancelDelete, executeDelete
  };
})();