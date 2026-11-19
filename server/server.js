import { app } from './app.js';
import { pool } from './config/db.js';
import { sequelize } from './orm/sequelize.js';
const server=app.listen(Number(process.env.PORT || 5050),process.env.HOST || '127.0.0.1',()=>console.log(`MICHOKS MVC: http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 5050}`));
async function shutdown(){server.close(async()=>{await Promise.all([pool.end(),sequelize.close()]);process.exit(0);});}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
