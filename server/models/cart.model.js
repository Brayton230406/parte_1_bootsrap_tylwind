import { repositoryFactory } from '../repositories/repository.factory.js';
const repository = repositoryFactory('cart');
export const get = repository.get;
export const lockCustomer = repository.lockCustomer;
export const checkSnapshot = repository.checkSnapshot;
export const replace = repository.replace;
