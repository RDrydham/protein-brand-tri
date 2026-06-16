const pool = require('../db');

// 1. GET USER CART
exports.getCart = async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      orderBy: { id: 'asc' }
    });

    const formattedItems = cartItems.map(item => ({
      id: item.id,
      name: item.productName,
      variant: item.variant || '',
      price: parseFloat(item.price) || 0,
      quantity: item.quantity,
      qty: item.quantity,
      image: item.imageUrl || 'assets/hero_product.png'
    }));

    return res.status(200).json({
      success: true,
      cart: formattedItems,
      items: formattedItems
    });
  } catch (error) {
    console.error('[Get Cart Controller Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching cart.'
    });
  }
};

// 2. ADD TO CART
exports.addToCart = async (req, res) => {
  try {
    let { productName, variant, quantity, product_id } = req.body;

    const qty = parseInt(quantity) || 1;
    let dbProduct = null;

    // Look up product in DB to ensure correct price and details
    if (product_id) {
      dbProduct = await prisma.product.findUnique({
        where: { id: parseInt(product_id) }
      });
    } else if (productName) {
      dbProduct = await prisma.product.findFirst({
        where: { name: productName.trim() }
      });
    }

    if (!dbProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product not found in system.'
      });
    }

    const itemPrice = dbProduct.price;
    const finalProductName = dbProduct.name;
    const finalImageUrl = dbProduct.imageUrl;

    // Check if item already exists in cart with same variant
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId: req.user.id,
        productName: finalProductName.trim(),
        variant: variant ? variant.trim() : null
      }
    });

    let cartItem;
    if (existingItem) {
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + qty }
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId: req.user.id,
          productName: finalProductName.trim(),
          variant: variant ? variant.trim() : null,
          price: itemPrice,
          quantity: qty,
          imageUrl: finalImageUrl || null
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product added to database cart.',
      item: cartItem
    });
  } catch (error) {
    console.error('[Add to Cart Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error adding to cart.'
    });
  }
};

// 3. UPDATE QUANTITY
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || parseInt(quantity) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required (must be 1 or more).'
      });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: parseInt(itemId) }
    });

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.'
      });
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: parseInt(quantity) }
    });

    return res.status(200).json({
      success: true,
      message: 'Cart updated.',
      item: updatedItem
    });
  } catch (error) {
    console.error('[Update Cart Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error updating cart.'
    });
  }
};

// 4. REMOVE FROM CART
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await prisma.cartItem.findUnique({
      where: { id: parseInt(itemId) }
    });

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.'
      });
    }

    await prisma.cartItem.delete({
      where: { id: item.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Item removed from database cart.'
    });
  } catch (error) {
    console.error('[Remove Cart Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error removing from cart.'
    });
  }
};

// 5. SYNC LOCAL GUEST CART TO DB ON LOGIN
exports.syncCart = async (req, res) => {
  try {
    const cart = req.body.cart || req.body.items;

    if (!cart || !Array.isArray(cart)) {
      return res.status(400).json({ success: false, message: 'Valid cart array is required.' });
    }

    // Clear existing Prisma cart items for this user
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });

    for (const item of cart) {
      const name = item.name || item.productName;
      if (!name) continue;

      const qty = parseInt(item.qty || item.quantity) || 1;

      // Strictly look up product price in DB
      const product = await prisma.product.findFirst({
        where: { name: name.trim() }
      });

      // Default to 599 if product not found, preventing client-side price setting
      const price = product ? product.price : 599;
      const imageUrl = product ? product.imageUrl : (item.image || item.imageUrl || null);

      await prisma.cartItem.create({
        data: {
          userId: req.user.id,
          productName: name.trim(),
          variant: item.variant ? item.variant.trim() : null,
          price: price,
          quantity: qty,
          imageUrl: imageUrl
        }
      });
    }

    return res.status(200).json({ success: true, message: 'Cart synced to database.' });
  } catch (error) {
    console.error('[Sync Cart Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};
