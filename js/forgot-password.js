// ===============================================
// FORGOT PASSWORD MODULE (Email OTP via EmailJS)
// ===============================================
const ForgotPasswordModule = (() => {
  const OTP_EXPIRY_MINUTES = 5;
  const OTP_DIGITS = 6;

  let currentOTP = null;
  let otpStep    = 'request';
  let countdownInterval = null;

  // ── Helpers ──────────────────────────────────

  function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function maskEmail(email) {
    const [user, domain] = email.split('@');
    const visible = user.length > 2 ? user.substring(0, 2) : user[0];
    return visible + '***@' + domain;
  }

  function setStep(step) {
    otpStep = step;
    ['request','verify','reset'].forEach(s => {
      document.getElementById('fpStep_' + s).classList.toggle('hidden', s !== step);
    });
    const stepNum = step === 'request' ? 1 : step === 'verify' ? 2 : 3;
    ['fpDot1','fpDot2','fpDot3'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (i + 1 < stepNum)       el.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-600 text-black';
      else if (i + 1 === stepNum) el.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-500 text-black';
      else                        el.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-600';
    });
    ['fpLine1','fpLine2'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.style.width = i + 1 < stepNum ? '100%' : '0%';
    });
  }

  function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  }

  function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) { btn.dataset.orig = btn.textContent; btn.textContent = '⏳ Sending...'; }
    else btn.textContent = btn.dataset.orig || btn.textContent;
  }

  // ── Open / Close ──────────────────────────────

  function openModal() {
    currentOTP = null;
    if (countdownInterval) clearInterval(countdownInterval);
    ['fpUsernameInput','fpOtpInput','fpNewPassword','fpConfirmPassword'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['fpRequestError','fpVerifyError','fpResetError'].forEach(hideError);
    setStep('request');
    document.getElementById('forgotPasswordModal').classList.add('active');
  }

  function closeModal() {
    document.getElementById('forgotPasswordModal').classList.remove('active');
    if (countdownInterval) clearInterval(countdownInterval);
    currentOTP = null;
  }

  // ── Step 1: Request OTP ───────────────────────

  async function requestOTP() {
    hideError('fpRequestError');
    const username = document.getElementById('fpUsernameInput').value.trim();
    if (!username) { showError('fpRequestError', 'Please enter your username.'); return; }

    const account = AccountsModule.getAllAccounts().find(a => a.username === username);
    if (!account) { showError('fpRequestError', 'Username not found.'); return; }
    if (!account.email) {
      showError('fpRequestError', 'No email address linked to this account. Please ask the admin to add your email in Staff Account Management.');
      return;
    }

    if (!EmailModule.isConfigured()) {
      showError('fpRequestError', 'Email service not configured. Please ask admin to set up EmailJS in Settings first.');
      return;
    }

    setLoading('fpRequestBtn', true);

    try {
      const otp    = generateOTP();
      const expiry = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
      currentOTP   = { code: otp, expiry, username };

      const result = await EmailModule.sendOTPEmail(account, otp, OTP_EXPIRY_MINUTES);

      if (result.success) {
        document.getElementById('fpEmailHint').textContent =
          `OTP sent to ${maskEmail(account.email)}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
        setStep('verify');
        startOTPCountdown();
      } else {
        showError('fpRequestError', 'Failed to send OTP: ' + result.message);
        currentOTP = null;
      }
    } catch (err) {
      showError('fpRequestError', 'Error: ' + err.message);
      currentOTP = null;
    }

    setLoading('fpRequestBtn', false);
  }

  // ── Countdown ─────────────────────────────────

  function startOTPCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    function tick() {
      if (!currentOTP) { clearInterval(countdownInterval); return; }
      const remaining = Math.max(0, Math.ceil((currentOTP.expiry - Date.now()) / 1000));
      const el = document.getElementById('fpCountdown');
      if (el) el.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
      if (remaining === 0) {
        clearInterval(countdownInterval);
        showError('fpVerifyError', '⏰ OTP expired. Please go back and request a new one.');
        currentOTP = null;
      }
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  // ── Step 2: Verify OTP ────────────────────────

  function verifyOTP() {
    hideError('fpVerifyError');
    const entered = document.getElementById('fpOtpInput').value.trim();
    if (!entered)    { showError('fpVerifyError', 'Please enter the OTP.'); return; }
    if (!currentOTP) { showError('fpVerifyError', '⏰ OTP expired. Please request a new one.'); return; }
    if (Date.now() > currentOTP.expiry) {
      showError('fpVerifyError', '⏰ OTP has expired. Please request a new one.');
      currentOTP = null; return;
    }
    if (entered !== currentOTP.code) {
      showError('fpVerifyError', 'Incorrect OTP. Please check your email and try again.');
      return;
    }
    if (countdownInterval) clearInterval(countdownInterval);
    setStep('reset');
  }

  function resendOTP() {
    if (countdownInterval) clearInterval(countdownInterval);
    const username = currentOTP ? currentOTP.username : '';
    currentOTP = null;
    hideError('fpVerifyError');
    setStep('request');
    const inp = document.getElementById('fpUsernameInput');
    if (inp) inp.value = username;
  }

  // ── Step 3: Reset Password ────────────────────

  function resetPassword() {
    hideError('fpResetError');
    const newPass     = document.getElementById('fpNewPassword').value;
    const confirmPass = document.getElementById('fpConfirmPassword').value;
    if (!newPass || newPass.length < 6) { showError('fpResetError', 'Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass)        { showError('fpResetError', 'Passwords do not match.'); return; }
    if (!currentOTP)                    { showError('fpResetError', 'Session expired. Please start over.'); return; }
    if (AccountsModule.updatePassword(currentOTP.username, newPass)) {
      closeModal();
      UIModule.showToast('Password reset successfully! Please log in with your new password.', 'success');
    } else {
      showError('fpResetError', 'Failed to update password. Please try again.');
    }
  }

  return { openModal, closeModal, requestOTP, verifyOTP, resendOTP, resetPassword };
})();


