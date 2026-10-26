/**
 * ELEVATE Phase 3B — Payment Service (Frontend)
 *
 * Handles:
 *  1. Creating a Razorpay order via our backend.
 *  2. Opening the Razorpay Standard Checkout modal.
 *  3. Sending the payment credentials back to our backend for verification.
 *
 * The Razorpay checkout script is loaded lazily on first use.
 * The Key Secret is NEVER on the frontend.
 */
import api from './api';

/**
 * Lazily loads the Razorpay checkout script from the CDN.
 * Resolves true if script loads successfully, false otherwise.
 * @returns {Promise<boolean>}
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const paymentService = {
  /**
   * Initiate a Razorpay payment for a given journey.
   *
   * @param {object} params
   * @param {string}   params.journeyId    — Journey UUID
   * @param {string}   params.journeyTitle — Display title for checkout modal
   * @param {string}   params.userEmail    — Pre-fill in checkout form
   * @param {string}   params.userName     — Pre-fill in checkout form
   * @param {Function} params.onSuccess    — Called with { journey_id } after enrollment
   * @param {Function} params.onFailure    — Called with error message string
   * @param {Function} params.onDismiss    — Called when user closes the modal without paying
   * @returns {Promise<void>}
   */
  async initiatePayment({ journeyId, journeyTitle, userEmail, userName, onSuccess, onFailure, onDismiss }) {
    // ── Step 1: Load Razorpay checkout script ──────────────────────────────
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      onFailure('Failed to load payment gateway. Please check your internet connection and try again.');
      return;
    }

    // ── Step 2: Create a Razorpay order on our backend ─────────────────────
    let orderData;
    try {
      const response = await api.post('/payments/create-order', { journey_id: journeyId });
      orderData = response.data;
    } catch (err) {
      onFailure(err.message || 'Failed to initialize payment. Please try again.');
      return;
    }

    // ── Step 3: Open Razorpay Standard Checkout modal ──────────────────────
    const options = {
      key:         orderData.key_id,
      amount:      orderData.amount,          // in paise
      currency:    orderData.currency,
      name:        'ELEVATE Platform',
      description: journeyTitle,
      order_id:    orderData.order_id,
      prefill: {
        name:  userName  || '',
        email: userEmail || '',
      },
      theme: {
        color: '#24389c',
      },
      modal: {
        ondismiss: () => {
          if (onDismiss) onDismiss();
        },
      },
      handler: async (response) => {
        // ── Step 4: Send payment credentials to our backend for verification ──
        try {
          await api.post('/payments/verify', {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          if (onSuccess) onSuccess({ journey_id: journeyId });
        } catch (err) {
          if (onFailure) onFailure(err.message || 'Payment verification failed. Contact support with your payment ID.');
        }
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', (response) => {
      const desc = response.error?.description || 'Payment failed. Please try again.';
      if (onFailure) onFailure(desc);
    });

    rzp.open();
  },
};

export default paymentService;
