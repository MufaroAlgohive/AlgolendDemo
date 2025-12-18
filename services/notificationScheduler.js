/**
 * Notification Scheduler Service
 * Runs periodic checks to create notifications for payment due dates
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server-side operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials for notification scheduler');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Statuses that still allow the user to edit/delete their application
const EDIT_WINDOW_STATUSES = ['STARTED'];

/**
 * Check for upcoming payments and create notifications
 */
async function checkPaymentDueNotifications() {
  try {
    console.log('🔔 Checking for payment due notifications...');
    
    // Get all active loans
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id, user_id, monthly_payment, next_payment_date')
      .eq('status', 'active');
    
    if (loansError) throw loansError;
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    for (const loan of loans) {
      const dueDate = new Date(loan.next_payment_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
      
      // Check if we should send a notification
      // Send at 7 days, 3 days, and 1 day before due date
      if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1) {
        // Check if we already sent a notification for this loan and time period
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', loan.user_id)
          .eq('type', 'payment_due')
          .eq('metadata->>loan_id', loan.id.toString())
          .eq('metadata->>days_until_due', daysUntilDue.toString())
          .gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString()) // Created in last 24 hours
          .maybeSingle();
        
        if (!existingNotif) {
          // Create notification
          const title = daysUntilDue <= 3 ? '⚠️ Payment Due Soon' : 'Upcoming Payment';
          const message = `Payment of R${loan.monthly_payment.toLocaleString()} is due on ${dueDate.toLocaleDateString()}${daysUntilDue <= 3 ? ` (in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''})` : ''}`;
          
          await supabase
            .from('notifications')
            .insert([{
              user_id: loan.user_id,
              type: 'payment_due',
              title,
              message,
              metadata: {
                loan_id: loan.id,
                amount: loan.monthly_payment,
                due_date: loan.next_payment_date,
                days_until_due: daysUntilDue
              },
              is_read: false
            }]);
          
          console.log(`✅ Created payment due notification for loan ${loan.id} (${daysUntilDue} days)`);
        }
      }
    }
    
    console.log('✅ Payment due notification check completed');
  } catch (error) {
    console.error('❌ Error checking payment due notifications:', error);
  }
}

/**
 * Check for applications that are about to lose edit window
 */
async function checkEditWindowNotifications() {
  try {
    console.log('🔔 Checking for edit window notifications...');
    
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
    const oneHourAndFiftyMinutesAgo = new Date(now.getTime() - (110 * 60 * 1000)); // 1h 50m ago
    
    // Get applications created between 1h50m and 2h ago (10 minute notification window)
    const { data: applications, error: appsError } = await supabase
      .from('loan_applications')
      .select('id, user_id, amount, created_at')
      .in('status', EDIT_WINDOW_STATUSES)
      .gte('created_at', oneHourAndFiftyMinutesAgo.toISOString())
      .lt('created_at', twoHoursAgo.toISOString());
    
    if (appsError) throw appsError;
    
    for (const app of applications) {
      // Check if we already sent this notification
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', app.user_id)
        .eq('type', 'application_editable')
        .eq('metadata->>application_id', app.id.toString())
        .maybeSingle();
      
      if (!existingNotif) {
        await supabase
          .from('notifications')
          .insert([{
            user_id: app.user_id,
            type: 'application_editable',
            title: '⏰ Edit Window Closing Soon',
            message: `You have 10 minutes left to edit or delete your loan application.`,
            metadata: {
              application_id: app.id,
              minutes_remaining: 10
            },
            is_read: false
          }]);
        
        console.log(`✅ Created edit window notification for application ${app.id}`);
      }
    }
    
    console.log('✅ Edit window notification check completed');
  } catch (error) {
    console.error('❌ Error checking edit window notifications:', error);
  }
}

/**
 * Update next_payment_date for loans where the payment date has passed
 * This runs daily to keep payment schedules current
 */
async function updateLoanPaymentDates() {
  try {
    console.log('📅 Updating loan payment dates...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    // Find active loans where next_payment_date has passed
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('id, next_payment_date, term_months, created_at')
      .eq('status', 'active')
      .lt('next_payment_date', today.toISOString());
    
    if (loansError) throw loansError;
    
    if (!loans || loans.length === 0) {
      console.log('✅ No loan payment dates need updating');
      return;
    }
    
    console.log(`📋 Found ${loans.length} loan(s) with overdue payment dates`);
    
    for (const loan of loans) {
      const currentNextPayment = new Date(loan.next_payment_date);
      const newNextPayment = new Date(currentNextPayment);
      
      // Add one month to the current next_payment_date
      newNextPayment.setMonth(newNextPayment.getMonth() + 1);
      
      // Update the loan with new next_payment_date
      const { error: updateError } = await supabase
        .from('loans')
        .update({ 
          next_payment_date: newNextPayment.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', loan.id);
      
      if (updateError) {
        console.error(`❌ Failed to update loan ${loan.id}:`, updateError);
      } else {
        console.log(`✅ Updated loan ${loan.id}: ${currentNextPayment.toLocaleDateString()} → ${newNextPayment.toLocaleDateString()}`);
      }
    }
    
    console.log('✅ Loan payment dates updated');
  } catch (error) {
    console.error('❌ Error updating loan payment dates:', error);
  }
}

/**
 * Start the notification scheduler
 */
export function startNotificationScheduler() {
  console.log('🚀 Starting notification scheduler...');
  
  // Run immediately on startup
  checkPaymentDueNotifications();
  checkEditWindowNotifications();
  updateLoanPaymentDates();
  
  // Run payment due check every 6 hours
  setInterval(checkPaymentDueNotifications, 6 * 60 * 60 * 1000);
  
  // Run edit window check every 10 minutes
  setInterval(checkEditWindowNotifications, 10 * 60 * 1000);
  
  // Run payment date update daily at 2 AM (checks every hour, only updates once per day)
  setInterval(updateLoanPaymentDates, 60 * 60 * 1000); // Every hour
  
  console.log('✅ Notification scheduler started');
}

export default {
  startNotificationScheduler,
  checkPaymentDueNotifications,
  checkEditWindowNotifications,
  updateLoanPaymentDates
};
