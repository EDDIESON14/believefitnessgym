// CONFIG
// ===============================================
const Config = (() => {
  const STORAGE_KEY = 'gymData_v37';
  const ACCOUNTS_KEY = 'gymAccounts_v37';
  const SETTINGS_KEY = 'gymSettings_v37';
  const EMAIL_CONFIG_KEY = 'gymEmailConfig_v37';
  const PHOTOS_KEY = 'gymPhotos_v37';
  const EVENTS_KEY = 'gymEvents_v37';
  const MAX_GYM_CAPACITY = 50;
  let MEMBERSHIP_PRICES = {
    'Day Pass (Student)': 100, 'Day Pass (Regular)': 120,
    'Monthly (Student)': 600, 'Monthly (Regular)': 700
  };
  const DEFAULT_ADMIN = { username: 'admin', password: 'admin123', role: 'admin', fullName: 'System Administrator', email: '', createdAt: new Date().toISOString() };
  function getMembershipPrices() { return MEMBERSHIP_PRICES; }
  function updateMembershipPrices(prices) { MEMBERSHIP_PRICES = { ...prices }; }
  return { STORAGE_KEY, ACCOUNTS_KEY, SETTINGS_KEY, EMAIL_CONFIG_KEY, PHOTOS_KEY, EVENTS_KEY, MAX_GYM_CAPACITY, getMembershipPrices, updateMembershipPrices, DEFAULT_ADMIN };
})();

// ===============================================
