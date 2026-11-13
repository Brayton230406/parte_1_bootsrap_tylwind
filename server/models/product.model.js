import { repositoryFactory } from '../repositories/repository.factory.js';
const repository = repositoryFactory('product');
export const list = repository.list;
export const get = repository.get;

export const categories = repository.categories;
