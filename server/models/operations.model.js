import { repositoryFactory } from '../repositories/repository.factory.js';
const repository = repositoryFactory('operations');
export const invoice = repository.invoice;
export const payment = repository.payment;
export const receive = repository.receive;
export const dispatch = repository.dispatch;
export const delivered = repository.delivered;
export const countStock = repository.countStock;
export const createStockLocation = repository.createStockLocation;
