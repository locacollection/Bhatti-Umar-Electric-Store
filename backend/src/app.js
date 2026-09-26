import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import productRoutes from './routes/product.routes.js';
import accountRoutes from './routes/account.routes.js';
import orderRoutes from './routes/order.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reviewRoutes from './routes/review.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';

const app=express();
app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({
  origin:(origin,cb)=>{
    if(!origin || env.corsOrigin==='*') return cb(null,true);
    const allowed=env.corsOrigin.split(',').map(x=>x.trim()).filter(Boolean);
    return cb(null,allowed.includes(origin));
  },
  credentials:true
}));
app.use(express.json({limit:'1mb'}));
app.use(morgan('combined'));

app.get('/api/health',(req,res)=>res.json({ok:true,service:'bhatti-electric-backend'}));
app.use('/api/products',productRoutes);
app.use('/api/account',accountRoutes);
app.use('/api/orders',orderRoutes);
app.use('/api/admin',adminRoutes);
app.use('/api/reviews',reviewRoutes);
app.use('/api/newsletter',newsletterRoutes);

app.use((req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res,next)=>{
  console.error(err);
  res.status(err.status||500).json({error:err.message||'Internal server error'});
});
export default app;