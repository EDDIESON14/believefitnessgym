// AUTH MODULE
// ===============================================
const AuthModule = (() => {
  const SESSION_KEY = 'bfc_session';
  let currentUser = null;

  // Restore session on page load/refresh
  function restoreSession() {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        currentUser = JSON.parse(saved);
        return true;
      }
    } catch(e) {}
    return false;
  }

  function login(username, password) {
    const account = AccountsModule.getAllAccounts().find(a => a.username === username && a.password === password);
    if (account) {
      currentUser = account;
      // Save session so refresh won't log out
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(account));
      return { success: true, role: account.role, message: `Welcome back, ${account.fullName}!` };
    }
    return { success: false, message: 'Invalid credentials' };
  }

  function logout() {
    currentUser = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() { return currentUser; }
  function isAuthenticated() { return currentUser !== null; }
  function isAdmin() { return currentUser && currentUser.role === 'admin'; }

  return { login, logout, getCurrentUser, isAuthenticated, isAdmin, restoreSession };
})();

// ===============================================