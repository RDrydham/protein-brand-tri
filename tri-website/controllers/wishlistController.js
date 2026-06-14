const prisma = require('../config/db');

// Get all wishlist items for the logged-in user
exports.getWishlist = async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('[Get Wishlist Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve wishlist items.' });
  }
};

// Add an item to the user's wishlist
exports.addWishlist = async (req, res) => {
  try {
    const { productName, imageUrl, price } = req.body;
    if (!productName) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    const priceVal = parseInt(price) || 0;
    const item = await prisma.wishlistItem.upsert({
      where: {
        userId_productName: {
          userId: req.user.id,
          productName: productName.trim()
        }
      },
      update: {
        imageUrl: imageUrl || 'assets/hero_product.png',
        price: priceVal
      },
      create: {
        userId: req.user.id,
        productName: productName.trim(),
        imageUrl: imageUrl || 'assets/hero_product.png',
        price: priceVal
      }
    });

    return res.status(200).json({ success: true, message: 'Product added to wishlist.', item });
  } catch (error) {
    console.error('[Add Wishlist Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to add product to wishlist.' });
  }
};

// Remove an item from the user's wishlist
exports.removeWishlist = async (req, res) => {
  try {
    const productName = req.body.productName || req.query.productName;
    if (!productName) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    await prisma.wishlistItem.delete({
      where: {
        userId_productName: {
          userId: req.user.id,
          productName: productName.trim()
        }
      }
    });

    return res.status(200).json({ success: true, message: 'Product removed from wishlist.' });
  } catch (error) {
    // If it didn't exist, return success anyway
    if (error.code === 'P2025') {
      return res.status(200).json({ success: true, message: 'Product was not in wishlist.' });
    }
    console.error('[Remove Wishlist Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to remove product from wishlist.' });
  }
};
