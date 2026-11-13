import { Router } from 'express';
import * as products from '../controllers/product.controller.js';
const api = Router();
api.get('/productos',products.list);
api.get('/productos/categorias',products.categories);
api.get('/productos/:id',products.get);
export default api;
