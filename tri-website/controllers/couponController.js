const prisma = require('../config/db');

// Validate coupon code (public)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ success: false, message: 'This coupon is no longer active.' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired.' });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
    }

    // Return the discount details
    return res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value
      }
    });
  } catch (error) {
    console.error('[Validate Coupon Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to validate coupon.' });
  }
};

// Get all coupons (Admin only)
exports.getAllCouponsAdmin = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error('[Admin Get Coupons Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve coupons.' });
  }
};

// Create a coupon (Admin only)
exports.createCouponAdmin = async (req, res) => {
  try {
    const { code, discountType, value, maxUses, expiryDate } = req.body;
    if (!code || !discountType || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Code, discount type, and value are required.'
      });
    }

    const codeStr = code.trim().toUpperCase();

    // Check if code already exists
    const existing = await prisma.coupon.findUnique({
      where: { code: codeStr }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A coupon with this code already exists.' });
    }

    const valInt = parseInt(value);
    const maxUsesInt = maxUses ? parseInt(maxUses) : null;
    const expiry = expiryDate ? new Date(expiryDate) : null;

    const coupon = await prisma.coupon.create({
      data: {
        code: codeStr,
        discountType,
        value: valInt,
        maxUses: maxUsesInt,
        expiryDate: expiry
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      coupon
    });
  } catch (error) {
    console.error('[Admin Create Coupon Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create coupon.' });
  }
};

// Delete a coupon (Admin only)
exports.deleteCouponAdmin = async (req, res) => {
  try {
    const { couponId } = req.params;
    await prisma.coupon.delete({
      where: { id: parseInt(couponId) }
    });
    return res.status(200).json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (error) {
    console.error('[Admin Delete Coupon Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete coupon.' });
  }
};
