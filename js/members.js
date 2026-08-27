// MEMBERS MODULE
// ===============================================
const MembersModule = (() => {
  let memberToDelete = null;

  function calculateExpiryDate(startDate, membershipType) {
    const date = new Date(startDate);
    if (membershipType.includes('Day Pass')) date.setDate(date.getDate() + 1);
    else if (membershipType.includes('Monthly')) date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  }

  function createMember(name, email, membershipType, startDate, profilePhoto) {
    const expiryDate = calculateExpiryDate(startDate, membershipType);
    return {
      id: Date.now().toString(), name, email, membershipType, startDate, expiryDate,
      status: new Date(expiryDate) > new Date() ? 'Active' : 'Expired',
      qrCode: `GYM-${Date.now()}`,
      profilePhoto: profilePhoto || null
    };
  }

  async function addMember(memberData) {
    const member = createMember(memberData.name, memberData.email, memberData.membershipType, memberData.startDate, memberData.profilePhoto);
    StorageModule.addMember(member);
    const prices = Config.getMembershipPrices();
    StorageModule.addPayment({ id: Date.now().toString(), memberId: member.id, memberName: member.name, amount: prices[member.membershipType], method: memberData.paymentMethod, date: new Date().toISOString(), type: 'Membership Fee' });

    if (EmailModule.isConfigured()) {
      document.getElementById('emailModal').classList.add('active');
      const emailResult = await EmailModule.sendMemberEmail(member);
      document.getElementById('emailModal').classList.remove('active');
      return { success: true, member, message: emailResult.success ? `Member added! QR codes sent to ${member.email}` : `Member added, but email failed: ${emailResult.message}` };
    }
    return { success: true, member, message: 'Member added! Configure EmailJS in Settings to send QR codes.' };
  }

  function confirmDeleteMember(memberId) {
    const member = StorageModule.getMemberById(memberId);
    if (!member) return;
    memberToDelete = memberId;
    document.getElementById('deleteMemberName').textContent = member.name;
    document.getElementById('deleteMemberModal').classList.add('active');
  }

  function cancelDeleteMember() { memberToDelete = null; document.getElementById('deleteMemberModal').classList.remove('active'); }

  function executeDeleteMember() {
    if (!memberToDelete) return;
    const member = StorageModule.getMemberById(memberToDelete);
    if (member) { StorageModule.deleteMember(memberToDelete); UIModule.showToast(`${member.name} deleted successfully!`, 'success'); DashboardModule.updateDashboard(); }
    memberToDelete = null;
    document.getElementById('deleteMemberModal').classList.remove('active');
  }

  function getActiveMembers() { return StorageModule.getAllMembers().filter(m => m.status === 'Active'); }

  function getExpiringSoonMembers() {
    return StorageModule.getAllMembers().filter(m => {
      const daysUntilExpiry = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000*60*60*24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7 && m.status === 'Active';
    });
  }

  function renderMembersList() {
    const searchVal = (document.getElementById('memberSearchInput') || {}).value || '';
    filterMembers(searchVal);
  }

  function filterMembers(query) {
    const container = document.getElementById('membersList');
    const countEl = document.getElementById('memberSearchCount');
    const allMembers = StorageModule.getAllMembers();
    const q = (query || '').trim().toLowerCase();
    const members = q ? allMembers.filter(m => m.name.toLowerCase().includes(q)) : allMembers;

    // Update count badge
    if (q && countEl) {
      countEl.textContent = members.length + ' result' + (members.length !== 1 ? 's' : '');
      countEl.classList.remove('hidden');
    } else if (countEl) {
      countEl.classList.add('hidden');
    }

    if (allMembers.length === 0) { container.innerHTML = '<p class="text-gray-600 text-center py-8">No members yet</p>'; return; }
    if (members.length === 0) { container.innerHTML = '<div class="text-center py-10"><p class="text-gray-400 text-lg">No members found for <strong>"' + query + '"</strong></p><p class="text-sm text-gray-400 mt-1">Try a different name</p></div>'; return; }
    container.innerHTML = members.map(member => `
      <div class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
        <div class="flex justify-between items-start">
          <div class="flex items-center space-x-4">
            <!-- Profile Photo Thumbnail -->
            <div class="relative flex-shrink-0">
              ${member.profilePhoto
                ? `<img src="${member.profilePhoto}" alt="${member.name}" class="w-16 h-16 rounded-full object-cover border-2 border-emerald-500">`
                : `<div class="w-16 h-16 rounded-full bg-gray-200 border-2 border-dashed border-[#C0C0C0] flex items-center justify-center flex-col cursor-pointer hover:bg-gray-50 hover:border-emerald-500 transition" onclick="MembersModule.triggerPhotoUpdate('${member.id}')" title="Add profile photo">
                    <span class="text-xl">📷</span>
                    <span class="text-xs text-gray-400 mt-0.5">Add</span>
                   </div>`
              }
              ${member.profilePhoto
                ? `<button onclick="MembersModule.triggerPhotoUpdate('${member.id}')" title="Change photo" class="absolute -bottom-1 -right-1 bg-emerald-500 hover:bg-emerald-600 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition">✎</button>`
                : ''
              }
              <input type="file" id="photoInput_${member.id}" accept="image/*" class="hidden" onchange="MembersModule.updateMemberPhoto('${member.id}', event)">
            </div>
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h4 class="font-bold text-lg text-gray-800">${member.name}</h4>
                ${member.profilePhoto ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">🔒 Photo Set</span>' : '<span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">⚠️ No Photo</span>'}
              </div>
              <div class="mt-1 space-y-1 text-sm text-emerald-600">
                <p>📧 ${member.email}</p><p>🎫 ${member.membershipType}</p><p>📆 Expires: ${member.expiryDate}</p>
              </div>
            </div>
          </div>
          <div class="flex flex-col items-end space-y-2">
            <span class="px-3 py-1 rounded-full text-sm font-medium ${member.status === 'Active' ? 'bg-emerald-500 text-black' : 'bg-emerald-500 text-black'}">${member.status}</span>
            <button onclick="QRModule.showQrCode('${member.id}')" class="text-emerald-600 hover:text-gray-700 text-sm font-medium">View QR Code</button>
            <button onclick="MembersModule.openRenewModal('${member.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-medium px-3 py-1 rounded-lg transition">Renew</button>
            <button onclick="MembersModule.confirmDeleteMember('${member.id}')" class="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ── Photo functions (all defined inside module) ──

  function _resizeImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function previewPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    _resizeImage(file, (dataUrl) => {
      const preview = document.getElementById('memberPhotoPreview');
      const placeholder = document.getElementById('photoPlaceholder');
      const clearBtn = document.getElementById('clearPhotoBtn');
      preview.src = dataUrl;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
      clearBtn.classList.remove('hidden');
    });
  }

  function clearPhoto() {
    const preview = document.getElementById('memberPhotoPreview');
    const placeholder = document.getElementById('photoPlaceholder');
    const clearBtn = document.getElementById('clearPhotoBtn');
    const input = document.getElementById('memberPhotoInput');
    if (preview) { preview.src = ''; preview.classList.add('hidden'); }
    if (placeholder) placeholder.classList.remove('hidden');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (input) input.value = '';
  }

  function getPhotoDataUrl() {
    const preview = document.getElementById('memberPhotoPreview');
    if (preview && !preview.classList.contains('hidden') && preview.src && preview.src.startsWith('data:')) {
      return preview.src;
    }
    return null;
  }

  function triggerPhotoUpdate(memberId) {
    const input = document.getElementById('photoInput_' + memberId);
    if (input) input.click();
  }

  function updateMemberPhoto(memberId, event) {
    const file = event.target.files[0];
    if (!file) return;
    _resizeImage(file, (dataUrl) => {
      const member = StorageModule.getMemberById(memberId);
      if (member) {
        member.profilePhoto = dataUrl;
        StorageModule.saveData();
        renderMembersList();
        UIModule.showToast('Photo updated for ' + member.name + '! 🔒', 'success');
      }
    });
  }

  // ── RENEWAL ──────────────────────────────────

  let renewMemberId = null;

  function openRenewModal(memberId) {
    const member = StorageModule.getMemberById(memberId);
    if (!member) return;
    renewMemberId = memberId;

    document.getElementById('renewMemberName').textContent = member.name;
    document.getElementById('renewCurrentType').textContent = member.membershipType;
    document.getElementById('renewCurrentExpiry').textContent = member.expiryDate;

    // Default: today as start date
    document.getElementById('renewStartDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('renewMembershipType').value = '';
    document.getElementById('renewPaymentMethod').value = '';
    document.getElementById('renewNewExpiry').textContent = '—';
    document.getElementById('renewAmount').textContent = '₱—';
    document.getElementById('renewError').classList.add('hidden');

    document.getElementById('renewModal').classList.add('active');
  }

  function closeRenewModal() {
    renewMemberId = null;
    document.getElementById('renewModal').classList.remove('active');
  }

  function updateRenewPreview() {
    const type = document.getElementById('renewMembershipType').value;
    const start = document.getElementById('renewStartDate').value;
    if (!type || !start) return;

    const expiry = calculateExpiryDate(start, type);
    const prices = Config.getMembershipPrices();
    document.getElementById('renewNewExpiry').textContent = expiry;
    document.getElementById('renewAmount').textContent = '₱' + (prices[type] || '—');
  }

  async function confirmRenewal() {
    const member = StorageModule.getMemberById(renewMemberId);
    if (!member) return;

    const type = document.getElementById('renewMembershipType').value;
    const start = document.getElementById('renewStartDate').value;
    const payment = document.getElementById('renewPaymentMethod').value;
    const errEl = document.getElementById('renewError');

    if (!type) { errEl.textContent = 'Please select a membership type.'; errEl.classList.remove('hidden'); return; }
    if (!start) { errEl.textContent = 'Please select a start date.'; errEl.classList.remove('hidden'); return; }
    if (!payment) { errEl.textContent = 'Please select a payment method.'; errEl.classList.remove('hidden'); return; }

    errEl.classList.add('hidden');

    const newExpiry = calculateExpiryDate(start, type);
    const prices = Config.getMembershipPrices();

    // Update member
    member.membershipType = type;
    member.startDate = start;
    member.expiryDate = newExpiry;
    member.status = new Date(newExpiry) >= new Date(new Date().toISOString().split('T')[0]) ? 'Active' : 'Expired';
    StorageModule.updateMember(member);

    // Record payment
    StorageModule.addPayment({
      id: Date.now().toString(),
      memberId: member.id,
      memberName: member.name,
      amount: prices[type] || 0,
      method: payment,
      date: new Date().toISOString(),
      type: 'Renewal'
    });

    // Re-send QR if email configured
    if (EmailModule.isConfigured()) {
      document.getElementById('emailModal').classList.add('active');
      await EmailModule.sendMemberEmail(member);
      document.getElementById('emailModal').classList.remove('active');
    }

    closeRenewModal();
    renderMembersList();
    DashboardModule.updateDashboard();
    UIModule.showToast(member.name + ' renewed until ' + newExpiry + '!', 'success');
  }

  return { addMember, getActiveMembers, getExpiringSoonMembers, renderMembersList, filterMembers, confirmDeleteMember, cancelDeleteMember, executeDeleteMember, previewPhoto, clearPhoto, getPhotoDataUrl, triggerPhotoUpdate, updateMemberPhoto, openRenewModal, closeRenewModal, updateRenewPreview, confirmRenewal };
})();

