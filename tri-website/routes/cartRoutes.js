const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middlewares/auth');

router.get('/', auth, cartController.getCart);
router.post('/add', auth, cartController.addToCart);
router.put('/update/:itemId', auth, cartController.updateCartItem);
router.delete('/remove/:itemId', auth, cartController.removeFromCart);
router.post('/sync', auth, cartController.syncCart);

module.exports = router;
