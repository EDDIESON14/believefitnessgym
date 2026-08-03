// SETTINGS MODULE — Firebase Firestore
// ===============================================
const SettingsModule = (() => {
  let settings = {
    pricing: { dayPassStudent: 100, dayPassRegular: 120, monthlyStudent: 600, monthlyRegular: 700 },
    operatingHours: { openingTime: '06:00', closingTime: '22:00', days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] }
  };
  let db = null;
  let _initialized = false;

  async function loadSettings() {
    try {
      db = firebase.firestore();
      const doc = await db.collection('config').doc('settings').get();
      if (doc.exists) {
        settings = doc.data();
      } else {
        await db.collection('config').doc('settings').set(settings);
      }
      _initialized = true;

      // Real-time listener
      db.collection('config').doc('settings').onSnapshot(d => {
        if (d.exists) { settings = d.data(); _applyPrices(); }
      });
    } catch(e) {
      console.error('[Settings] Firebase failed, using localStorage:', e);
      const stored = localStorage.getItem(Config.SETTINGS_KEY);
      if (stored) settings = JSON.parse(stored);
    }
    _applyPrices();
    return settings;
  }

  function _applyPrices() {
    Config.updateMembershipPrices({
      'Day Pass (Student)':  settings.pricing.dayPassStudent,
      'Day Pass (Regular)':  settings.pricing.dayPassRegular,
      'Monthly (Student)':   settings.pricing.monthlyStudent,
      'Monthly (Regular)':   settings.pricing.monthlyRegular
    });
  }

  async function saveSettings() {
    if (_initialized) {
      try { await db.collection('config').doc('settings').set(settings); return; } catch(e) {}
    }
    localStorage.setItem(Config.SETTINGS_KEY, JSON.stringify(settings));
    _applyPrices();
  }

  function getSettings() { return settings; }

  async function updatePricing(pricingData) {
    settings.pricing = {
      dayPassStudent:  parseFloat(pricingData.dayPassStudent),
      dayPassRegular:  parseFloat(pricingData.dayPassRegular),
      monthlyStudent:  parseFloat(pricingData.monthlyStudent),
      monthlyRegular:  parseFloat(pricingData.monthlyRegular)
    };
    await saveSettings();
    updateMembershipTypeOptions();
    return { success: true, message: 'Pricing updated successfully!' };
  }

  async function updateOperatingHours(hoursData) {
    settings.operatingHours = hoursData;
    await saveSettings();
    displayOperatingHours();
    return { success: true, message: 'Operating hours updated successfully!' };
  }

  function loadPricingForm() {
    document.getElementById('dayPassStudentPrice').value = settings.pricing.dayPassStudent;
    document.getElementById('dayPassRegularPrice').value = settings.pricing.dayPassRegular;
    document.getElementById('monthlyStudentPrice').value = settings.pricing.monthlyStudent;
    document.getElementById('monthlyRegularPrice').value = settings.pricing.monthlyRegular;
  }

  function loadOperatingHoursForm() {
    document.getElementById('openingTime').value = settings.operatingHours.openingTime;
    document.getElementById('closingTime').value = settings.operatingHours.closingTime;
    ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].forEach(day => {
      const cb = document.getElementById(`day${day}`);
      if (cb) cb.checked = settings.operatingHours.days.includes(day);
    });
    displayOperatingHours();
  }

  function displayOperatingHours() {
    const container = document.getElementById('displayOperatingHours');
    if (!container) return;
    const { openingTime, closingTime, days } = settings.operatingHours;
    container.innerHTML = `<p class="font-bold">🕒 ${openingTime} - ${closingTime}</p><p class="mt-2">📅 Open: ${days.join(', ')}</p>`;
  }

  function updateMembershipTypeOptions() {
    const select = document.getElementById('membershipType');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = `
      <option value="">Select Type</option>
      <option value="Day Pass (Student)">Day Pass (Student) - ₱${settings.pricing.dayPassStudent.toLocaleString()}</option>
      <option value="Day Pass (Regular)">Day Pass (Regular) - ₱${settings.pricing.dayPassRegular.toLocaleString()}</option>
      <option value="Monthly (Student)">Monthly (Student) - ₱${settings.pricing.monthlyStudent.toLocaleString()}</option>
      <option value="Monthly (Regular)">Monthly (Regular) - ₱${settings.pricing.monthlyRegular.toLocaleString()}</option>`;
    if (currentValue) select.value = currentValue;
  }

  return { loadSettings, getSettings, updatePricing, updateOperatingHours, loadPricingForm, loadOperatingHoursForm, displayOperatingHours, updateMembershipTypeOptions };
})();
