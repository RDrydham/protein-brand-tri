const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middlewares/auth');

// Get cart
router.get('/', auth, cartController.getCart);

// Add to cart
router.post('/add', auth, cartController.addToCart);

// Update quantity (supports both /update/:itemId and /:itemId)
router.put('/update/:itemId', auth, cartController.updateCartItem);
router.put('/:itemId', auth, cartController.updateCartItem);

// Remove from cart (supports both /remove/:itemId and /:itemId)
router.delete('/remove/:itemId', auth, cartController.removeFromCart);
router.delete('/:itemId', auth, cartController.removeFromCart);

// Sync cart
router.post('/sync', auth, cartController.syncCart);

module.exports = router;
