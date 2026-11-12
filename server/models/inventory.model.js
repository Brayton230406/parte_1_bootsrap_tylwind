// Algunas instalaciones incluyen el trigger del esquema extendido que aplica movimientos.
export async function movementUpdatesStock(db) {
  const { rows: [result] } = await db.query(`SELECT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid
    WHERE t.tgrelid='michoks.movimiento_inventario'::regclass
      AND p.proname='aplicar_movimiento' AND t.tgenabled IN ('O','A')
      AND NOT t.tgisinternal
  ) AS enabled`);
  return result.enabled;
}
