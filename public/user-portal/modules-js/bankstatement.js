import { getDocumentInfoByUser } from '/user-portal/Services/documentService.js';
import { supabase } from '/Services/supabaseClient.js';

async function initBankStatementModule() {
  const form = document.getElementById('bankstatementForm');
  const status = document.getElementById('uploadStatus');
  const uploadBtn = document.getElementById('bankstatementUploadBtn');
  const fileInput = document.getElementById('bankstatementFile');
  const checkmark = document.getElementById('bankstatementCheckmark');
  const existingInfo = document.getElementById('existingFileInfo');
  const statusChip = document.getElementById('bankstatementStatusChip');
  const selectedFileDisplay = document.getElementById('bankstatementSelectedFile');

  if (!form || !status || !uploadBtn || !fileInput) {
    console.warn('⚠️ Bank statement module DOM not ready');
    return;
  }

  if (form.dataset.bound === 'true') {
    return;
  }
  form.dataset.bound = 'true';

  const applicationId = sessionStorage.getItem('currentApplicationId') || sessionStorage.getItem('lastApplicationId');
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  const authToken = session?.access_token;

  if (!userId || !authToken) {
    console.warn('⚠️ User not logged in');
    status.textContent = '⚠️ Please log in first';
    status.style.color = '#ff9800';
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Please Log In';
    return;
  }

  console.log('✅ Ready to upload bank statement', { applicationId: applicationId || 'none', userId });

  // Display selected file name
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && selectedFileDisplay) {
      const fileSize = (file.size / 1024).toFixed(1);
      selectedFileDisplay.innerHTML = `<i class="fas fa-file"></i> <strong>${file.name}</strong> <span>(${fileSize} KB)</span>`;
      selectedFileDisplay.style.display = 'block';
    }
  });

  await hydrateExistingDocument();

  async function hydrateExistingDocument() {
    const docInfo = await getDocumentInfoByUser(userId, 'bank_statement');
    if (!docInfo) {
      if (statusChip) {
        statusChip.textContent = 'Pending';
        statusChip.classList.remove('success');
      }
      return;
    }

    if (checkmark) checkmark.classList.add('visible');
    uploadBtn.disabled = true;
    uploadBtn.style.opacity = '0.5';
    uploadBtn.style.cursor = 'not-allowed';
    uploadBtn.textContent = 'Already Uploaded ✓';
    fileInput.disabled = true;

    if (statusChip) {
      statusChip.textContent = 'Uploaded';
      statusChip.classList.add('success');
    }

    if (existingInfo) {
      existingInfo.style.color = '#1f8c5c';
      const uploadDate = new Date(docInfo.uploaded_at || docInfo.created_at || Date.now()).toLocaleDateString();
      existingInfo.innerHTML = `✅ File uploaded: <b>${docInfo.file_name}</b> on ${uploadDate}`;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      status.textContent = 'Please select a file first.';
      status.style.color = '#ff9800';
      return;
    }

    console.log('📁 Bank statement selected', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)}KB`,
      type: file.type,
    });

    const formData = new FormData();
    formData.append('file', file);
    if (applicationId) {
      formData.append('applicationId', applicationId);
    }

    status.textContent = 'Uploading... ⏳';
    status.style.color = '';
    uploadBtn.disabled = true;

    try {
      const res = await fetch('/api/bankstatement/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        status.innerHTML = `✅ Bank statement uploaded successfully!<br><small><b>${data.filename}</b> received.</small>`;
        status.style.color = '#28a745';
        if (checkmark) checkmark.classList.add('visible');
        uploadBtn.style.opacity = '0.5';
        uploadBtn.style.cursor = 'not-allowed';
        uploadBtn.textContent = 'Already Uploaded ✓';
        fileInput.disabled = true;
        if (statusChip) {
          statusChip.textContent = 'Uploaded';
          statusChip.classList.add('success');
        }

        if (existingInfo) {
          const uploadDate = new Date(data.uploadedAt || Date.now()).toLocaleDateString();
          existingInfo.innerHTML = `✅ File uploaded: <b>${data.filename}</b> on ${uploadDate}`;
          existingInfo.style.color = '#1f8c5c';
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('document:uploaded', { detail: { fileType: 'bank_statement' } }));
        }
      } else {
        console.error('❌ Upload failed', data);
        status.textContent = `❌ Upload failed: ${data.message || data.error}`;
        status.style.color = '#dc3545';
        uploadBtn.disabled = false;
        if (statusChip) {
          statusChip.textContent = 'Pending';
          statusChip.classList.remove('success');
        }
      }
    } catch (err) {
      console.error('⚠️ Network or parsing error', err);
      status.textContent = '⚠️ Something went wrong during upload.';
      status.style.color = '#ff9800';
      uploadBtn.disabled = false;
      if (statusChip) {
        statusChip.textContent = 'Pending';
        statusChip.classList.remove('success');
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBankStatementModule, { once: true });
} else {
  initBankStatementModule();
}
