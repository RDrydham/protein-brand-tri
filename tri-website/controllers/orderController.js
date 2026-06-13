const nodemailer = require('nodemailer');
const prisma = require('../config/db');

// Helper to create Nodemailer transporter
const getTransporter = async () => {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
  const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  if (SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  } else {
    // Ethereal mock mode fallback
    try {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    } catch (e) {
      console.warn('[Mailer Warning] Could not initialize Ethereal mail; writing logs locally.', e.message);
      return null;
    }
  }
};

// 1. PLACE A NEW ORDER
exports.createOrder = async (req, res) => {
  try {
    const { customerName, customerEmail, shippingAddress, items } = req.body;

    const userId = req.user ? req.user.id : null;
    let orderItemsData = [];
    let calculatedTotal = 0;

    // A. Authenticated User Order
    if (userId) {
      // Load cart items from database
      const dbCartItems = await prisma.cartItem.findMany({
        where: { userId: userId }
      });

      if (!dbCartItems || dbCartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Your cart is empty. Cannot place an order.'
        });
      }

      for (const item of dbCartItems) {
        orderItemsData.push({
          productName: item.productName,
          variant: item.variant,
          price: item.price,
          quantity: item.quantity
        });
        calculatedTotal += item.price * item.quantity;
      }
    } 
    // B. Guest User Order
    else {
      if (!customerName || !customerEmail || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, shipping address, and items are required for guest checkout.'
        });
      }

      for (const item of items) {
        if (!item.name || !item.price || !item.qty) continue;
        orderItemsData.push({
          productName: item.name.trim(),
          variant: item.variant ? item.variant.trim() : null,
          price: parseInt(item.price) || 0,
          quantity: parseInt(item.qty) || 1
        });
        calculatedTotal += (parseInt(item.price) || 0) * (parseInt(item.qty) || 1);
      }
    }

    if (orderItemsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found to create order.'
      });
    }

    // Create the order using a prisma transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          customerName: req.user ? req.user.name : customerName.trim(),
          customerEmail: req.user ? req.user.email : customerEmail.toLowerCase().trim(),
          shippingAddress: shippingAddress ? shippingAddress.trim() : 'Digital Delivery / Gym Pickup',
          totalAmount: calculatedTotal,
          status: 'pending',
          paymentStatus: 'unpaid'
        }
      });

      // 2. Create order items
      await Promise.all(
        orderItemsData.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              productName: item.productName,
              variant: item.variant,
              price: item.price,
              quantity: item.quantity
            }
          })
        )
      );

      return newOrder;
    });

    // Fetch order with items to return
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true }
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: finalOrder
    });
  } catch (error) {
    console.error('[Create Order Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error placing order.'
    });
  }
};

// 2. GET MY ORDERS (USER ONLY)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('[Get My Orders Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error retrieving order history.'
    });
  }
};

// 3. GET ORDER BY ID
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
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

    // Verify ownership of the order if user is authenticated
    if (order.userId && (!req.user || order.userId !== req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this order.'
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('[Get Order By Id Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching order.'
    });
  }
};

// 4. NODEMAILER EMAIL DISPATCH FOR ORDER CONFIRMATION
exports.sendOrderConfirmationEmail = async (order) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn('[Email System] Transporter not ready. Skipping confirmation email.');
      return false;
    }

    const isMock = transporter.options.host === 'smtp.ethereal.email';
    const sender = process.env.SMTP_FROM || '"TRI Performance" <leads@therealinside.com>';

    // Build items rows
    const itemRowsHTML = order.items.map(item => `
      <tr style="border-bottom: 1px solid #2c2c2e;">
        <td style="padding: 12px 0; color: #ffffff; font-size: 14px;">
          <strong>${item.productName}</strong><br>
          <span style="font-size: 11px; color: #a1a1a6;">${item.variant || 'Standard'}</span>
        </td>
        <td style="padding: 12px 0; color: #a1a1a6; font-size: 14px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 0; color: #ffffff; font-size: 14px; font-weight: 700; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your TRI Order Confirmed</title>
      </head>
      <body style="background-color: #0b0b0c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f7; margin: 0; padding: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0b0c; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #121214; border: 1px solid #1c1c1e; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.6);">
                <!-- Logo -->
                <tr>
                  <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid #1c1c1e;">
                    <span style="font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">△ TRI</span>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.45); margin-top: 4px;">Order Confirmed</div>
                  </td>
                </tr>
                
                <!-- Greeting -->
                <tr>
                  <td style="padding-top: 24px; padding-bottom: 16px;">
                    <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0;">Hey ${order.customerName},</h1>
                    <p style="font-size: 14px; color: #a1a1a6; line-height: 1.6; margin-top: 10px; margin-bottom: 20px;">
                      Your order has been verified and processed successfully! We are preparing your high-performance protocol package for dispatch.
                    </p>
                  </td>
                </tr>

                <!-- Order Details Box -->
                <tr>
                  <td style="background-color: #1c1c1e; border: 1px solid #2c2c2e; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 12px; color: #a1a1a6; padding-bottom: 8px;">Order Ref:</td>
                        <td style="font-size: 12px; color: #ffffff; font-weight: 700; text-align: right; padding-bottom: 8px;">#TRI-ORD-${order.id}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #a1a1a6; padding-bottom: 8px;">Payment Method:</td>
                        <td style="font-size: 12px; color: #ffffff; text-align: right; padding-bottom: 8px;">Razorpay Online</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #a1a1a6;">Delivery Address:</td>
                        <td style="font-size: 12px; color: #ffffff; text-align: right; width: 70%;">${order.shippingAddress}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Itemized Invoice Table -->
                <tr>
                  <td style="padding-top: 16px; padding-bottom: 16px;">
                    <h2 style="font-size: 15px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; border-left: 3px solid #e6a2a4; padding-left: 8px;">
                      Your Items
                    </h2>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                      <thead>
                        <tr style="border-bottom: 1px solid #2c2c2e;">
                          <th style="color: #a1a1a6; font-size: 12px; font-weight: 600; text-align: left; padding-bottom: 8px;">Item</th>
                          <th style="color: #a1a1a6; font-size: 12px; font-weight: 600; text-align: center; padding-bottom: 8px; width: 60px;">Qty</th>
                          <th style="color: #a1a1a6; font-size: 12px; font-weight: 600; text-align: right; padding-bottom: 8px; width: 80px;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemRowsHTML}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- Order Summary Totals -->
                <tr>
                  <td style="border-top: 1px solid #2c2c2e; padding-top: 16px; padding-bottom: 24px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 14px; color: #a1a1a6; padding-bottom: 6px;">Subtotal</td>
                        <td style="font-size: 14px; color: #ffffff; text-align: right; padding-bottom: 6px;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #a1a1a6; padding-bottom: 6px;">Shipping</td>
                        <td style="font-size: 14px; color: #22c55e; text-align: right; padding-bottom: 6px;">FREE</td>
                      </tr>
                      <tr style="border-top: 1px solid #1c1c1e;">
                        <td style="font-size: 16px; color: #ffffff; font-weight: 700; padding-top: 12px;">Total Paid</td>
                        <td style="font-size: 18px; color: #e6a2a4; font-weight: 800; text-align: right; padding-top: 12px;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="border-top: 1px solid #1c1c1e; padding-top: 24px;">
                    <p style="font-size: 12px; color: #a1a1a6; line-height: 1.5; margin-bottom: 18px;">
                      If you have any questions about this order, please reach out to our team at <strong>hello@atriwellness.com</strong>.
                    </p>
                    <p style="font-size: 11px; color: rgba(255,255,255,0.3); margin: 0;">
                      © 2026 THE REAL INSIDE. ISO/IEC 17025 Eurofins Certified.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailOptions = {
      from: sender,
      to: order.customerEmail,
      subject: `Your TRI Order Confirmed! — #TRI-ORD-${order.id}`,
      html: emailHTML
    };

    const info = await transporter.sendMail(mailOptions);
    if (isMock) {
      console.log(`[Order Email Mock Success] Confirmation sent. Link: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`[Order Email Success] Confirmation sent successfully: ${info.messageId}`);
    }
    return true;
  } catch (error) {
    console.error('[Order Email Dispatch Error]:', error.message);
    return false;
  }
};
