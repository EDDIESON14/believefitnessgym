// SETTINGS MODULE — Firebase Firestore + GCash QR
// ===============================================
const SettingsModule = (() => {
  let settings = {
    pricing: { dayPassStudent: 100, dayPassRegular: 120, monthlyStudent: 600, monthlyRegular: 700 },
    operatingHours: { openingTime: '06:00', closingTime: '22:00', days: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] },
    gcashQR: null  // base64 image of admin's GCash QR code
  };
  let db = null;
  let _initialized = false;

  async function loadSettings() {
    try {
      db = firebase.firestore();
      const doc = await db.collection('config').doc('settings').get();
      if (doc.exists) {
        settings = { ...settings, ...doc.data() };
      } else {
        await db.collection('config').doc('settings').set(settings);
      }
      _initialized = true;

      // Real-time listener
      db.collection('config').doc('settings').onSnapshot(d => {
        if (d.exists) { settings = { ...settings, ...d.data() }; _applyPrices(); }
      });
    } catch(e) {
      console.error('[Settings] Firebase failed, using localStorage:', e);
      const stored = localStorage.getItem(Config.SETTINGS_KEY);
      if (stored) settings = { ...settings, ...JSON.parse(stored) };
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
      try {
        await db.collection('config').doc('settings').set(settings);
        _applyPrices();
        return;
      } catch(e) { console.error('[Settings] Firebase save failed:', e); }
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
    document.getElementById('closingTime').value  = settings.operatingHours.closingTime;
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

  // ── GCASH QR ──────────────────────────────────
  function getGcashQR() { return settings.gcashQR || null; }

  async function saveGcashQR(base64Image) {
    settings.gcashQR = base64Image;
    await saveSettings();
    _renderGcashPreview();
  }

  async function removeGcashQR() {
    settings.gcashQR = null;
    await saveSettings();
    _renderGcashPreview();
  }

  function _renderGcashPreview() {
    const preview     = document.getElementById('gcashQRPreview');
    const placeholder = document.getElementById('gcashQRPlaceholder');
    const removeBtn   = document.getElementById('gcashQRRemoveBtn');
    if (!preview) return;
    if (settings.gcashQR) {
      preview.src = settings.gcashQR;
      preview.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
      if (removeBtn)   removeBtn.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
      if (placeholder) placeholder.classList.remove('hidden');
      if (removeBtn)   removeBtn.classList.add('hidden');
    }
  }

  function loadGcashQRSection() { _renderGcashPreview(); }

  return {
    loadSettings, getSettings, updatePricing, updateOperatingHours,
    loadPricingForm, loadOperatingHoursForm, displayOperatingHours,
    updateMembershipTypeOptions,
    getGcashQR, saveGcashQR, removeGcashQR, loadGcashQRSection
  };
})();
