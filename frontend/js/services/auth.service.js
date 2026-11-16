import { request,setToken } from './api.js';
export const me=()=>request('/auth/me').then(r=>r.data);
export const register=body=>request('/auth/registro',{method:'POST',body});
export async function login(body){const {data}=await request('/auth/login',{method:'POST',body});setToken(data.token);return data.user;}
export async function logout(){try{await request('/auth/logout',{method:'POST'});}finally{setToken(null);}}
