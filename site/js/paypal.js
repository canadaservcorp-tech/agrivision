// ═══ PayPal Subscription Integration ═══
// TODO: Replace plan IDs with your actual PayPal subscription plan IDs
const PAYPAL_PLANS = {
  starter: 'P-STARTER_PLAN_ID',
  professional: 'P-PROFESSIONAL_PLAN_ID'
};

function initPayPalButtons() {
  if (typeof paypal === 'undefined') return;
  ['starter','professional'].forEach(plan => {
    const container = document.getElementById(`paypal-${plan}`);
    if (!container) return;
    try {
      paypal.Buttons({
        style: { shape:'rect', color:'gold', layout:'vertical', label:'subscribe' },
        createSubscription: (data, actions) => actions.subscription.create({ plan_id: PAYPAL_PLANS[plan] }),
        onApprove: async (data) => {
          const user = auth.currentUser;
          if (user) {
            await db.collection('users').doc(user.uid).update({
              plan: plan, subscriptionId: data.subscriptionID,
              subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('payments').add({
              userId: user.uid, plan: plan, subscriptionId: data.subscriptionID,
              status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          }
          alert('Subscription activated! Welcome to Agrivision ' + plan + ' plan.');
        },
        onError: (err) => console.error('PayPal error:', err)
      }).render(`#paypal-${plan}`);
    } catch(e) { console.warn('PayPal button render skipped for', plan); }
  });
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(initPayPalButtons, 1000); });
