// ATTENDANCE MODULE
// ===============================================
const AttendanceModule = (() => {
  let scannerTimeout = null;

  function checkInOut(memberId) {
    const member = StorageModule.getMemberById(memberId);
    if (!member) return { success: false, message: 'Member not found' };
    if (member.status !== 'Active') return { success: false, message: `${member.name}'s membership is expired!` };

    const today = new Date().toISOString().split('T')[0];
    const todayActive = StorageModule.getTodayAttendance().filter(a => a.memberId === memberId && !a.checkOutTime);

    if (todayActive.length > 0) {
      const record = todayActive[0];
      record.checkOutTime = new Date().toISOString();
      StorageModule.updateAttendance(record);
      return { success: true, message: `${member.name} checked out!`, action: 'checkout', member };
    } else {
      StorageModule.addAttendance({ id: Date.now().toString(), memberId: member.id, memberName: member.name, checkInTime: new Date().toISOString(), checkOutTime: null, date: today });
      return { success: true, message: `${member.name} checked in!`, action: 'checkin', member };
    }
  }

  function checkInOutByCode(code) {
    const member = StorageModule.getAllMembers().find(m => m.qrCode === code);
    if (!member) return { success: false, message: 'Invalid barcode/QR code' };
    const result = checkInOut(member.id);
    if (result.success) {
      updateMemberProfile(member, result.action);
      // Send to client display window
      ClientMonitor.showMemberCard(member, result.action);
    }
    return result;
  }

  function updateMemberProfile(member, action) {
    const profileBox   = document.getElementById('memberProfileBox');
    const timeStr      = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isCheckIn    = action === 'checkin';

    // Name, membership, expiry, time
    document.getElementById('profileName').textContent       = member.name;
    document.getElementById('profileMembership').textContent = member.membershipType;
    document.getElementById('profileExpiry').textContent     = member.expiryDate;
    document.getElementById('profileTime').textContent       = timeStr;

    // Status badge
    const statusSpan = document.getElementById('profileStatus');
    if (isCheckIn) {
      statusSpan.textContent = 'Checked In';
      statusSpan.className = 'inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-green-400 text-black';
    } else {
      statusSpan.textContent = 'Checked Out';
      statusSpan.className = 'inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-red-400 text-black';
    }

    // Profile photo
    const photoEl      = document.getElementById('profilePhoto');
    const fallbackEl   = document.getElementById('profilePhotoFallback');
    const initialEl    = document.getElementById('profilePhotoInitial');
    const badgeEl      = document.getElementById('profilePhotoBadge');
    const noPhotoWarn  = document.getElementById('profileNoPhotoWarning');

    if (member.profilePhoto) {
      photoEl.src = member.profilePhoto;
      photoEl.classList.remove('hidden');
      fallbackEl.classList.add('hidden');
      noPhotoWarn.classList.add('hidden');
      // Green verified badge
      badgeEl.textContent = '✓';
      badgeEl.className = 'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-green-400 text-black';
      badgeEl.classList.remove('hidden');
    } else {
      photoEl.classList.add('hidden');
      fallbackEl.classList.remove('hidden');
      initialEl.textContent = member.name.charAt(0).toUpperCase();
      noPhotoWarn.classList.remove('hidden');
      badgeEl.classList.add('hidden');
    }

    // Border color based on action
    profileBox.className = profileBox.className.replace(/border-\S+/g, '');
    profileBox.classList.add(isCheckIn ? 'border-green-400' : 'border-gray-300');
    profileBox.classList.remove('hidden');
  }

  function clearProfile() { document.getElementById('memberProfileBox').classList.add('hidden'); }

  function initScanner() {
    const scannerInput = document.getElementById('scannerInput');
    if (!scannerInput) return;
    scannerInput.addEventListener('input', (e) => {
      if (scannerTimeout) clearTimeout(scannerTimeout);
      scannerTimeout = setTimeout(() => {
        const scannedCode = scannerInput.value.trim();
        if (scannedCode) {
          const result = checkInOutByCode(scannedCode);
          const scanStatus = document.getElementById('scanStatus');
          const scanStatusText = document.getElementById('scanStatusText');
          scanStatus.classList.remove('hidden');
          if (result.success) {
            const actionIcon = result.action === 'checkin' ? '✓ Check In' : '✓ Check Out';
            scanStatusText.textContent = `${actionIcon}: ${result.message}`;
            scanStatus.querySelector('div').className = 'bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-center font-medium';
            DashboardModule.updateDashboard();
            UIModule.showToast(result.message, 'success');
          } else {
            scanStatusText.textContent = `✗ ${result.message}`;
            scanStatus.querySelector('div').className = 'bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-center font-medium';
            UIModule.showToast(result.message, 'error');
          }
          scannerInput.value = '';
          setTimeout(() => { scanStatus.classList.add('hidden'); scannerInput.focus(); }, 2000);
        }
      }, 150);
    });
    document.getElementById('scannerForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const scannedCode = scannerInput.value.trim();
      if (scannedCode) {
        const result = checkInOutByCode(scannedCode);
        if (result.success) { UIModule.showToast(result.message, 'success'); DashboardModule.updateDashboard(); }
        else UIModule.showToast(result.message, 'error');
        scannerInput.value = '';
      }
    });
  }

  function renderAttendanceRecords() {
    const container = document.getElementById('attendanceRecords');
    const todayRecords = StorageModule.getTodayAttendance();
    if (todayRecords.length === 0) { container.innerHTML = '<p class="text-gray-600 text-center py-8">No attendance records for today</p>'; return; }
    container.innerHTML = todayRecords.sort((a,b) => b.checkInTime.localeCompare(a.checkInTime)).map(record => {
      const checkIn = new Date(record.checkInTime).toLocaleTimeString();
      const checkOut = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'Still in gym';
      return `<div class="p-4 border border-gray-200 rounded-lg"><div class="flex justify-between items-start"><div><h4 class="font-bold text-lg text-gray-800">${record.memberName}</h4></div><span class="px-3 py-1 rounded-full text-xs font-medium ${record.checkOutTime ? 'bg-gray-200 text-black' : 'bg-emerald-500 text-black'}">${record.checkOutTime ? 'Completed' : 'Active'}</span></div><div class="flex space-x-4 text-sm mt-3 pt-3 border-t border-gray-200"><div class="text-center flex-1"><p class="text-xs text-gray-600 mb-1">Check In</p><p class="text-green-600 font-bold">${checkIn}</p></div><div class="text-center flex-1"><p class="text-xs text-gray-600 mb-1">Check Out</p><p class="${record.checkOutTime ? 'text-red-600' : 'text-orange-600'} font-bold">${checkOut}</p></div></div></div>`;
    }).join('');
  }

  function updateCheckInMemberSelect() {
    const select = document.getElementById('checkInMember');
    select.innerHTML = '<option value="">Choose a member</option>';
    StorageModule.getAllMembers().forEach(member => {
      const option = document.createElement('option');
      option.value = member.id;
      option.textContent = `${member.name} - ${member.membershipType}`;
      select.appendChild(option);
    });
  }

  function renderMemberStatusTable() {
    const tbody = document.getElementById('memberStatusTable');
    const members = StorageModule.getAllMembers();
    if (members.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-600">No members found</td></tr>'; return; }

    tbody.innerHTML = members.sort((a,b) => a.name.localeCompare(b.name)).map(member => {
      const daysLeft = Math.ceil((new Date(member.expiryDate) - new Date()) / (1000*60*60*24));
      let daysLeftText = '';
      let daysLeftClass = '';

      if (daysLeft <= 0) {
        daysLeftText = 'Expired';
        daysLeftClass = 'text-red-600 font-bold';
      } else if (daysLeft === 1) {
        daysLeftText = '1 day 🔴';
        daysLeftClass = 'text-red-600 font-bold';
      } else if (daysLeft <= 3) {
        daysLeftText = `${daysLeft} days 🟡`;
        daysLeftClass = 'text-amber-600 font-bold';
      } else {
        daysLeftText = `${daysLeft} days`;
        daysLeftClass = 'text-green-600';
      }

      return `<tr class="border-b border-gray-200 hover:bg-gray-50 ${daysLeft <= 1 && daysLeft >= 0 ? 'bg-red-50' : daysLeft <= 3 && daysLeft > 1 ? 'bg-amber-50' : ''}"><td class="px-4 py-3 text-sm font-medium text-gray-800">${member.name}</td><td class="px-4 py-3 text-center"><span class="px-3 py-1 rounded-full text-xs font-bold ${member.status === 'Active' ? 'bg-emerald-500 text-black' : 'bg-emerald-500 text-black'}">${member.status}</span></td><td class="px-4 py-3 text-center text-sm text-gray-700">${member.expiryDate}</td><td class="px-4 py-3 text-center text-sm ${daysLeftClass}">${daysLeftText}</td></tr>`;
    }).join('');
  }

  return { checkInOut, checkInOutByCode, initScanner, renderAttendanceRecords, updateCheckInMemberSelect, renderMemberStatusTable, clearProfile };
})();

// ===============================================