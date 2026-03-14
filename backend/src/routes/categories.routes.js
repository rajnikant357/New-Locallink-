const express = require("express");
const { authRequired, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { asyncHandler } = require("../utils/async-handler");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listCategoriesSchema,
  categoryIdSchema,
  createCategorySchema,
  updateCategorySchema,
} = require("../controllers/categories.controller");

const router = express.Router();

router.get("/", validate(listCategoriesSchema), asyncHandler(listCategories));
router.post("/", authRequired, requireRole("admin"), validate(createCategorySchema), asyncHandler(createCategory));
router.patch("/:id", authRequired, requireRole("admin"), validate(updateCategorySchema), asyncHandler(updateCategory));
router.delete("/:id", authRequired, requireRole("admin"), validate(categoryIdSchema), asyncHandler(deleteCategory));

module.exports = router;
