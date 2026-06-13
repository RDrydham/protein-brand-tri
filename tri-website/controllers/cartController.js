const prisma = require('../config/db');

// 1. GET USER CART
exports.getCart = async (req, res) => {
  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      orderBy: { id: 'asc' }
    });

    return res.status(200).json({
      success: true,
      cart: cartItems
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
    const { productName, variant, price, quantity, imageUrl } = req.body;

    if (!productName || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required.'
      });
    }

    const qty = parseInt(quantity) || 1;
    const itemPrice = parseInt(price) || 0;

    // Check if item already exists in cart with same variant
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        userId: req.user.id,
        productName: productName.trim(),
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
          productName: productName.trim(),
          variant: variant ? variant.trim() : null,
          price: itemPrice,
          quantity: qty,
          imageUrl: imageUrl || null
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
    const { cart } = req.body; // Array of guest cart items: [{ name, price, variant, image, qty }]

    if (!cart || !Array.isArray(cart)) {
      return res.status(400).json({
        success: false,
        message: 'Valid cart array is required for synchronization.'
      });
    }

    for (const item of cart) {
      if (!item.name || !item.price) continue;
      
      const qty = parseInt(item.qty) || 1;
      const price = parseInt(item.price) || 0;

      const existingItem = await prisma.cartItem.findFirst({
        where: {
          userId: req.user.id,
          productName: item.name.trim(),
          variant: item.variant ? item.variant.trim() : null
        }
      });

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + qty }
        });
      } else {
        await prisma.cartItem.create({
          data: {
            userId: req.user.id,
            productName: item.name.trim(),
            variant: item.variant ? item.variant.trim() : null,
            price: price,
            quantity: qty,
            imageUrl: item.image || null
          }
        });
      }
    }

    // Fetch final merged cart
    const finalCart = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      orderBy: { id: 'asc' }
    });

    return res.status(200).json({
      success: true,
      message: 'Cart synchronized and merged successfully.',
      cart: finalCart
    });
  } catch (error) {
    console.error('[Sync Cart Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error syncing cart.'
    });
  }
};
