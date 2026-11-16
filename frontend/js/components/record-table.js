// Componente presentacional: props hacia abajo y eventos hacia el contenedor.
export default {
 props:{rows:Array,columns:Array,readonly:Boolean},emits:['edit','remove'],
 template:`<div class="scroll"><table><thead><tr><th v-for="c in columns" :key="c.name">{{ c.name }}</th><th v-if="!readonly">Acciones</th></tr></thead><tbody><tr v-for="(row,index) in rows" :key="index"><td v-for="c in columns" :key="c.name">{{ row[c.name] ?? '—' }}</td><td v-if="!readonly"><button @click="$emit('edit',row)">Editar</button><button class="secondary" @click="$emit('remove',row)">Eliminar</button></td></tr></tbody></table><p v-if="!rows.length">No hay registros.</p></div>`
};
