// Support page JS

function toggleFAQ(element) {
  const faqItem = element.parentElement;
  const wasActive = faqItem.classList.contains('active');
  
  // Close all FAQ items
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Toggle current item
  if (!wasActive) {
    faqItem.classList.add('active');
  }
}

function openLiveChat() {
  if (typeof showToast === 'function') {
    showToast('Coming Soon', 'Live chat feature coming soon! Please use email or phone support for now.', 'info', 3000);
  } else {
    alert('Live chat feature coming soon! Please use email or phone support for now.');
  }
}

function openResource(type) {
  const resourceNames = {
    'user-guide': 'User Guide',
    'terms': 'Terms & Conditions',
    'privacy': 'Privacy Policy',
    'complaints': 'Complaints Procedure'
  };
  
  const name = resourceNames[type] || type;
  
  if (typeof showToast === 'function') {
    showToast('Coming Soon', `${name} document will be available soon.`, 'info', 3000);
  } else {
    alert(`${name} document will be available soon.`);
  }
  
  return false;
}

function submitSupportRequest(event) {
  event.preventDefault();
  const fallbackEmail = (window.SUPPORT_EMAIL || 'support@example.com').trim();
  const subject = document.getElementById('supportSubject').value;
  const message = document.getElementById('supportMessage').value;
  
  // Create mailto link
  const mailtoLink = `mailto:${fallbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  window.open(mailtoLink);
  
  // Clear form
  document.getElementById('supportSubject').value = '';
  document.getElementById('supportMessage').value = '';
  
  // Show success message
  if (typeof showToast === 'function') {
    showToast('Email Opening', 'Your email client will open. Please send the message.', 'success', 3000);
  }
}

// Make functions globally accessible
window.toggleFAQ = toggleFAQ;
window.openLiveChat = openLiveChat;
window.openResource = openResource;
window.submitSupportRequest = submitSupportRequest;

console.log('✅ Support page functions loaded');
