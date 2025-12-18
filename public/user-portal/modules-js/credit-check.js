// Credit Check Module JavaScript
console.log('✅ Credit check module script loaded');

let isProcessing = false;

// Module loading functions
window.loadCreditCheckModule = function() {
  console.log('🔓 Loading credit check module');
  const moduleContainer = document.getElementById('module-container');
  const moduleContent = document.getElementById('module-content');
  
  fetch('/user-portal/modules/credit-check.html')
    .then(response => response.text())
    .then(html => {
      moduleContent.innerHTML = html;
      moduleContainer.classList.remove('hidden');
      console.log('✅ Credit check module loaded');
      
      // Attach button listener after loading
      setTimeout(() => {
        attachButtonListener();
        checkExistingCreditCheck();
      }, 100);
    })
    .catch(error => {
      console.error('❌ Error loading credit check module:', error);
      alert('Failed to load credit check form. Please try again.');
    });
};

window.closeModule = function() {
  console.log('🔒 Closing credit check module');
  const moduleContainer = document.getElementById('module-container');
  moduleContainer.classList.add('hidden');
  resetForm();
};

// Navigation function
window.goToStep = function(step) {
  const pages = {
    1: 'apply-loan',
    2: 'apply-loan-2',
    3: 'apply-loan-3',
    4: 'confirmation'
  };
  
  if (typeof loadPage === 'function') {
    loadPage(pages[step]);
  } else {
    window.location.href = `/user-portal/?page=${pages[step]}`;
  }
};

// Continue to loan selection
window.continueToLoanSelection = function() {
  closeModule();
  if (typeof loadPage === 'function') {
    loadPage('apply-loan-3');
  } else {
    window.location.href = '/user-portal/?page=apply-loan-3';
  }
};

// Attach button listener
function attachButtonListener() {
  const button = document.getElementById('run-credit-check-btn');
  if (button) {
    button.onclick = runCreditCheck;
    console.log('✅ Credit check button listener attached');
  } else {
    console.error('❌ Button not found');
  }
}

// Check if user already has a credit check
async function checkExistingCreditCheck() {
  try {
    const { supabase } = await import('/Services/supabaseClient.js');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⚠️ No session found');
      return;
    }
    
    // Check session storage first
    const creditCheckPassed = sessionStorage.getItem('creditCheckPassed');
    const creditScore = sessionStorage.getItem('creditScore');
    
    // Check database for existing credit checks
    const applicationId = sessionStorage.getItem('currentApplicationId');
    let hasExistingCheck = false;
    let existingScore = null;
    
    const { data: creditChecks, error: creditCheckError } = await supabase
      .from('credit_checks')
      .select('credit_score, status, checked_at, application_id')
      .eq('user_id', session.user.id)
      .eq('status', 'completed')
      .order('checked_at', { ascending: false })
      .limit(1);
    
    if (!creditCheckError && creditChecks && creditChecks.length > 0) {
      hasExistingCheck = true;
      existingScore = creditChecks[0].credit_score;
      if (creditChecks[0].application_id) {
        sessionStorage.setItem('currentApplicationId', creditChecks[0].application_id);
      }
    }
    
    if (!hasExistingCheck) {
      if (applicationId) {
        const { data: app, error } = await supabase
          .from('loan_applications')
          .select('bureau_score_band, status')
          .eq('id', applicationId)
          .single();
        
        if (!error && app && (app.status === 'BUREAU_OK' || app.status === 'APPROVED') && app.bureau_score_band) {
          hasExistingCheck = true;
          existingScore = app.bureau_score_band;
        }
      } else {
        // Check if user has any recent credit checks tied to applications
        const { data: recentApps, error } = await supabase
          .from('loan_applications')
          .select('bureau_score_band, status, created_at')
          .eq('user_id', session.user.id)
          .in('status', ['BUREAU_OK', 'APPROVED'])
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!error && recentApps && recentApps.length > 0 && recentApps[0].bureau_score_band) {
          hasExistingCheck = true;
          existingScore = recentApps[0].bureau_score_band;
        }
      }
    }
    
    // Disable button if credit check exists
    if (hasExistingCheck || creditCheckPassed === 'true') {
      const button = document.getElementById('run-credit-check-btn');
      const formContent = document.getElementById('credit-form-content');
      const resultSection = document.getElementById('credit-result');
      const continueBtn = document.getElementById('continue-btn');
      
      if (button) {
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.innerHTML = '<i class="fas fa-check-circle"></i> Credit Check Already Completed';
        button.onclick = null;
      }
      
      // Show existing result
      if (formContent && resultSection) {
        formContent.style.display = 'none';
        resultSection.style.display = 'block';
        
        const scoreValue = existingScore || creditScore || '---';
        document.getElementById('credit-score-value').textContent = typeof scoreValue === 'number'
          ? `Score: ${scoreValue}`
          : scoreValue;
        
        if (continueBtn) {
          continueBtn.style.display = 'inline-block';
        }
      }
      
      console.log('✅ Existing credit check found - button disabled');
    }
  } catch (error) {
    console.error('❌ Error checking existing credit check:', error);
  }
}

// Download ZIP file containing credit report
function downloadZipFile(base64Data, applicationId) {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/zip' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-report-${applicationId}.zip`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log('📥 Credit report ZIP downloaded');
  } catch (error) {
    console.error('❌ Error downloading ZIP:', error);
  }
}

// Reset form to initial state
function resetForm() {
  document.getElementById('credit-form-content').style.display = 'block';
  document.getElementById('credit-loading').style.display = 'none';
  document.getElementById('credit-result').style.display = 'none';
  document.getElementById('run-credit-check-btn').style.display = 'inline-block';
  document.getElementById('continue-btn').style.display = 'none';
  isProcessing = false;
}

// Main credit check function
async function runCreditCheck() {
  console.log('🚀 Credit check button clicked!');
  
  if (isProcessing) {
    console.log('⏳ Already processing...');
    return;
  }
  
  const button = document.getElementById('run-credit-check-btn');
  
  try {
    // Import modules dynamically
    const { performCreditCheck } = await import('/Services/dataService.js');
    const { supabase } = await import('/Services/supabaseClient.js');
    
    isProcessing = true;
    button.disabled = true;
    button.style.opacity = '0.6';
    
    // Get form values
    const identity_number = document.getElementById('identity_number').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const forename = document.getElementById('forename').value.trim();
    const gender = document.getElementById('gender').value;
    const date_of_birth = document.getElementById('date_of_birth').value;
    const address1 = document.getElementById('address1').value.trim();
    const address2 = document.getElementById('address2').value.trim();
    const postal_code = document.getElementById('postal_code').value.trim();
    const cell_tel_no = document.getElementById('cell_tel_no').value.trim();
    const credit_consent = document.getElementById('credit_consent').checked;
    
    console.log('📋 Form values collected');
    
    // Validation
    if (!identity_number || !surname || !forename || !gender || !date_of_birth || !address1 || !postal_code) {
      alert('⚠️ Please fill in all required fields marked with *');
      isProcessing = false;
      button.disabled = false;
      button.style.opacity = '1';
      return;
    }
    
    if (!credit_consent) {
      alert('⚠️ Please consent to the credit check to continue');
      isProcessing = false;
      button.disabled = false;
      button.style.opacity = '1';
      return;
    }
    
    if (identity_number.length !== 13) {
      alert('⚠️ ID number must be 13 digits');
      isProcessing = false;
      button.disabled = false;
      button.style.opacity = '1';
      return;
    }
    
    if (postal_code.length !== 4) {
      alert('⚠️ Postal code must be 4 digits');
      isProcessing = false;
      button.disabled = false;
      button.style.opacity = '1';
      return;
    }
    
    console.log('✅ Validation passed');
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('⚠️ Please log in to continue');
      isProcessing = false;
      button.disabled = false;
      button.style.opacity = '1';
      return;
    }
    
    console.log('✅ User authenticated');
    
    // Get or create application ID
    let applicationId = sessionStorage.getItem('currentApplicationId');
    if (!applicationId) {
      console.log('📝 Creating new application...');
      const { data: newApp, error: appError } = await supabase
        .from('loan_applications')
        .insert([{
          user_id: session.user.id,
          status: 'BUREAU_CHECKING',
          amount: 0,
          term_months: 0,
          purpose: 'Personal Loan'
        }])
        .select()
        .single();
      
      if (appError) {
        console.error('❌ Error creating application:', appError);
        alert('❌ Failed to create application. Please try again.');
        isProcessing = false;
        button.disabled = false;
        button.style.opacity = '1';
        return;
      }
      
      applicationId = newApp.id;
      sessionStorage.setItem('currentApplicationId', applicationId);
      console.log('✅ Application created:', applicationId);
    } else {
      // Update existing application status
      await supabase
        .from('loan_applications')
        .update({ status: 'BUREAU_CHECKING' })
        .eq('id', applicationId);
      console.log('✅ Application updated:', applicationId);
    }
    
    // Format date
    const dob_formatted = date_of_birth.replace(/-/g, '');
    
    // Prepare user data
    const userData = {
      user_id: session.user.id,
      identity_number,
      surname,
      forename,
      forename2: '',
      forename3: '',
      gender,
      date_of_birth: dob_formatted,
      address1,
      address2,
      address3: '',
      address4: '',
      postal_code,
      home_tel_code: '',
      home_tel_no: '',
      work_tel_code: '',
      work_tel_no: '',
      cell_tel_no,
      passport_flag: 'N'
    };
    
    console.log('📋 User data prepared:', userData);
    
    // Show loading state
    document.getElementById('credit-form-content').style.display = 'none';
    document.getElementById('credit-loading').style.display = 'block';
    button.style.display = 'none';
    
    console.log('🔄 Calling credit check API...');
    
    // Perform credit check
    const result = await performCreditCheck(applicationId, userData);
    
    console.log('✅ Credit check result:', result);
    
    if (result.success) {
      // Extract credit data from result
      const creditData = result.creditScore || {};
      const score = creditData.score || 0;
      const riskType = creditData.riskType || 'UNKNOWN';
      
      // Update application with detailed credit info
      await supabase
        .from('loan_applications')
        .update({
          bureau_score_band: score,
          status: 'BUREAU_OK'
        })
        .eq('id', applicationId);
      
      // Store result in sessionStorage
      sessionStorage.setItem('creditScore', score.toString());
      sessionStorage.setItem('creditRiskType', riskType);
      sessionStorage.setItem('creditCheckPassed', 'true');
      sessionStorage.setItem('creditData', JSON.stringify(creditData));
      
      // Download ZIP file if available
      if (result.zipData) {
        downloadZipFile(result.zipData, applicationId);
      }
      
      // Show result with detailed information
      document.getElementById('credit-loading').style.display = 'none';
      document.getElementById('credit-result').style.display = 'block';
      document.getElementById('credit-score-value').textContent = `Score: ${score} | Risk: ${riskType}`;
      document.getElementById('continue-btn').style.display = 'inline-block';
      
      console.log('✅ Credit check successful!');
      console.log('📊 Credit Data:', creditData);
    } else {
      // Failed
      await supabase
        .from('loan_applications')
        .update({ status: 'BUREAU_DECLINE' })
        .eq('id', applicationId);
      
      document.getElementById('credit-loading').style.display = 'none';
      alert('❌ Credit check failed: ' + (result.error || 'Unknown error'));
      resetForm();
      
      console.error('❌ Credit check failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Credit check error:', error);
    document.getElementById('credit-loading').style.display = 'none';
    alert('❌ An error occurred: ' + error.message);
    resetForm();
  }
}
