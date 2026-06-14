const prisma = require('../config/db');

// Get all reviews for a specific product and compute stats
exports.getProductReviews = async (req, res) => {
  try {
    const { productName } = req.params;
    if (!productName) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    const reviews = await prisma.review.findMany({
      where: { productName: productName.trim() },
      include: {
        user: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const count = reviews.length;
    const averageRating = count > 0
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      productName,
      averageRating,
      reviewCount: count,
      reviews
    });
  } catch (error) {
    console.error('[Get Product Reviews Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
  }
};

// Add or update a product review (logged-in users only)
exports.addReview = async (req, res) => {
  try {
    const { productName, rating, comment } = req.body;
    if (!productName || rating === undefined || comment === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product name, rating, and comment are required.'
      });
    }

    const ratingVal = parseInt(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    const review = await prisma.review.upsert({
      where: {
        userId_productName: {
          userId: req.user.id,
          productName: productName.trim()
        }
      },
      update: {
        rating: ratingVal,
        comment: comment.trim()
      },
      create: {
        userId: req.user.id,
        productName: productName.trim(),
        rating: ratingVal,
        comment: comment.trim()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Review saved successfully.',
      review
    });
  } catch (error) {
    console.error('[Add Review Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to save review.' });
  }
};

// Get all reviews (Admin only)
exports.getAllReviewsAdmin = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('[Admin Get Reviews Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
  }
};

// Delete a review (Admin only)
exports.deleteReviewAdmin = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await prisma.review.delete({
      where: { id: parseInt(reviewId) }
    });
    return res.status(200).json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('[Admin Delete Review Error]:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
};
