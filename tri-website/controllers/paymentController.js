const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/db');

// Initialize Razorpay SDK (fall back to mock in dev if keys are missing)
let razorpay = null;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } else {
    console.warn('[Razorpay] Key credentials missing in .env. Running in Mock Mode.');
  }
} catch (error) {
  console.error('[Razorpay Initialization Error]:', error.message);
}

// 1. CREATE PAYMENT ORDER
exports.createPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required.'
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    // Verify ownership of the order if authenticated
    if (order.userId && order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this order.'
      });
    }

    // If order is already paid, no need to recreate
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This order is already paid.'
      });
    }

    const amountInPaise = order.totalAmount * 100; // Razorpay expects amount in paise

    // Mock Mode fallback
    if (!razorpay) {
      const mockOrderId = `order_mock_${Date.now()}`;
      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: mockOrderId }
      });

      return res.status(200).json({
        success: true,
        mock: true,
        keyId: 'mock_key_id',
        order: {
          id: mockOrderId,
          amount: amountInPaise,
          currency: 'INR'
        }
      });
    }

    // Call Razorpay API to create order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_order_${order.id}`,
      payment_capture: 1
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Save Razorpay Order ID to database order
    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id }
    });

    return res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });
  } catch (error) {
    console.error('[Create Payment Order Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment order.'
    });
  }
};

// 2. VERIFY PAYMENT SIGNATURE
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification parameters are missing.'
      });
    }

    // Find the order in our database
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order matching this payment reference was not found.'
      });
    }

    let isVerified = false;

    // Handle Mock Verification
    if (mock || !razorpay) {
      isVerified = razorpay_order_id.startsWith('order_mock_');
    } else {
      // Standard Cryptographic HMAC-SHA256 validation
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      isVerified = expectedSignature === razorpay_signature;
    }

    if (isVerified) {
      // 1. Update order status to paid
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'paid',
          status: 'paid',
          razorpayPaymentId: razorpay_payment_id
        }
      });

      // 2. Clear user cart since checkout succeeded
      if (order.userId) {
        await prisma.cartItem.deleteMany({
          where: { userId: order.userId }
        });
      }

      // We will require and invoke the mailer system asynchronously to send confirmation
      try {
        const { sendOrderConfirmationEmail } = require('./orderController');
        // Retrieve full order with items for details
        const fullOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true }
        });
        sendOrderConfirmationEmail(fullOrder).catch(err => 
          console.error('[Nodemailer async error]:', err.message)
        );
      } catch (mailImportErr) {
        console.error('[Mailer Import Error]:', mailImportErr.message);
      }
      
      return res.status(200).json({
        success: true,
        message: 'Payment verified and order completed successfully.'
      });
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'failed' }
      });

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }
  } catch (error) {
    console.error('[Verify Payment Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment.'
    });
  }
};
