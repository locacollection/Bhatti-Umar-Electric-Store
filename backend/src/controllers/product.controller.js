import {productService} from '../services/product.service.js';
export async function getProducts(req,res,next){try{res.json({data:await productService.list()})}catch(e){next(e)}}