import { listProducts } from '../repositories/product.repository.js';

export const productService = {
  list: (filters) => listProducts(filters)
};
