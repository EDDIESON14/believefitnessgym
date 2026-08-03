// QR MODULE
// ===============================================
const QRModule = (() => {
  let currentQrMemberId = null;
  let currentBarcodeType = '1D';

  function showQrCode(memberId) {
    const member = StorageModule.getMemberById(memberId);
    if (!member) return;
    currentQrMemberId = memberId;
    currentBarcodeType = '1D';
    generate1DBarcode(member.qrCode);
    generate2DQRCode(member.qrCode);
    show1D();
    document.getElementById('qrModal').classList.add('active');
  }

  function generate1DBarcode(code) {
    const svg = document.getElementById('barcodeImage');
    svg.innerHTML = '';
    try { JsBarcode(svg, code, { format:'CODE128', width:2, height:100, displayValue:true, fontSize:16, margin:10 }); } catch(e) {}
  }

  function generate2DQRCode(code) {
    const qrContainer = document.getElementById('qrCodeContainer');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, { text: code, width: 256, height: 256 });
  }

  function show1D() {
    currentBarcodeType = '1D';
    document.getElementById('barcode1DContainer').classList.remove('hidden');
    document.getElementById('barcode2DContainer').classList.add('hidden');
    document.getElementById('show1DBarcode').className = 'barcode-type-btn px-6 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-500 transition';
    document.getElementById('show2DBarcode').className = 'barcode-type-btn px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition';
  }

  function show2D() {
    currentBarcodeType = '2D';
    document.getElementById('barcode1DContainer').classList.add('hidden');
    document.getElementById('barcode2DContainer').classList.remove('hidden');
    document.getElementById('show2DBarcode').className = 'barcode-type-btn px-6 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-500 transition';
    document.getElementById('show1DBarcode').className = 'barcode-type-btn px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition';
  }

  function closeQrModal() { document.getElementById('qrModal').classList.remove('active'); currentQrMemberId = null; }

  function downloadBarcode() {
    if (currentBarcodeType === '1D') {
      const svg = document.getElementById('barcodeImage');
      const svgData = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([svgData], { type:'image/svg+xml;charset=utf-8' }));
      const link = document.createElement('a');
      link.download = `barcode-1D-${currentQrMemberId}.svg`; link.href = url; link.click();
      URL.revokeObjectURL(url);
      UIModule.showToast('1D Barcode downloaded!', 'success');
    } else {
      const canvas = document.querySelector('#qrCodeContainer canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `qr-code-2D-${currentQrMemberId}.png`; link.href = canvas.toDataURL('image/png'); link.click();
        UIModule.showToast('QR Code downloaded!', 'success');
      }
    }
  }

  function printBarcode() {
    const member = StorageModule.getMemberById(currentQrMemberId);
    if (!member) return;
    const printWindow = window.open('','_blank','noopener,noreferrer');
    let barcodeHTML = '';
    if (currentBarcodeType === '1D') {
      const svgData = new XMLSerializer().serializeToString(document.getElementById('barcodeImage'));
      barcodeHTML = `<div style="text-align:center">${svgData}</div>`;
    } else {
      const canvas = document.querySelector('#qrCodeContainer canvas');
      if (canvas) barcodeHTML = `<div style="text-align:center"><img src="${canvas.toDataURL('image/png')}" style="max-width:300px"></div>`;
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Barcode - ${member.name}</title><style>body{font-family:Arial,sans-serif;padding:20px;text-align:center}</style></head><body><h2>ShapeUp Gym - Member Barcode</h2><p><strong>${member.name}</strong></p><p>Membership: ${member.membershipType}</p><p>Expires: ${member.expiryDate}</p><hr style="margin:20px 0">${barcodeHTML}<p style="margin-top:20px;font-size:12px">Scan this code at the gym entrance</p></body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  }

  return { showQrCode, closeQrModal, downloadBarcode, printBarcode, show1D, show2D };
})();


