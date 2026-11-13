import * as auth from './auth.repository.js';
import * as product from './product.repository.js';
import * as admin from './admin.repository.js';
import * as cart from './cart.repository.js';
import * as order from './order.repository.js';
import * as operations from './operations.repository.js';

const repositories = Object.freeze({ auth, product, admin, cart, order, operations });

export function repositoryFactory(name) {
  if (!Object.hasOwn(repositories, name)) throw new Error('Repositorio desconocido.');
  return repositories[name];
}
