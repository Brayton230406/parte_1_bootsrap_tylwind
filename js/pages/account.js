import { createApp, ref, computed, onMounted } from '/vendor/vue.js';
import InventoryPanel from '../components/inventory-panel.js';
import OperationsPanel from '../components/operations-panel.js';
import * as adminService from '../services/admin.service.js';
import OrderDetail from '../components/order-detail.js';
import { getToken, setToken, request } from '../services/api.js';

createApp({
  components: { OrderDetail, OperationsPanel, InventoryPanel },
  setup() {
    const user = ref(null);
    const busy = ref(false);
    const status = ref('');
    const mode = ref('login');
    const panel = ref('inventario');
    const signedIn = computed(() => Boolean(user.value));
    const isCustomer = computed(() => user.value?.roles.includes('cliente'));
    const isAdmin = computed(() => user.value?.roles.includes('administrador'));
    const activePanel = computed(() => panel.value === 'pedidos' && !isCustomer.value ? 'inventario' : panel.value);
    const orders = ref([]);
    const order = ref(null);
    const tables = ref([]);
    const selected = ref('');
    const definition = computed(() => tables.value.find(table => table.name === selected.value));
    const rows = ref([]);
    const total = ref(0);
    const offset = ref(0);
    const editKey = ref(null);
    const editor = ref({});
    const editorColumns = computed(()=>definition.value?.columns.filter(c=>!c.generated && (!editKey.value || !definition.value.primaryKey.includes(c.name))) || []);
    const limit = 25;

    async function run(work) {
      if (busy.value) return;
      busy.value = true;
      status.value = '';
      try { await work(); }
      catch (error) {
        if (error.status === 401 && !getToken()) user.value = null;
        status.value = error.message;
      } finally { busy.value = false; }
    }

    async function loadAccount() {
      const {data} = await request('/auth/me');
      user.value = data;
      const section = location.hash.slice(1);
      panel.value = isCustomer.value && (section === 'pedidos' || !isAdmin.value) ? 'pedidos' : 'inventario';
      if (isCustomer.value) await loadOrders();
      if (data.roles.includes('administrador')) {
        tables.value = (await request('/admin/esquema')).data;
        selected.value = tables.value[0].name;
        await loadTable();
      }
    }
    async function loadOrders() { orders.value = (await request('/pedidos')).data; }
    function login(event) {
      const body = Object.fromEntries(new FormData(event.target));
      return run(async () => {
        const {data} = await request('/auth/login', {method:'POST', body});
        setToken(data.token);
        if (data.user.roles.includes('cliente') && new URLSearchParams(location.search).get('desde') === 'tienda') {
          location.assign('/#catalogo');
          return;
        }
        await loadAccount();
      });
    }
    function register(event) {
      const body = Object.fromEntries(new FormData(event.target));
      body.mayor_edad = body.mayor_edad === 'on';
      body.acepta_terminos = body.acepta_terminos === 'on';
      return run(async () => {
        await request('/auth/registro', {method:'POST', body});
        mode.value = 'login';
        status.value = 'Cuenta creada. Ya puedes iniciar sesión.';
      });
    }
    function logout() {
      return run(async () => {
        await request('/auth/logout', {method:'POST'});
        setToken(null);
        user.value = null;
        orders.value = [];
        order.value = null;
        tables.value = [];
        rows.value = [];
      });
    }
    function changePassword(event) {
      const form = event.currentTarget;
      const body = Object.fromEntries(new FormData(form));
      return run(async () => {
        if (body.nueva !== body.confirmacion) throw new Error('Las contraseñas nuevas deben coincidir.');
        await request('/auth/contrasena', { method:'PUT', body: { actual:body.actual, nueva:body.nueva } });
        form.reset();
        status.value = 'Contraseña actualizada. Se cerraron tus otras sesiones.';
      });
    }
    function openOrder(id) {
      return run(async () => { order.value = (await request('/pedidos/' + id)).data; });
    }
    function cancel(id) {
      if (!window.confirm('¿Cancelar el pedido #' + id + '?')) return;
      return run(async () => {
        await request('/pedidos/' + id + '/cancelacion', {method:'POST'});
        order.value = null;
        await loadOrders();
        status.value = 'Pedido cancelado.';
      });
    }
    async function loadTable(next = 0) {
      const result = await request(`/admin/${selected.value}?limit=${limit}&offset=${next}`);
      rows.value = result.data;
      total.value = result.meta.total;
      offset.value = next;
      edit(null);
    }
    function edit(row) {
      const table = definition.value;
      editKey.value = row ? Object.fromEntries(table.primaryKey.map(key => [key, row[key]])) : null;
      const columns = table.columns.filter(column=>!column.generated && (!row || !table.primaryKey.includes(column.name)));
      editor.value=Object.fromEntries(columns.map(column=>[column.name,row ? row[column.name] : '']));
    }
    function save() {
      return run(async () => {
        const data={};
        for(const column of editorColumns.value) {
          let value=editor.value[column.name];
          if(value==='' || value==null){if(editKey.value)data[column.name]=null;continue;}
          if(column.type==='BOOLEAN')value=value===true || value==='true';
          data[column.name]=value;
        }
        const method = editKey.value ? 'PATCH' : 'POST';
        await request('/admin/' + selected.value, {method, body: editKey.value ? {key:editKey.value, data} : data});
        await loadTable(offset.value);
        status.value = 'Registro guardado.';
      });
    }
    function remove(row) {
      if (!window.confirm('¿Eliminar este registro?')) return;
      return run(async () => {
        const key = Object.fromEntries(definition.value.primaryKey.map(name => [name, row[name]]));
        await request('/admin/' + selected.value, {method:'DELETE', body:{key}});
        await loadTable(rows.value.length === 1 ? Math.max(0, offset.value - limit) : offset.value);
        status.value = 'Registro eliminado.';
      });
    }
    function operate({name,data}) {
      return run(async()=>{
        await adminService.operate(name,data);
        await loadTable(offset.value);
        if(user.value.roles.includes('cliente'))await loadOrders();
        status.value = 'Operación completada.';
      });
    }
    onMounted(() => { if (getToken()) run(loadAccount); });
    return {user,busy,status,mode,panel,signedIn,isCustomer,isAdmin,activePanel,changePassword,orders,order,tables,selected,definition,rows,total,offset,limit,
      editor,editorColumns,editKey,login,register,logout,openOrder,cancel,run,loadTable,edit,save,remove,operate};
  },
  template: `
    <p class="account-status" role="status">{{ busy ? 'Procesando…' : status }}</p>
    <div v-if="!signedIn" class="account-auth">
      <div class="account-auth-image" aria-hidden="true"></div>
      <section class="account-auth-content" aria-labelledby="access-title">
      <h2 id="access-title">{{ mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta' }}</h2>
      <p class="account-muted">Guarda tu carrito y consulta tus pedidos desde tu cuenta.</p>
      <form v-if="mode === 'login'" key="login" @submit.prevent="login">
        <label>Usuario o correo <input name="identifier" required autocomplete="username"></label>
        <label>Contraseña <input name="password" type="password" required autocomplete="current-password"></label>
        <button class="account-primary" :disabled="busy">Iniciar sesión</button>
        <button type="button" :disabled="busy" @click="mode = 'register'">Crear cuenta</button>
      </form>
      <form v-else key="register" @submit.prevent="register">
        <label>Nombre de usuario <input name="nombre_usuario" required minlength="3" maxlength="60" autocomplete="username"></label>
        <label>Nombre completo <input name="nombre" required maxlength="160" autocomplete="name"></label>
        <label>Correo <input name="correo" required type="email" maxlength="254" autocomplete="email"></label>
        <label>Teléfono <input name="telefono" type="tel" maxlength="30" autocomplete="tel"></label>
        <label>Contraseña <input name="password" type="password" required minlength="10" maxlength="128" autocomplete="new-password"></label>
        <label class="account-check"><input name="mayor_edad" type="checkbox" required> Declaro ser mayor de edad.</label>
        <label class="account-check"><input name="acepta_terminos" type="checkbox" required> Acepto que la tienda use mis datos de contacto para gestionar mis pedidos.</label>
        <button class="account-primary" :disabled="busy">Registrarme</button>
        <button type="button" :disabled="busy" @click="mode = 'login'">Volver al inicio de sesión</button>
      </form>
      </section>
    </div>
    <template v-else>
      <div class="account-welcome">
        <div><p class="account-role">{{ isAdmin ? 'Administración' : 'Cuenta de cliente' }}</p><h2>Hola, {{ user.nombre }}</h2><p>{{ user.correo }}</p></div>
        <button :disabled="busy" @click="logout">Cerrar sesión</button>
      </div>
      <nav class="account-navigation" aria-label="Secciones de tu cuenta">
        <button v-if="isCustomer" :aria-pressed="activePanel === 'pedidos'" @click="panel = 'pedidos'">Mis pedidos</button>
        <button v-if="isAdmin" :aria-pressed="activePanel === 'inventario'" @click="panel = 'inventario'">Inventario</button>
        <button v-if="isAdmin" :aria-pressed="activePanel === 'operaciones'" @click="panel = 'operaciones'">Operaciones</button>
        <button v-if="isAdmin" :aria-pressed="activePanel === 'registros'" @click="panel = 'registros'">Tablas</button>
        <button :aria-pressed="activePanel === 'seguridad'" @click="panel = 'seguridad'">Seguridad</button>
      </nav>
      <section v-if="isCustomer && activePanel === 'pedidos'" id="pedidos" class="account-panel">
        <h2>Mis pedidos</h2>
        <div v-if="!orders.length" class="account-empty"><p>Aún no tienes pedidos.</p><a class="text-link" href="/#catalogo">Explorar el catálogo →</a></div>
        <ul v-else class="account-orders">
          <li v-for="entry in orders" :key="entry.id_pedido">
            <div><strong>Pedido #{{ entry.id_pedido }}</strong><p>{{ new Date(entry.fecha).toLocaleDateString('es-EC') }} · USD {{ entry.subtotal }}</p></div>
            <span class="account-order-state">{{ entry.estado }}</span>
            <div class="account-order-actions"><button :disabled="busy" @click="openOrder(entry.id_pedido)">Ver detalle</button>
            <button v-if="entry.estado === 'Pendiente'" :disabled="busy" @click="cancel(entry.id_pedido)">Cancelar</button></div>
          </li>
        </ul>
        <order-detail v-if="order" :order="order" />
      </section>
      <inventory-panel v-if="isAdmin && activePanel === 'inventario'" />
      <div v-if="isAdmin && activePanel === 'operaciones'" class="account-panel">
        <operations-panel :busy="busy" @submit="operate"/>
      </div>
      <section v-if="isAdmin && definition && activePanel === 'registros'" class="account-panel">
        <h2>Administración</h2>
        <label>Tabla <select v-model="selected" :disabled="busy" @change="run(() => loadTable())">
          <option v-for="table in tables" :key="table.name">{{ table.name }}</option>
        </select></label>
        <p>{{ total }} registros</p><p v-for="relation in definition.references" :key="relation.column"><small>{{relation.column}} → {{relation.table}}.{{relation.target}}</small></p>
        <div class="table-scroll">
          <table>
            <thead><tr><th v-for="column in definition.columns" :key="column.name">{{ column.name }}</th><th>Acciones</th></tr></thead>
            <tbody><tr v-for="row in rows" :key="JSON.stringify(definition.primaryKey.map(key => row[key]))">
              <td v-for="column in definition.columns" :key="column.name">{{ row[column.name] }}</td>
              <td v-if="!definition.readonly">
                <button :disabled="busy" @click="edit(row)">Editar</button>
                <button :disabled="busy" @click="remove(row)">Eliminar</button>
              </td><td v-else>Solo lectura</td>
            </tr></tbody>
          </table>
        </div>
        <button :disabled="busy || offset === 0" @click="run(() => loadTable(offset - limit))">Anterior</button>
        <button :disabled="busy || offset + limit >= total" @click="run(() => loadTable(offset + limit))">Siguiente</button>
        <form v-if="!definition.readonly && (editKey || selected !== 'usuario')" @submit.prevent="save">
          <h3>{{ editKey ? 'Editar registro' : 'Nuevo registro' }}</h3>
          <label v-for="column in editorColumns" :key="column.name">{{ column.name }}
            <select v-if="column.type==='BOOLEAN'" v-model="editor[column.name]" :disabled="busy"><option value="">Predeterminado / vacío</option><option :value="true">Sí</option><option :value="false">No</option></select>
            <input v-else v-model="editor[column.name]" :disabled="busy" :required="column.required && !column.default" :type="column.type==='DATE' ? 'date' : 'text'" :placeholder="column.type.includes('TIMESTAMP') ? 'Fecha ISO con zona horaria' : ''">
          </label>
          <button :disabled="busy">Guardar</button>
          <button v-if="editKey" type="button" :disabled="busy" @click="edit(null)">Cerrar edición</button>
        </form>
      </section>
      <section v-if="activePanel === 'seguridad'" class="account-panel">
        <h2>Seguridad</h2>
        <form @submit.prevent="changePassword">
          <label>Contraseña actual <input name="actual" type="password" autocomplete="current-password" required></label>
          <label>Nueva contraseña <input name="nueva" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></label>
          <label>Confirma la nueva contraseña <input name="confirmacion" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></label>
          <button class="account-primary" :disabled="busy">Actualizar contraseña</button>
        </form>
      </section>
    </template>
  `,
}).mount('#account');
