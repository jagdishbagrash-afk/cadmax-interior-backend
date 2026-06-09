const router = require("express").Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  removeFromWishlistByProductId,
  toggleWishlist,
} = require("../Controller/WishlistController");
const { verifyToken } = require("../Utill/tokenVerify");

router.get("/wishlist/get", verifyToken, getWishlist);
router.post("/wishlist/add", verifyToken, addToWishlist);
router.post("/wishlist/remove", verifyToken, removeFromWishlist);
router.post("/wishlist/toggle", verifyToken, toggleWishlist);
router.delete("/wishlist/delete/:productId", verifyToken, removeFromWishlistByProductId);

module.exports = router;