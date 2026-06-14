const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const reviewController = require('../controllers/reviewController');
const couponController = require('../controllers/couponController');
const auth = require('../middlewares/auth');
const { isAdmin } = adminController;

router.get('/stats', auth, isAdmin, adminController.getDashboardStats);
router.get('/orders', auth, isAdmin, adminController.getAllOrders);
router.put('/orders/:orderId', auth, isAdmin, adminController.updateOrderStatus);
router.get('/products', auth, isAdmin, adminController.getAllProducts);
router.put('/products/:productId', auth, isAdmin, adminController.updateProductDetails);

// Coupons Admin Routes
router.get('/coupons', auth, isAdmin, couponController.getAllCouponsAdmin);
router.post('/coupons', auth, isAdmin, couponController.createCouponAdmin);
router.delete('/coupons/:couponId', auth, isAdmin, couponController.deleteCouponAdmin);

// Reviews Admin Routes
router.get('/reviews', auth, isAdmin, reviewController.getAllReviewsAdmin);
router.delete('/reviews/:reviewId', auth, isAdmin, reviewController.deleteReviewAdmin);

module.exports = router;
