import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import productRoutes from './routes/product.routes.js';
import { errorHandler } from './middleware/error.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'bhatti-electric-backend' }));
app.use('/api/products', productRoutes);
app.use(errorHandler);

export default app;
