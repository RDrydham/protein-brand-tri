const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middlewares/auth');
const { isAdmin } = adminController;

router.get('/stats', auth, isAdmin, adminController.getDashboardStats);
router.get('/orders', auth, isAdmin, adminController.getAllOrders);
router.put('/orders/:orderId', auth, isAdmin, adminController.updateOrderStatus);
router.get('/products', auth, isAdmin, adminController.getAllProducts);
router.put('/products/:productId', auth, isAdmin, adminController.updateProductDetails);

module.exports = router;
