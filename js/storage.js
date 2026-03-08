// STORAGE MODULE — Firebase Firestore
// ===============================================
// Replaces localStorage with Firebase Firestore
// so all computers share the same data in real-time.
//
// SETUP: Set your Firebase config in config.js:
//   Config.FIREBASE_CONFIG = { apiKey: "...", ... }
// ===============================================

const StorageModule = (() => {

  // ── In-memory cache (mirrors Firestore) ──────
  let data = { members: [], attendance: [], payments: [] };
  let db = null;        // Firestore instance
  let _initialized = false;
  let _listeners = [];  // unsubscribe functions

  // ── Init ─────────────────────────────────────
  async function loadData() {
    try {
      db = firebase.firestore();

      // Real-time listener for members
      const unsubMembers = db.collection('members').onSnapshot(snap => {
        data.members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _onDataChange('members');
      });

      // Real-time listener for attendance
      const unsubAttendance = db.collection('attendance').onSnapshot(snap => {
        data.attendance = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _onDataChange('attendance');
      });

      // Real-time listener for payments
      const unsubPayments = db.collection('payments').onSnapshot(snap => {
        data.payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _onDataChange('payments');
      });

      _listeners = [unsubMembers, unsubAttendance, unsubPayments];
      _initialized = true;

      // Wait for first snapshot load
      await _waitForFirstLoad();
      return data;

    } catch (err) {
      console.error('[Storage] Firebase init failed, falling back to localStorage:', err);
      return _loadFromLocalStorage();
    }
  }

  // Wait up to 5s for all three collections to load
  function _waitForFirstLoad() {
    return new Promise(resolve => {
      let waited = 0;
      const check = setInterval(() => {
        waited += 100;
        if (_initialized || waited >= 5000) { clearInterval(check); resolve(); }
      }, 100);
    });
  }

  // Called when Firestore snapshot updates
  function _onDataChange(collection) {
    try {
      if (typeof DashboardModule !== 'undefined') DashboardModule.updateDashboard();
      if (typeof NotifModule !== 'undefined') NotifModule.refresh();
    } catch(e) {}
  }

  // Fallback to localStorage if Firebase fails
  function _loadFromLocalStorage() {
    const stored = localStorage.getItem(Config.STORAGE_KEY);
    if (stored) data = JSON.parse(stored);
    return data;
  }

  function saveData() {
    // saveData() is a no-op in Firebase mode — each write goes directly
    // Still kept for localStorage fallback
    if (!_initialized) {
      localStorage.setItem(Config.STORAGE_KEY, JSON.stringify(data));
    }
  }

  // ── Members ───────────────────────────────────
  function getAllMembers() { return data.members; }

  function getMemberById(id) { return data.members.find(m => m.id === id); }

  async function addMember(member) {
    if (!_initialized) { data.members.push(member); saveData(); return; }
    try {
      const { id, ...rest } = member;
      await db.collection('members').doc(id).set(rest);
    } catch(e) {
      console.error('[Storage] addMember failed:', e);
      data.members.push(member); saveData();
    }
  }

  async function updateMember(updatedMember) {
    if (!_initialized) {
      const i = data.members.findIndex(m => m.id === updatedMember.id);
      if (i !== -1) { data.members[i] = updatedMember; saveData(); } return;
    }
    try {
      const { id, ...rest } = updatedMember;
      await db.collection('members').doc(id).set(rest);
    } catch(e) {
      console.error('[Storage] updateMember failed:', e);
    }
  }

  async function deleteMember(id) {
    if (!_initialized) {
      data.members = data.members.filter(m => m.id !== id);
      data.attendance = data.attendance.filter(a => a.memberId !== id);
      data.payments = data.payments.filter(p => p.memberId !== id);
      saveData(); return;
    }
    try {
      const batch = db.batch();
      batch.delete(db.collection('members').doc(id));

      // Delete related attendance
      const attSnap = await db.collection('attendance').where('memberId', '==', id).get();
      attSnap.forEach(d => batch.delete(d.ref));

      // Delete related payments
      const paySnap = await db.collection('payments').where('memberId', '==', id).get();
      paySnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
    } catch(e) {
      console.error('[Storage] deleteMember failed:', e);
    }
  }

  // ── Attendance ────────────────────────────────
  function getAllAttendance() { return data.attendance; }

  async function addAttendance(record) {
    if (!_initialized) { data.attendance.push(record); saveData(); return; }
    try {
      const { id, ...rest } = record;
      await db.collection('attendance').doc(id).set(rest);
    } catch(e) {
      console.error('[Storage] addAttendance failed:', e);
      data.attendance.push(record); saveData();
    }
  }

  async function updateAttendance(record) {
    if (!_initialized) {
      const i = data.attendance.findIndex(a => a.id === record.id);
      if (i !== -1) { data.attendance[i] = record; saveData(); } return;
    }
    try {
      const { id, ...rest } = record;
      await db.collection('attendance').doc(id).set(rest);
    } catch(e) {
      console.error('[Storage] updateAttendance failed:', e);
    }
  }

  function getTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    return data.attendance.filter(a => a.date === today);
  }

  // ── Payments ──────────────────────────────────
  function getAllPayments() { return data.payments; }

  async function addPayment(payment) {
    if (!_initialized) { data.payments.push(payment); saveData(); return; }
    try {
      const { id, ...rest } = payment;
      await db.collection('payments').doc(id).set(rest);
    } catch(e) {
      console.error('[Storage] addPayment failed:', e);
      data.payments.push(payment); saveData();
    }
  }

  return {
    loadData, saveData,
    getAllMembers, addMember, getMemberById, updateMember, deleteMember,
    getAllAttendance, addAttendance, updateAttendance, getTodayAttendance,
    getAllPayments, addPayment
  };
})();
// ===============================================
