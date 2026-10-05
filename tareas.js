const STORAGE_KEY = 'taskflow-tareas-v1';

const today = new Date();
const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const offsetDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};
const starterTasks = [
  { id: 'demo-1', title: 'Revisar propuesta del proyecto', category: 'Trabajo', dueDate: localDate(today), priority: 'high', completed: false },
  { id: 'demo-2', title: 'Preparar ideas para la reunión semanal', category: 'Trabajo', dueDate: localDate(today), priority: 'medium', completed: false },
  { id: 'demo-3', title: 'Terminar el capítulo del curso', category: 'Estudio', dueDate: offsetDate(1), priority: 'medium', completed: false },
  { id: 'demo-4', title: 'Salir a caminar y despejar la mente', category: 'Personal', dueDate: offsetDate(2), priority: 'low', completed: true },
];
const taskList = document.querySelector('#task-list');
const statusMessage = document.querySelector('#save-status');
const taskDialog = document.querySelector('#task-dialog');
const taskForm = document.querySelector('#task-form');
const searchInput = document.querySelector('#task-search');
let tasks = readTasks();
let activeFilter = 'all';
let activeView = 'all';

function readTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return starterTasks;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(isValidTask)) throw new Error('El formato guardado no es válido.');
    return parsed;
  } catch (error) {
    statusMessage.textContent = 'No se pudieron cargar tus tareas guardadas. Se muestran tareas de ejemplo; revisa el almacenamiento del navegador.';
    console.error('No se pudieron cargar las tareas:', error);
    return starterTasks;
  }
}

function isValidTask(task) {
  return task && typeof task.id === 'string' && typeof task.title === 'string'
    && typeof task.category === 'string' && typeof task.dueDate === 'string'
    && ['low', 'medium', 'high'].includes(task.priority) && typeof task.completed === 'boolean';
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    statusMessage.textContent = '';
    return true;
  } catch (error) {
    statusMessage.textContent = 'No se pudieron guardar los cambios. Comprueba el espacio disponible y los permisos del navegador.';
    console.error('No se pudieron guardar las tareas:', error);
    return false;
  }
}

function formatDueDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Fecha no válida';
  const dateLabel = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(date);
  if (value === localDate(new Date())) return 'Hoy, ' + dateLabel;
  if (value === offsetDate(1)) return 'Mañana, ' + dateLabel;
  return dateLabel;
}

function visibleTasks() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  return tasks.filter((task) => {
    const viewMatches = activeView === 'all'
      || (activeView === 'today' && !task.completed && task.dueDate === localDate(new Date()))
      || (activeView === 'upcoming' && !task.completed && task.dueDate > localDate(new Date()))
      || (activeView === 'completed' && task.completed);
    const filterMatches = activeFilter === 'all'
      || (activeFilter === 'pending' && !task.completed)
      || (activeFilter === 'completed' && task.completed);
    return viewMatches && filterMatches
      && `${task.title} ${task.category}`.toLocaleLowerCase('es').includes(query);
  });
}

function createTaskElement(task) {
  const item = document.createElement('li');
  item.className = `task-item${task.completed ? ' is-completed' : ''}`;

  const check = document.createElement('button');
  check.className = 'task-check';
  check.type = 'button';
  check.setAttribute('aria-label', task.completed ? `Marcar "${task.title}" como pendiente` : `Completar "${task.title}"`);
  check.setAttribute('aria-pressed', String(task.completed));
  check.textContent = '✓';
  check.addEventListener('click', () => {
    task.completed = !task.completed;
    saveTasks();
    render();
  });

  const copy = document.createElement('div');
  copy.className = 'task-copy';
  const title = document.createElement('p');
  title.className = 'task-title';
  title.textContent = task.title;
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const category = document.createElement('span');
  const categoryClass = { Personal: ' category-personal', Estudio: ' category-estudio' }[task.category] || '';
  category.className = `task-category${categoryClass}`;
  category.textContent = task.category;
  const due = document.createElement('span');
  due.className = `task-due${!task.completed && task.dueDate < localDate(new Date()) ? ' is-overdue' : ''}`;
  due.textContent = formatDueDate(task.dueDate);
  meta.append(category, due);
  copy.append(title, meta);

  const priority = document.createElement('span');
  priority.className = `task-priority priority-${task.priority}`;
  priority.textContent = { high: 'Alta', medium: 'Media', low: 'Baja' }[task.priority];

  const remove = document.createElement('button');
  remove.className = 'delete-task';
  remove.type = 'button';
  remove.setAttribute('aria-label', `Eliminar "${task.title}"`);
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    tasks = tasks.filter(({ id }) => id !== task.id);
    saveTasks();
    render();
  });

  item.append(check, copy, priority, remove);
  return item;
}

function render() {
  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  const todaysTasks = pending.filter((task) => task.dueDate === localDate(new Date()));
  const progress = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  document.querySelector('#all-count').textContent = String(tasks.length);
  document.querySelector('#today-count').textContent = String(todaysTasks.length);
  document.querySelector('#pending-total').textContent = String(pending.length);
  document.querySelector('#today-total').textContent = String(todaysTasks.length);
  document.querySelector('#progress-percent').textContent = String(progress);
  document.querySelector('#ring-percent').textContent = `${progress}%`;
  document.querySelector('#progress-ring').style.setProperty('--progress', `${progress}%`);
  document.querySelector('#progress-ring').setAttribute('aria-label', `${progress}% de tareas completadas`);
  document.querySelector('#progress-caption').textContent = completed.length
    ? `${completed.length} ${completed.length === 1 ? 'tarea completada' : 'tareas completadas'}`
    : '¡Cada paso cuenta!';
  document.querySelector('#filter-all-count').textContent = String(tasks.length);
  taskList.replaceChildren(...visibleTasks().map(createTaskElement));
  document.querySelector('#empty-state').hidden = taskList.children.length > 0;
}

document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle('is-selected', selected);
      filterButton.setAttribute('aria-pressed', String(selected));
    });
    render();
  });
});

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    activeView = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach((viewButton) => {
      const selected = viewButton === button;
      viewButton.classList.toggle('is-active', selected);
      if (selected) viewButton.setAttribute('aria-current', 'page');
      else viewButton.removeAttribute('aria-current');
    });
    render();
  });
});

searchInput.addEventListener('input', render);
document.querySelector('#open-task-form').addEventListener('click', () => {
  taskForm.reset();
  document.querySelector('#task-due-date').value = localDate(new Date());
  document.querySelector('#form-error').textContent = '';
  taskDialog.showModal();
  document.querySelector('#task-title').focus();
});
document.querySelector('#close-task-form').addEventListener('click', () => taskDialog.close());
taskDialog.addEventListener('click', (event) => {
  if (event.target === taskDialog) taskDialog.close();
});
taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(taskForm);
  const title = String(formData.get('title')).trim();
  if (!title) {
    document.querySelector('#form-error').textContent = 'Escribe un nombre para tu tarea.';
    document.querySelector('#task-title').focus();
    return;
  }
  tasks.unshift({
    id: window.crypto.randomUUID(),
    title,
    category: String(formData.get('category')),
    dueDate: String(formData.get('dueDate')),
    priority: String(formData.get('priority')),
    completed: false,
  });
  saveTasks();
  activeView = 'all';
  activeFilter = 'all';
  document.querySelectorAll('[data-view]').forEach((button) => {
    const selected = button.dataset.view === 'all';
    button.classList.toggle('is-active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const selected = button.dataset.filter === 'all';
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  searchInput.value = '';
  taskDialog.close();
  render();
  document.querySelector('#open-task-form').focus();
});

document.querySelector('#current-date').textContent = new Intl.DateTimeFormat('es', {
  weekday: 'long', day: 'numeric', month: 'long',
}).format(today).toLocaleUpperCase('es');
render();
