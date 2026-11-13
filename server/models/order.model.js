import { repositoryFactory } from '../repositories/repository.factory.js';
const repository = repositoryFactory('order');
export const create = repository.create;
export const list = repository.list;
export const detail = repository.detail;
export const cancel = repository.cancel;
