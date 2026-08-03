// REPORTS MODULE
// ===============================================
const ReportsModule = (() => {
  function updateReports() {
    const payments = StorageModule.getAllPayments();
    const members = StorageModule.getAllMembers();
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const now = new Date();
    const monthRevenue = payments.filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, p) => sum + p.amount, 0);
    const avgRevenue = members.length > 0 ? totalRevenue / members.length : 0;
    document.getElementById('totalRevenue').textContent = `₱${totalRevenue.toLocaleString()}`;
    document.getElementById('monthRevenue').textContent = `₱${monthRevenue.toLocaleString()}`;
    document.getElementById('avgRevenue').textContent = `₱${avgRevenue.toLocaleString()}`;
    document.getElementById('dayPassStudentCount').textContent = members.filter(m => m.membershipType === 'Day Pass (Student)').length;
    document.getElementById('dayPassRegularCount').textContent = members.filter(m => m.membershipType === 'Day Pass (Regular)').length;
    document.getElementById('monthlyStudentCount').textContent = members.filter(m => m.membershipType === 'Monthly (Student)').length;
    document.getElementById('monthlyRegularCount').textContent = members.filter(m => m.membershipType === 'Monthly (Regular)').length;
  }
  return { updateReports };
})();


