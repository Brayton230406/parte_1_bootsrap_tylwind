import { repositoryFactory } from '../repositories/repository.factory.js';
const repository = repositoryFactory('auth');
export const register = repository.register;
export const login = repository.login;
export const authenticate = repository.authenticate;
export const logout = repository.logout;
export const changePassword = repository.changePassword;
