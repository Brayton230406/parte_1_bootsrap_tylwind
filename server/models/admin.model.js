import { repositoryFactory } from '../repositories/repository.factory.js';
const repository = repositoryFactory('admin');
export const metadata = repository.metadata;
export const list = repository.list;
export const write = repository.write;
