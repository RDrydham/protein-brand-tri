// =============================================================
// orderController.js — TRI The Real Inside
// Fixes applied:
//   1. sendAdminOrderNotification() — admin email on every order
//   2. sendOrderConfirmationEmail() — tracking message added
//   3. cancelOrder() — cancel with dual email notifications
//   4. getMyOrders() — also fetches by email for extra safety
// =============================================================

const nodemailer = require('nodemailer');
const prisma = require('../config/db');

// ── Helper: Create Nodemailer transporter ──────────────────────────────────
const getTransporter = async () => {
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
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
    // Ethereal mock fallback if no credentials set
    try {
      const testAccount = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    } catch (e) {
      console.warn('[Mailer Warning] Could not initialize mail transporter:', e.message);
      return null;
    }
  }
};

// ── Helper: Build item rows for email HTML ─────────────────────────────────
const buildItemRowsHTML = (items) =>
  items.map(item => `
    <tr style="border-bottom:1px solid #2c2c2e;">
      <td style="padding:12px 0;color:#ffffff;font-size:14px;">
        <strong>${item.productName}</strong><br>
        <span style="font-size:11px;color:#a1a1a6;">${item.variant || 'Standard'}</span>
      </td>
      <td style="padding:12px 0;color:#a1a1a6;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 0;color:#ffffff;font-size:14px;font-weight:700;text-align:right;">
        ₹${(item.price * item.quantity).toLocaleString('en-IN')}
      </td>
    </tr>
  `).join('');


// =============================================================
// 1. CREATE ORDER (used by /api/orders/create)
// =============================================================
exports.createOrder = async (req, res) => {
  try {
    const { customerName, customerEmail, shippingAddress, items, couponCode, paymentMethod } = req.body;

    const userId = req.user ? req.user.id : null;
    let orderItemsData = [];
    let calculatedTotal = 0;

    // A. Authenticated User Order
    if (userId) {
      const dbCartItems = await prisma.cartItem.findMany({ where: { userId } });

      if (dbCartItems && dbCartItems.length > 0) {
        // Use DB-synced cart
        for (const item of dbCartItems) {
          const dbProduct = await prisma.product.findFirst({ where: { name: item.productName.trim() } });
          const priceVal = dbProduct ? dbProduct.price : item.price;
          orderItemsData.push({ productName: item.productName, variant: item.variant, price: priceVal, quantity: item.quantity });
          calculatedTotal += priceVal * item.quantity;
        }
      } else {
        // FALLBACK: DB cart empty — use items from request body (localStorage cart), verify price from DB
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ success: false, message: 'Your cart is empty. Please add products and try again.' });
        }
        for (const item of items) {
          const name = item.productName || item.name;
          if (!name) continue;
          const dbProduct = await prisma.product.findFirst({ where: { name: name.trim() } });
          if (!dbProduct) return res.status(400).json({ success: false, message: `Product "${name}" not found.` });
          const priceVal = dbProduct.price;
          const qtyVal = parseInt(item.quantity || item.qty) || 1;
          orderItemsData.push({ productName: dbProduct.name, variant: item.variant ? item.variant.trim() : null, price: priceVal, quantity: qtyVal });
          calculatedTotal += priceVal * qtyVal;
        }
      }
    }
    // B. Guest User Order
    else {
      if (!customerName || !customerEmail || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Name, email, shipping address, and items are required for guest checkout.' });
      }
      for (const item of items) {
        const name = item.productName || item.name;
        if (!name) continue;
        const dbProduct = await prisma.product.findFirst({ where: { name: name.trim() } });
        if (!dbProduct) {
          return res.status(400).json({ success: false, message: `Product "${name}" not found in database.` });
        }
        const priceVal = dbProduct.price;
        const qtyVal = parseInt(item.quantity || item.qty) || 1;
        orderItemsData.push({ productName: dbProduct.name, variant: item.variant ? item.variant.trim() : null, price: priceVal, quantity: qtyVal });
        calculatedTotal += priceVal * qtyVal;
      }
    }

    if (orderItemsData.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items found to create order.' });
    }

    // Coupon Validation
    let discountAmount = 0;
    let couponRecord = null;
    if (couponCode) {
      const codeStr = couponCode.trim().toUpperCase();
      couponRecord = await prisma.coupon.findUnique({ where: { code: codeStr } });
      if (!couponRecord) return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
      if (!couponRecord.isActive) return res.status(400).json({ success: false, message: 'This coupon is no longer active.' });
      if (couponRecord.expiryDate && new Date(couponRecord.expiryDate) < new Date()) return res.status(400).json({ success: false, message: 'This coupon has expired.' });
      if (couponRecord.maxUses !== null && couponRecord.usedCount >= couponRecord.maxUses) return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
      if (couponRecord.discountType === 'percentage') discountAmount = Math.round((calculatedTotal * couponRecord.value) / 100);
      else if (couponRecord.discountType === 'flat') discountAmount = couponRecord.value;
      discountAmount = Math.min(discountAmount, calculatedTotal);
    }

    const isCod = paymentMethod && paymentMethod.toLowerCase() === 'cod';
    const codFee = isCod ? 50 : 0;
    const finalTotal = calculatedTotal - discountAmount + codFee;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          customerName: req.user ? req.user.name : customerName.trim(),
          customerEmail: req.user ? req.user.email : customerEmail.toLowerCase().trim(),
          shippingAddress: shippingAddress ? shippingAddress.trim() : 'Digital Delivery / Gym Pickup',
          totalAmount: finalTotal,
          status: 'pending',
          paymentStatus: 'unpaid',
          paymentMethod: isCod ? 'cod' : 'razorpay',
          codFee,
          couponCode: couponRecord ? couponRecord.code : null,
          discountAmount: discountAmount > 0 ? discountAmount : null
        }
      });
      await Promise.all(orderItemsData.map(item => tx.orderItem.create({ data: { orderId: newOrder.id, productName: item.productName, variant: item.variant, price: item.price, quantity: item.quantity } })));
      if (couponRecord) await tx.coupon.update({ where: { id: couponRecord.id }, data: { usedCount: { increment: 1 } } });
      if (isCod && userId) await tx.cartItem.deleteMany({ where: { userId } });
      return newOrder;
    });

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });

    if (isCod) {
      // Send customer + admin emails for COD
      exports.sendOrderConfirmationEmail(finalOrder).catch(err => console.error('[Email COD Customer]:', err.message));
      exports.sendAdminOrderNotification(finalOrder).catch(err => console.error('[Email COD Admin]:', err.message));
    }

    return res.status(201).json({ success: true, message: 'Order created successfully.', order: finalOrder });
  } catch (error) {
    console.error('[Create Order Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error placing order.' });
  }
};


// =============================================================
// 2. GET MY ORDERS — by userId + also match by email as fallback
// =============================================================
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Primary: get orders linked to userId
    // Also catch any unlinked orders sharing the same email (safety net)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: userId },
          { customerEmail: userEmail, userId: null }
        ]
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    // Silently link any unlinked email-matched orders to this user
    const unlinked = orders.filter(o => o.userId === null);
    if (unlinked.length > 0) {
      await prisma.order.updateMany({
        where: { customerEmail: userEmail, userId: null },
        data: { userId: userId }
      });
    }

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('[Get My Orders Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error retrieving order history.' });
  }
};


// =============================================================
// 3. GET ORDER BY ID
// =============================================================
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) }, include: { items: true } });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required to view order details.' });
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this order.' });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('[Get Order By Id Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error fetching order.' });
  }
};


// =============================================================
// 4. CANCEL ORDER — only for pending/processing/on-hold
// =============================================================
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) }, include: { items: true } });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Authorization: must own the order or be admin
    if (req.user.role !== 'admin' && order.userId !== userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this order.' });
    }

    // Only allow cancellation for these statuses
    const cancellableStatuses = ['pending', 'processing', 'on-hold'];
    if (!cancellableStatuses.includes(order.status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled. Current status: "${order.status}". Only pending, processing, or on-hold orders can be cancelled.`
      });
    }

    // Update status to cancelled
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'cancelled' }
    });

    const cancelledOrder = { ...order, status: 'cancelled' };

    // Send cancellation emails to customer + admin
    exports.sendCancellationEmailCustomer(cancelledOrder).catch(err => console.error('[Cancel Email Customer]:', err.message));
    exports.sendCancellationEmailAdmin(cancelledOrder).catch(err => console.error('[Cancel Email Admin]:', err.message));

    return res.status(200).json({ success: true, message: 'Order has been cancelled successfully.' });
  } catch (error) {
    console.error('[Cancel Order Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error cancelling order.' });
  }
};


// =============================================================
// 5. PLACE ORDER — called by checkout.html
// =============================================================
exports.placeOrder = async (req, res) => {
  try {
    const { address, notes, couponCode, paymentMethod } = req.body;
    const userId = req.user ? req.user.id : null;

    let orderItemsData = [];
    let calculatedTotal = 0;
    let customerName = '';
    let customerEmail = '';

    // A. Authenticated User Checkout
    if (userId) {
      customerName = req.user.name;
      customerEmail = req.user.email;

      // PRIMARY: Try loading items from the database cart
      const dbCartItems = await prisma.cartItem.findMany({ where: { userId } });

      if (dbCartItems && dbCartItems.length > 0) {
        // Cart is synced to DB — use DB cart (prices verified from DB)
        for (const item of dbCartItems) {
          const dbProduct = await prisma.product.findFirst({ where: { name: item.productName.trim() } });
          const priceVal = dbProduct ? dbProduct.price : item.price;
          orderItemsData.push({ productName: item.productName, variant: item.variant, price: priceVal, quantity: item.quantity });
          calculatedTotal += priceVal * item.quantity;
        }
      } else {
        // FALLBACK: DB cart is empty (not synced). Use items sent from checkout.html (localStorage cart).
        // Prices are still verified server-side against the DB — safe.
        const { items: bodyItems } = req.body;
        if (!bodyItems || !Array.isArray(bodyItems) || bodyItems.length === 0) {
          return res.status(400).json({ message: 'Your cart is empty. Please add products and try again.' });
        }
        for (const item of bodyItems) {
          const name = item.productName || item.name;
          if (!name) continue;
          const dbProduct = await prisma.product.findFirst({ where: { name: name.trim() } });
          if (!dbProduct) return res.status(400).json({ message: `Product "${name}" not found.` });
          const priceVal = dbProduct.price; // Always use DB price — client price is ignored
          const qtyVal = parseInt(item.quantity || item.qty) || 1;
          orderItemsData.push({ productName: dbProduct.name, variant: item.variant ? item.variant.trim() : null, price: priceVal, quantity: qtyVal });
          calculatedTotal += priceVal * qtyVal;
        }
        if (orderItemsData.length === 0) {
          return res.status(400).json({ message: 'No valid products found in your cart. Please try again.' });
        }
      }
    }
    // B. Guest User Checkout
    else {
      const { customerName: gName, customerEmail: gEmail, items } = req.body;
      if (!gName || !gEmail || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Name, email, and items are required for guest checkout.' });
      }
      customerName = gName.trim();
      customerEmail = gEmail.toLowerCase().trim();

      for (const item of items) {
        const name = item.productName || item.name;
        if (!name) continue;
        const dbProduct = await prisma.product.findFirst({ where: { name: name.trim() } });
        if (!dbProduct) return res.status(400).json({ message: `Product "${name}" not found in database.` });
        const priceVal = dbProduct.price;
        const qtyVal = parseInt(item.quantity || item.qty) || 1;
        orderItemsData.push({ productName: dbProduct.name, variant: item.variant ? item.variant.trim() : null, price: priceVal, quantity: qtyVal });
        calculatedTotal += priceVal * qtyVal;
      }

      if (orderItemsData.length === 0) return res.status(400).json({ message: 'No valid items found to create order.' });
    }

    // Build shipping string
    let shippingStr = '';
    if (address) {
      if (typeof address === 'string') {
        shippingStr = address;
      } else if (typeof address === 'object') {
        shippingStr = `${address.name || ''}, ${address.phone || ''}, ${address.line1 || ''}${address.line2 ? ', ' + address.line2 : ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
      }
    } else {
      shippingStr = 'Digital Delivery / Gym Pickup';
    }

    // Coupon logic
    let discountAmount = 0;
    let couponRecord = null;
    if (couponCode) {
      const codeStr = couponCode.trim().toUpperCase();
      couponRecord = await prisma.coupon.findUnique({ where: { code: codeStr } });
      if (!couponRecord) return res.status(400).json({ message: 'Invalid coupon code.' });
      if (!couponRecord.isActive) return res.status(400).json({ message: 'This coupon is no longer active.' });
      if (couponRecord.expiryDate && new Date(couponRecord.expiryDate) < new Date()) return res.status(400).json({ message: 'This coupon has expired.' });
      if (couponRecord.maxUses !== null && couponRecord.usedCount >= couponRecord.maxUses) return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
      if (couponRecord.discountType === 'percentage') discountAmount = Math.round((calculatedTotal * couponRecord.value) / 100);
      else if (couponRecord.discountType === 'flat') discountAmount = couponRecord.value;
      discountAmount = Math.min(discountAmount, calculatedTotal);
    }

    const isCod = paymentMethod && paymentMethod.toLowerCase() === 'cod';
    const codFee = isCod ? 50 : 0;
    const finalTotal = calculatedTotal - discountAmount + codFee;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          customerName,
          customerEmail,
          shippingAddress: shippingStr,
          totalAmount: finalTotal,
          status: 'pending',
          paymentStatus: 'unpaid',
          paymentMethod: isCod ? 'cod' : 'razorpay',
          codFee,
          couponCode: couponRecord ? couponRecord.code : null,
          discountAmount: discountAmount > 0 ? discountAmount : null
        }
      });
      await Promise.all(orderItemsData.map(item => tx.orderItem.create({ data: { orderId: newOrder.id, productName: item.productName, variant: item.variant, price: item.price, quantity: item.quantity } })));
      if (couponRecord) await tx.coupon.update({ where: { id: couponRecord.id }, data: { usedCount: { increment: 1 } } });
      if (isCod && userId) await tx.cartItem.deleteMany({ where: { userId } });
      return newOrder;
    });

    if (isCod) {
      // Fetch full order with items for email
      const fullOrder = await prisma.order.findUnique({ where: { id: order.id }, include: { items: true } });
      // Send customer confirmation + admin notification
      exports.sendOrderConfirmationEmail(fullOrder).catch(err => console.error('[Email COD Customer placeOrder]:', err.message));
      exports.sendAdminOrderNotification(fullOrder).catch(err => console.error('[Email COD Admin placeOrder]:', err.message));
    }

    return res.status(201).json({
      order_id: order.id,
      order_number: `TRI-ORD-${order.id}`,
      total: order.totalAmount,
      paymentMethod: order.paymentMethod
    });
  } catch (error) {
    console.error('[Place Order Error]:', error.message);
    return res.status(500).json({ message: 'Internal server error placing order.' });
  }
};


// =============================================================
// 6. PUBLIC SHIPMENT TRACKING
// =============================================================
exports.trackOrder = async (req, res) => {
  try {
    const orderNumber = req.params.orderNumber || req.query.orderNumber || req.query.orderId || req.query.id;
    const email = req.query.email || req.query.customerEmail;

    if (!orderNumber || !email) {
      return res.status(400).json({ success: false, message: 'Order number (or ID) and customer email are required for tracking.' });
    }

    let numericId = orderNumber;
    if (typeof orderNumber === 'string') {
      const match = orderNumber.match(/\d+/);
      if (match) numericId = match[0];
    }

    const orderIdInt = parseInt(numericId);
    if (isNaN(orderIdInt)) return res.status(400).json({ success: false, message: 'Invalid Order Reference number.' });

    const order = await prisma.order.findUnique({ where: { id: orderIdInt }, include: { items: true } });

    if (!order || order.customerEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return res.status(404).json({ success: false, message: 'Order not found or email mismatch.' });
    }

    return res.status(200).json({
      success: true,
      orderId: order.id,
      orderNumber: `TRI-ORD-${order.id}`,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      couponCode: order.couponCode,
      discountAmount: order.discountAmount,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      items: order.items,
      tracking: {
        carrier: order.trackingCarrier,
        trackingNumber: order.trackingNumber,
        status: order.trackingStatus || 'preparing'
      }
    });
  } catch (error) {
    console.error('[Track Order Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error during order tracking.' });
  }
};


// =============================================================
// EMAIL: Customer Order Confirmation
// (includes tracking message as required by Issue 2 & 3)
// =============================================================
exports.sendOrderConfirmationEmail = async (order) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn('[Email] Transporter not ready. Skipping customer confirmation email.');
      return false;
    }

    const sender = process.env.SMTP_FROM || '"TRI Performance" <therealinside365@gmail.com>';
    const itemRowsHTML = buildItemRowsHTML(order.items);
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Your TRI Order Confirmed</title></head>
      <body style="background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f7;margin:0;padding:0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0c;padding:30px 15px;">
          <tr><td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#121214;border:1px solid #1c1c1e;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.6);">

              <!-- Logo -->
              <tr><td align="center" style="padding-bottom:24px;border-bottom:1px solid #1c1c1e;">
                <span style="font-size:28px;font-weight:800;letter-spacing:2px;color:#ffffff;">△ TRI</span>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.45);margin-top:4px;">Order Confirmed</div>
              </td></tr>

              <!-- Greeting -->
              <tr><td style="padding-top:24px;padding-bottom:16px;">
                <h1 style="font-size:20px;font-weight:700;color:#ffffff;margin:0;">Hey ${order.customerName},</h1>
                <p style="font-size:14px;color:#a1a1a6;line-height:1.6;margin-top:10px;margin-bottom:0;">
                  Thank you for your order! Aapki tracking details aapko mail aur WhatsApp par bhej di jaengi jaise hi aapka order ship hoga.<br><br>
                  Kisi bhi query ke liye: <a href="mailto:query@therealinside.com" style="color:#E6A2A4;">query@therealinside.com</a>
                </p>
              </td></tr>

              <!-- Order Details Box -->
              <tr><td style="background-color:#1c1c1e;border:1px solid #2c2c2e;border-radius:8px;padding:18px;margin-bottom:24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:12px;color:#a1a1a6;padding-bottom:8px;">Order Ref:</td>
                    <td style="font-size:12px;color:#ffffff;font-weight:700;text-align:right;padding-bottom:8px;">#TRI-ORD-${order.id}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#a1a1a6;padding-bottom:8px;">Payment Method:</td>
                    <td style="font-size:12px;color:#ffffff;text-align:right;padding-bottom:8px;">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay Online'}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#a1a1a6;padding-bottom:8px;">Order Date:</td>
                    <td style="font-size:12px;color:#ffffff;text-align:right;padding-bottom:8px;">${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;color:#a1a1a6;">Delivery Address:</td>
                    <td style="font-size:12px;color:#ffffff;text-align:right;width:70%;">${order.shippingAddress || 'On File'}</td>
                  </tr>
                </table>
              </td></tr>

              <!-- Items -->
              <tr><td style="padding-top:16px;padding-bottom:16px;">
                <h2 style="font-size:15px;font-weight:700;color:#ffffff;margin-top:0;margin-bottom:12px;border-left:3px solid #e6a2a4;padding-left:8px;">Your Items</h2>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <thead>
                    <tr style="border-bottom:1px solid #2c2c2e;">
                      <th style="color:#a1a1a6;font-size:12px;font-weight:600;text-align:left;padding-bottom:8px;">Item</th>
                      <th style="color:#a1a1a6;font-size:12px;font-weight:600;text-align:center;padding-bottom:8px;width:60px;">Qty</th>
                      <th style="color:#a1a1a6;font-size:12px;font-weight:600;text-align:right;padding-bottom:8px;width:80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRowsHTML}</tbody>
                </table>
              </td></tr>

              <!-- Totals -->
              <tr><td style="border-top:1px solid #2c2c2e;padding-top:16px;padding-bottom:24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:14px;color:#a1a1a6;padding-bottom:6px;">Subtotal</td>
                    <td style="font-size:14px;color:#ffffff;text-align:right;padding-bottom:6px;">₹${subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                  ${order.discountAmount ? `
                  <tr>
                    <td style="font-size:14px;color:#a1a1a6;padding-bottom:6px;">Discount</td>
                    <td style="font-size:14px;color:#22c55e;text-align:right;padding-bottom:6px;">-₹${order.discountAmount.toLocaleString('en-IN')}</td>
                  </tr>` : ''}
                  ${order.codFee ? `
                  <tr>
                    <td style="font-size:14px;color:#a1a1a6;padding-bottom:6px;">COD Charges</td>
                    <td style="font-size:14px;color:#ffffff;text-align:right;padding-bottom:6px;">₹${order.codFee.toLocaleString('en-IN')}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="font-size:14px;color:#a1a1a6;padding-bottom:6px;">Shipping</td>
                    <td style="font-size:14px;color:#22c55e;text-align:right;padding-bottom:6px;">FREE</td>
                  </tr>
                  <tr style="border-top:1px solid #1c1c1e;">
                    <td style="font-size:16px;color:#ffffff;font-weight:700;padding-top:12px;">Total ${order.paymentMethod === 'cod' ? 'Payable' : 'Paid'}</td>
                    <td style="font-size:18px;color:#e6a2a4;font-weight:800;text-align:right;padding-top:12px;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </td></tr>

              <!-- Tracking + Delivery Info -->
              <tr><td style="background-color:#1a2a1a;border:1px solid #2a3a2a;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="font-size:14px;color:#22c55e;font-weight:700;margin:0 0 6px 0;">🚚 Estimated Delivery: 5–7 Business Days</p>
                <p style="font-size:13px;color:#a1a1a6;margin:0;line-height:1.6;">
                  Aapki tracking details aapko mail aur WhatsApp par bhej di jaengi jaise hi order ship hoga.
                </p>
              </td></tr>

              <!-- Footer -->
              <tr><td align="center" style="border-top:1px solid #1c1c1e;padding-top:24px;">
                <p style="font-size:12px;color:#a1a1a6;line-height:1.5;margin-bottom:18px;">
                  Kisi bhi query ke liye: <strong>query@therealinside.com</strong>
                </p>
                <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;">© 2026 THE REAL INSIDE. ISO/IEC 17025 Eurofins Certified.</p>
              </td></tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to: order.customerEmail,
      subject: `Your TRI Order Confirmed! — #TRI-ORD-${order.id}`,
      html: emailHTML
    });
    console.log(`[Customer Email] Sent to ${order.customerEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Customer Email Error]:', error.message);
    return false;
  }
};


// =============================================================
// EMAIL: Admin Order Notification (Issue 2 — admin email)
// =============================================================
exports.sendAdminOrderNotification = async (order) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn('[Admin Email] Transporter not ready. Skipping admin notification.');
      return false;
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'therealinside365@gmail.com';
    const sender = process.env.SMTP_FROM || '"TRI Performance" <therealinside365@gmail.com>';
    const itemRowsHTML = buildItemRowsHTML(order.items);
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>New Order — TRI Admin</title></head>
      <body style="background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f5f5f7;margin:0;padding:0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0b0c;padding:30px 15px;">
          <tr><td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#121214;border:1px solid #1c1c1e;border-radius:16px;padding:32px;">

              <!-- Header -->
              <tr><td align="center" style="padding-bottom:24px;border-bottom:1px solid #1c1c1e;">
                <span style="font-size:24px;font-weight:800;letter-spacing:2px;color:#ffffff;">△ TRI</span>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#C8A96E;margin-top:4px;">🔔 New Order Received</div>
              </td></tr>

              <!-- Order Summary -->
              <tr><td style="padding-top:20px;padding-bottom:16px;">
                <h2 style="font-size:16px;font-weight:700;color:#ffffff;margin:0 0 16px 0;">Order Details</h2>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#1c1c1e;border-radius:8px;padding:16px;">
                  <tr>
                    <td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Order ID:</td>
                    <td style="font-size:13px;color:#ffffff;font-weight:700;text-align:right;">#TRI-ORD-${order.id}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Customer:</td>
                    <td style="font-size:13px;color:#ffffff;text-align:right;">${order.customerName}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Email:</td>
                    <td style="font-size:13px;color:#E6A2A4;text-align:right;">${order.customerEmail}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Payment:</td>
                    <td style="font-size:13px;color:#22c55e;font-weight:700;text-align:right;">${order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Razorpay Online'}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Address:</td>
                    <td style="font-size:13px;color:#ffffff;text-align:right;width:65%;">${order.shippingAddress || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Order Time:</td>
                    <td style="font-size:13px;color:#ffffff;text-align:right;">${new Date(order.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </td></tr>

              <!-- Items -->
              <tr><td style="padding-bottom:16px;">
                <h2 style="font-size:15px;font-weight:700;color:#ffffff;margin-bottom:12px;border-left:3px solid #C8A96E;padding-left:8px;">Items Ordered</h2>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <thead>
                    <tr style="border-bottom:1px solid #2c2c2e;">
                      <th style="color:#a1a1a6;font-size:12px;text-align:left;padding-bottom:8px;">Item</th>
                      <th style="color:#a1a1a6;font-size:12px;text-align:center;padding-bottom:8px;width:60px;">Qty</th>
                      <th style="color:#a1a1a6;font-size:12px;text-align:right;padding-bottom:8px;width:80px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRowsHTML}</tbody>
                </table>
              </td></tr>

              <!-- Total -->
              <tr><td style="border-top:1px solid #2c2c2e;padding-top:16px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-size:14px;color:#a1a1a6;">Subtotal</td>
                    <td style="font-size:14px;color:#fff;text-align:right;">₹${subtotal.toLocaleString('en-IN')}</td>
                  </tr>
                  ${order.discountAmount ? `<tr><td style="font-size:14px;color:#a1a1a6;">Discount</td><td style="font-size:14px;color:#22c55e;text-align:right;">-₹${order.discountAmount.toLocaleString('en-IN')}</td></tr>` : ''}
                  ${order.codFee ? `<tr><td style="font-size:14px;color:#a1a1a6;">COD Fee</td><td style="font-size:14px;color:#fff;text-align:right;">₹${order.codFee.toLocaleString('en-IN')}</td></tr>` : ''}
                  <tr style="border-top:1px solid #1c1c1e;">
                    <td style="font-size:16px;color:#ffffff;font-weight:700;padding-top:10px;">ORDER TOTAL</td>
                    <td style="font-size:18px;color:#C8A96E;font-weight:800;text-align:right;padding-top:10px;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                </table>
              </td></tr>

              <tr><td align="center" style="padding-top:24px;border-top:1px solid #1c1c1e;">
                <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;">TRI Admin System · therealinside.com</p>
              </td></tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to: adminEmail,
      subject: `🛒 New TRI Order #TRI-ORD-${order.id} — ${order.paymentMethod === 'cod' ? 'COD' : 'Razorpay'} — ₹${order.totalAmount.toLocaleString('en-IN')}`,
      html: emailHTML
    });
    console.log(`[Admin Email] Order notification sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Admin Email Error]:', error.message);
    return false;
  }
};


// =============================================================
// EMAIL: Customer Cancellation Confirmation (Issue 5)
// =============================================================
exports.sendCancellationEmailCustomer = async (order) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) return false;

    const sender = process.env.SMTP_FROM || '"TRI Performance" <therealinside365@gmail.com>';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Order Cancelled — TRI</title></head>
      <body style="background-color:#0b0b0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#f5f5f7;margin:0;padding:0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0b0b0c;padding:30px 15px;">
          <tr><td align="center">
            <table width="580" border="0" cellspacing="0" cellpadding="0" style="background:#121214;border:1px solid #1c1c1e;border-radius:16px;padding:32px;">
              <tr><td align="center" style="padding-bottom:20px;border-bottom:1px solid #1c1c1e;">
                <span style="font-size:26px;font-weight:800;color:#ffffff;">△ TRI</span>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#f87171;margin-top:4px;">Order Cancelled</div>
              </td></tr>
              <tr><td style="padding-top:24px;">
                <h2 style="font-size:18px;color:#ffffff;margin:0 0 12px 0;">Hey ${order.customerName},</h2>
                <p style="font-size:14px;color:#a1a1a6;line-height:1.7;margin:0 0 20px 0;">
                  Your order <strong style="color:#fff;">#TRI-ORD-${order.id}</strong> has been successfully cancelled as per your request.
                </p>
                <div style="background:#1c1c1e;border:1px solid #2c2c2e;border-radius:8px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0 0 6px 0;font-size:13px;color:#a1a1a6;">Order ID: <strong style="color:#fff;">#TRI-ORD-${order.id}</strong></p>
                  <p style="margin:0 0 6px 0;font-size:13px;color:#a1a1a6;">Amount: <strong style="color:#E6A2A4;">₹${order.totalAmount.toLocaleString('en-IN')}</strong></p>
                  <p style="margin:0;font-size:13px;color:#a1a1a6;">Payment: <strong style="color:#fff;">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay'}</strong></p>
                </div>
                ${order.paymentMethod !== 'cod' ? `<p style="font-size:13px;color:#22c55e;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:12px;margin-bottom:20px;">
                  ✅ If any payment was made, refund will be processed within 5–7 business days to your original payment method.
                </p>` : ''}
                <p style="font-size:13px;color:#a1a1a6;line-height:1.6;margin:0;">
                  Questions? Reach us at <a href="mailto:query@therealinside.com" style="color:#E6A2A4;">query@therealinside.com</a>
                </p>
              </td></tr>
              <tr><td align="center" style="padding-top:24px;border-top:1px solid #1c1c1e;margin-top:24px;">
                <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;">© 2026 THE REAL INSIDE. All rights reserved.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to: order.customerEmail,
      subject: `Order Cancelled — #TRI-ORD-${order.id}`,
      html: emailHTML
    });
    console.log(`[Cancel Email Customer] Sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Cancel Email Customer Error]:', error.message);
    return false;
  }
};


// =============================================================
// EMAIL: Admin Cancellation Notification (Issue 5)
// =============================================================
exports.sendCancellationEmailAdmin = async (order) => {
  try {
    const transporter = await getTransporter();
    if (!transporter) return false;

    const adminEmail = process.env.ADMIN_EMAIL || 'therealinside365@gmail.com';
    const sender = process.env.SMTP_FROM || '"TRI Performance" <therealinside365@gmail.com>';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Order Cancelled — Admin Alert</title></head>
      <body style="background-color:#0b0b0c;font-family:-apple-system,sans-serif;color:#f5f5f7;margin:0;padding:0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0b0b0c;padding:30px 15px;">
          <tr><td align="center">
            <table width="580" border="0" cellspacing="0" cellpadding="0" style="background:#121214;border:1px solid #1c1c1e;border-radius:16px;padding:32px;">
              <tr><td align="center" style="padding-bottom:20px;border-bottom:1px solid #1c1c1e;">
                <span style="font-size:24px;font-weight:800;color:#ffffff;">△ TRI</span>
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#f87171;margin-top:4px;">⚠️ Order Cancellation Alert</div>
              </td></tr>
              <tr><td style="padding-top:20px;">
                <p style="font-size:14px;color:#a1a1a6;margin:0 0 16px 0;">A customer has cancelled their order:</p>
                <table width="100%" style="background:#1c1c1e;border-radius:8px;padding:16px;border-collapse:collapse;">
                  <tr><td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Order ID:</td><td style="font-size:13px;color:#fff;text-align:right;font-weight:700;">#TRI-ORD-${order.id}</td></tr>
                  <tr><td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Customer:</td><td style="font-size:13px;color:#fff;text-align:right;">${order.customerName}</td></tr>
                  <tr><td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Email:</td><td style="font-size:13px;color:#E6A2A4;text-align:right;">${order.customerEmail}</td></tr>
                  <tr><td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Amount:</td><td style="font-size:13px;color:#E6A2A4;font-weight:700;text-align:right;">₹${order.totalAmount.toLocaleString('en-IN')}</td></tr>
                  <tr><td style="font-size:13px;color:#a1a1a6;padding:4px 0;">Payment:</td><td style="font-size:13px;color:#fff;text-align:right;">${order.paymentMethod === 'cod' ? 'COD' : 'Razorpay'}</td></tr>
                </table>
              </td></tr>
              <tr><td align="center" style="padding-top:20px;border-top:1px solid #1c1c1e;margin-top:20px;">
                <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:0;">TRI Admin System</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: sender,
      to: adminEmail,
      subject: `⚠️ Order Cancelled — #TRI-ORD-${order.id} by ${order.customerName}`,
      html: emailHTML
    });
    console.log(`[Cancel Email Admin] Sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[Cancel Email Admin Error]:', error.message);
    return false;
  }
};
