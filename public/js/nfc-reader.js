// NFC Reader Module - Provides NFC reading functionality
// Uses Web NFC API (Chrome for Android primarily)

let nfcResolve = null;
let nfcReject = null;

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createModal() {
  const existing = document.getElementById('nfc-reader-modal');
  if (existing) return existing;
  
  const modal = document.createElement('div');
  modal.id = 'nfc-reader-modal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="card" style="max-width:320px;position:relative">
      <button class="ghost" id="nfc-close" style="
        position:absolute;top:8px;right:8px;
        width:32px;height:32px;
        border-radius:50%;
        background:var(--impostor);
        color:#fff;
        font-weight:800;
        padding:0;
        line-height:32px;
      ">✕</button>
      <h3 style="margin-right:40px">📱 Lector NFC</h3>
      <p id="nfc-status" style="font-size:0.9rem;margin:10px 0">Presiona el botón para iniciar la lectura...</p>
      <div id="nfc-result" style="margin:10px 0;display:none">
        <p style="font-size:0.8rem;color:var(--muted)">Contenido leído:</p>
        <pre id="nfc-content" style="
          background:var(--bg);
          padding:12px;
          border-radius:8px;
          font-size:0.75rem;
          max-height:80px;
          overflow:auto;
          word-break:break-all;
        "></pre>
      </div>
      <button class="good" id="nfc-start-btn" style="width:100%;margin-top:10px">Iniciar lectura NFC</button>
    </div>
  `;
  document.body.appendChild(modal);
  setupListeners();
  return modal;
}

function setupListeners() {
  const modal = document.getElementById('nfc-reader-modal');
  const closeBtn = document.getElementById('nfc-close');
  const startBtn = document.getElementById('nfc-start-btn');
  
  closeBtn?.addEventListener('click', () => {
    hideModal();
    if (nfcReject) nfcReject(new Error('Cancelled'));
  });
  
  startBtn?.addEventListener('click', async () => {
    const status = document.getElementById('nfc-status');
    const contentEl = document.getElementById('nfc-content');
    const result = document.getElementById('nfc-result');
    
    if ('NDEFReader' in window) {
      try {
        status.textContent = 'Esperando NFC... Acércate la etiqueta.';
        status.style.color = 'var(--warn)';
        
        const reader = new window.NDEFReader();
        await reader.scan();
        
        reader.onreading = (event) => {
          const decoder = new TextDecoder();
          const nfcData = {
            serialNumber: event.serialNumber,
            message: event.message
          };
          
          for (const record of event.message.records) {
            nfcData.content = decoder.decode(record.data);
          }
          
          contentEl.textContent = nfcData.content || nfcData.serialNumber || 'Sin contenido';
          result.style.display = 'block';
          status.textContent = '¡Lectura completada!';
          status.style.color = 'var(--good)';
          
          if (nfcResolve) nfcResolve(nfcData);
          
          setTimeout(() => hideModal(), 1500);
        };
        
        reader.onerror = (error) => {
          status.textContent = 'Error: ' + error.message;
          status.style.color = 'var(--impostor)';
        };
      } catch (error) {
        status.textContent = 'Error: ' + error.message;
        status.style.color = 'var(--impostor)';
        if (nfcReject) nfcReject(error);
      }
    } else {
      status.innerHTML = 'NFC no soportado en este navegador.<br>Usa Chrome en Android.';
      status.style.color = 'var(--impostor)';
      if (nfcReject) nfcReject(new Error('Web NFC not supported'));
    }
  });
}

function hideModal() {
  document.getElementById('nfc-reader-modal')?.classList.add('hidden');
}

export function startNFCRead() {
  return new Promise((resolve, reject) => {
    nfcResolve = resolve;
    nfcReject = reject;
    createModal().classList.remove('hidden');
    document.getElementById('nfc-status').textContent = 'Presiona el botón para iniciar la lectura...';
    document.getElementById('nfc-result').style.display = 'none';
  });
}

export function readNFCContent(prompt = 'Acerca una etiqueta NFC') {
  return startNFCRead();
}

// Check if NFC is available
export function isNFCSupported() {
  return 'NDEFReader' in window;
}