import { ref, computed, onMounted } from '/vendor/vue.js';
import { loadProducts } from '../repo.js';
import { request } from '../services/api.js';

async function allRecords(table) {
  const records = [];
  let total;
  do {
    const { data, meta } = await request(`/admin/${table}?limit=100&offset=${records.length}`);
    records.push(...data);
    total = data.length ? meta.total : records.length;
  } while (records.length < total);
  return records;
}

export default {
  setup() {
    const products = ref([]);
    const locations = ref([]);
    const warehouseNames = ref({});
    const search = ref('');
    const productId = ref('');
    const locationId = ref('');
    const busy = ref(false);
    const message = ref('');
    const filtered = computed(() => products.value.filter(product =>
      product.id === productId.value || product.name.toLowerCase().includes(search.value.trim().toLowerCase())));
    const selected = computed(() => products.value.find(product => product.id === productId.value));

    async function run(work) {
      if (busy.value) return;
      message.value = '';
      busy.value = true;
      try { await work(); }
      catch (error) { message.value = error.message; }
      finally { busy.value = false; }
    }
    async function refreshLocations() {
      const [warehouses, bins] = await Promise.all([allRecords('almacen'), allRecords('ubicacion')]);
      locations.value = bins;
      warehouseNames.value = Object.fromEntries(warehouses.map(row => [row.id_almacen, row.nombre]));
    }
    function refresh() {
      return run(async () => {
        [products.value] = await Promise.all([loadProducts(), refreshLocations()]);
      });
    }
    function createLocation(event) {
      const form = event.currentTarget;
      const body = Object.fromEntries(new FormData(form));
      return run(async () => {
        const { data } = await request('/admin/operaciones/ubicacion', { method:'POST', body });
        form.reset();
        await refreshLocations();
        locationId.value = data.id_ubicacion;
        message.value = 'Ubicación creada.';
      });
    }
    function countStock(event) {
      const form = event.currentTarget;
      const body = Object.fromEntries(new FormData(form));
      return run(async () => {
        await request('/admin/operaciones/conteo', { method:'POST', body });
        form.elements.cantidad.value = '';
        form.elements.referencia.value = '';
        message.value = 'Conteo guardado. La disponibilidad de la tienda ya está actualizada.';
        const { data } = await request('/productos/' + body.id_producto);
        const product = products.value.find(item => item.id === data.id);
        if (product) product.stock = data.stock;
      });
    }

    onMounted(refresh);
    return { locations, warehouseNames, search, productId, locationId, busy, message, filtered,
      selected, refresh, createLocation, countStock };
  },
  template: `
    <section class="account-panel" aria-labelledby="inventory-title">
      <h2 id="inventory-title">Inventario</h2>
      <p role="status" class="account-status">{{ busy ? 'Consultando inventario…' : message }}</p>
      <div class="inventory-grid">
        <form @submit.prevent="countStock">
          <h3>Registrar conteo físico</h3>
          <p class="account-muted">Ingresa el total contado para el producto sin lote en esta ubicación.</p>
          <label>Buscar producto <input v-model="search" type="search" placeholder="Nombre de la botella"></label>
          <label>Producto
            <select v-model="productId" name="id_producto" required :disabled="busy">
              <option value="">Elige un producto</option>
              <option v-for="product in filtered" :key="product.id" :value="product.id">{{ product.name }} · {{ product.size }}</option>
            </select>
          </label>
          <p v-if="selected" class="account-muted">Stock disponible en la tienda: {{ selected.stock }}.</p>
          <label>Ubicación
            <select v-model="locationId" name="id_ubicacion" required :disabled="busy">
              <option value="">{{ locations.length ? 'Elige una ubicación' : 'Crea una ubicación para empezar' }}</option>
              <option v-for="location in locations" :key="location.id_ubicacion" :value="location.id_ubicacion">{{ warehouseNames[location.id_almacen] }} · {{ location.codigo }}</option>
            </select>
          </label>
          <label>Unidades contadas <input name="cantidad" type="number" min="0" max="99999999999" step="0.001" required></label>
          <label>Motivo del conteo <input name="referencia" required maxlength="100" placeholder="Ej. Inventario inicial"></label>
          <button class="account-primary" :disabled="busy || !locations.length || !productId">Guardar conteo</button>
        </form>
        <form @submit.prevent="createLocation">
          <h3>Crear ubicación</h3>
          <label>Nombre del almacén <input name="almacen" required maxlength="100" autocomplete="off"></label>
          <label>Dirección del almacén <input name="direccion" required maxlength="300" autocomplete="street-address"></label>
          <label>Código de ubicación <input name="codigo" required maxlength="40" placeholder="Ej. VITRINA-01"></label>
          <button class="secondary" :disabled="busy">Crear ubicación</button>
          <button type="button" class="secondary" :disabled="busy" @click="refresh">Actualizar listas</button>
        </form>
      </div>
    </section>
  `,
};
