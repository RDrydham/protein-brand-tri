const prisma = require('../config/db');
const pool = require('../db');

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
  const client = await pool.connect();
  try {
    const cart = req.body.cart || req.body.items;

    if (!cart || !Array.isArray(cart)) {
      return res.status(400).json({ success: false, message: 'Valid cart array is required.' });
    }

    await client.query('BEGIN');

    // Clear existing raw SQL cart to prevent duplicates during sync
    await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);

    for (const item of cart) {
      if (!item.name || !item.price) continue;
      
      const qty = parseInt(item.qty) || 1;

      // Find the actual product_id based on the name sent from the frontend
      const productResult = await client.query(
        'SELECT id FROM products WHERE name = $1', 
        [item.name.trim()]
      );

      // If the product exists in the DB, insert it into the raw SQL cart table
      if (productResult.rows.length > 0) {
        const productId = productResult.rows[0].id;
        
        await client.query(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [req.user.id, productId, qty]
        );
      }
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: 'Cart synchronized with SQL database successfully.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Sync Cart Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error syncing cart.' });
  } finally {
    client.release();
  }
};
