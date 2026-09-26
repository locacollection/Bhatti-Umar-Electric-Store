import {listProducts} from '../repositories/product.repository.js';
export const productService={list:()=>listProducts()};