const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middlewares/auth');

router.get('/:productName', reviewController.getProductReviews);
router.post('/add', auth, reviewController.addReview);

module.exports = router;
