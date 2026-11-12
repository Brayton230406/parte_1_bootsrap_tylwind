import { request } from './api.js';
export const schema=()=>request('/admin/esquema').then(r=>r.data);
export const list=(table,offset=0)=>request(`/admin/${table}?limit=25&offset=${offset}`);
export const create=(table,data)=>request(`/admin/${table}`,{method:'POST',body:data});
export const update=(table,key,data)=>request(`/admin/${table}`,{method:'PATCH',body:{key,data}});
export const remove=(table,key)=>request(`/admin/${table}`,{method:'DELETE',body:{key}});
export const operate=(name,data)=>request(`/admin/operaciones/${name}`,{method:'POST',body:data});
