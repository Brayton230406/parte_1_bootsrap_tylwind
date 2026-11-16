export default {
  props: { order: { type: Object, required: true } },
  template: `
    <section aria-label="Detalle del pedido">
      <h3>Pedido #{{ order.id_pedido }}</h3>
      <ul><li v-for="line in order.detalles" :key="line.id_detalle_pedido">
        {{ line.nombre }} · {{ Number(line.cantidad) }} unidades · USD {{ line.precio_unitario }} c/u
      </li></ul>
      <ul><li v-for="event in order.historial" :key="event.id_historial_pedido">
        {{ event.estado }} · {{ new Date(event.fecha).toLocaleString() }}
      </li></ul>
    </section>
  `,
};
