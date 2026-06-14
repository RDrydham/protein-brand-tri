const prisma = require('../config/db');

// Middleware to check if user is administrator
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  }
};

// 1. GET DASHBOARD STATS
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'user' } });
    const totalOrders = await prisma.order.count();
    
    // Aggregation of total sales for paid orders
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'paid' }
    });
    
    const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const pendingCount = await prisma.order.count({ where: { status: 'pending' } });
    const paidCount = paidOrders.length;
    const shippedCount = await prisma.order.count({ where: { status: 'shipped' } });
    const deliveredCount = await prisma.order.count({ where: { status: 'delivered' } });

    // Recent orders (last 5)
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalSales,
        ordersByStatus: {
          pending: pendingCount,
          paid: paidCount,
          shipped: shippedCount,
          delivered: deliveredCount
        }
      },
      recentOrders
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin stats.'
    });
  }
};

// 2. GET ALL ORDERS
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('[Admin Get Orders Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders.'
    });
  }
};

// 3. UPDATE ORDER STATUS & SHIPMENT DETAILS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingCarrier, trackingNumber, trackingStatus } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const updateData = {};
    if (status !== undefined) {
      const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
      if (validStatuses.includes(status)) {
        updateData.status = status;
      }
    }
    if (trackingCarrier !== undefined) updateData.trackingCarrier = trackingCarrier;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (trackingStatus !== undefined) updateData.trackingStatus = trackingStatus;

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: { items: true }
    });

    return res.status(200).json({
      success: true,
      message: 'Order details updated successfully.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('[Admin Update Order Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order details.'
    });
  }
};

// 4. GET ALL PRODUCTS
exports.getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: 'asc' }
    });
    return res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    console.error('[Admin Get Products Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve products.'
    });
  }
};

// 5. UPDATE PRODUCT STOCK / PRICE
exports.updateProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const { price, stock } = req.body;

    const updateData = {};
    if (price !== undefined) updateData.price = parseInt(price);
    if (stock !== undefined) updateData.stock = parseInt(stock);

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: product.id },
      data: updateData
    });

    return res.status(200).json({
      success: true,
      message: 'Product details updated successfully.',
      product: updatedProduct
    });
  } catch (error) {
    console.error('[Admin Update Product Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product details.'
    });
  }
};

// 6. UPDATE ORDER SHIPMENT TRACKING DETAILS
exports.updateOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingCarrier, trackingNumber, trackingStatus } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        trackingCarrier: trackingCarrier !== undefined ? trackingCarrier.trim() : order.trackingCarrier,
        trackingNumber: trackingNumber !== undefined ? trackingNumber.trim() : order.trackingNumber,
        trackingStatus: trackingStatus !== undefined ? trackingStatus.trim() : order.trackingStatus
      },
      include: { items: true }
    });

    return res.status(200).json({
      success: true,
      message: 'Order shipment tracking details updated successfully.',
      order: updatedOrder
    });
  } catch (error) {
    console.error('[Admin Update Tracking Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order tracking details.'
    });
  }
};

// 7. GET ALL COUPONS
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({
      success: true,
      coupons
    });
  } catch (error) {
    console.error('[Admin Get Coupons Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve coupons.'
    });
  }
};

// 8. CREATE COUPON
exports.createCoupon = async (req, res) => {
  try {
    const { code, discountType, value, isActive, maxUses, expiryDate } = req.body;

    if (!code || !discountType || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'code, discountType, and value are required.'
      });
    }

    const typeStr = discountType.toLowerCase().trim();
    if (typeStr !== 'percentage' && typeStr !== 'flat') {
      return res.status(400).json({
        success: false,
        message: 'discountType must be "percentage" or "flat".'
      });
    }

    const valueInt = parseInt(value);
    if (isNaN(valueInt) || valueInt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'value must be a valid positive integer.'
      });
    }

    const couponCode = code.trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code: couponCode }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Coupon with code "${couponCode}" already exists.`
      });
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: couponCode,
        discountType: typeStr,
        value: valueInt,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        maxUses: maxUses !== undefined && maxUses !== null ? parseInt(maxUses) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      coupon: newCoupon
    });
  } catch (error) {
    console.error('[Admin Create Coupon Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create coupon.'
    });
  }
};

// 9. DELETE COUPON
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id: parseInt(id) }
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    await prisma.coupon.delete({
      where: { id: coupon.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully.'
    });
  } catch (error) {
    console.error('[Admin Delete Coupon Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete coupon.'
    });
  }
};

// 10. GET ALL REVIEWS (FOR MODERATION)
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      productName: r.productName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userName: r.user ? r.user.name : 'Anonymous',
      userEmail: r.user ? r.user.email : 'N/A'
    }));

    return res.status(200).json({
      success: true,
      reviews: formattedReviews
    });
  } catch (error) {
    console.error('[Admin Get Reviews Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews for moderation.'
    });
  }
};

// 11. DELETE REVIEW (MODERATION)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: parseInt(id) }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.'
      });
    }

    await prisma.review.delete({
      where: { id: review.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Review moderated/deleted successfully.'
    });
  } catch (error) {
    console.error('[Admin Delete Review Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete/moderate review.'
    });
  }
};
