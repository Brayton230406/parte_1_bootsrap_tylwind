import { request } from './api.js';
export const createOrder=body=>request('/pedidos',{method:'POST',body}).then(r=>r.data);
export const listOrders=()=>request('/pedidos').then(r=>r.data);
export const orderDetail=id=>request(`/pedidos/${id}`).then(r=>r.data);
export const cancelOrder=id=>request(`/pedidos/${id}/cancelacion`,{method:'POST'});
export const getCart=()=>request('/carrito').then(r=>r.data);
export const putCart=(items,previos)=>request('/carrito',{method:'PUT',body:{items,previos}});
