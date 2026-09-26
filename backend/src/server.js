import app from './app.js';
import {env,requireBackendEnv} from './config/env.js';
requireBackendEnv();
app.listen(env.port,'0.0.0.0',()=>console.log('Bhatti backend listening on '+env.port));