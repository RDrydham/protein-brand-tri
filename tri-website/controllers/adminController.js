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

// 3. UPDATE ORDER STATUS
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // pending, paid, shipped, delivered, cancelled

    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value.'
      });
    }

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
      data: { status },
      include: { items: true }
    });

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}.`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('[Admin Update Status Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update order status.'
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
