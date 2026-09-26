import { productService } from '../services/product.service.js';

export async function getProducts(req, res, next) {
  try {
    const data = await productService.list({ category: req.query.category });
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
