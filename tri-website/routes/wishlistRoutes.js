const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middlewares/auth');

router.get('/', auth, wishlistController.getWishlist);
router.post('/add', auth, wishlistController.addWishlist);
router.delete('/remove', auth, wishlistController.removeWishlist);

module.exports = router;
