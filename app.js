// ==========================================
// 1. CONFIGURACIÓN Y ELEMENTOS DEL DOM
// ==========================================
const taskInput = document.getElementById('task-input');
const addButton = document.getElementById('add-button');
const reloadButton = document.getElementById('reload-button');
const taskList = document.getElementById('task-list');
const pendingCounter = document.getElementById('pending-counter');
const offlineSwitch = document.getElementById('offline-switch');

let tasks = [];
let offlineQueue = [];

const isOnline = () => !offlineSwitch.checked;

// ==========================================
// 2. CAPA DE DATOS (Simulador de Supabase)
// ==========================================
let mockDatabase = JSON.parse(localStorage.getItem('db-pro-max')) || [];
const saveToLocalStorage = () => localStorage.setItem('db-pro-max', JSON.stringify(mockDatabase));

const api = {
    fetchAll: () => new Promise(resolve => setTimeout(() => resolve([...mockDatabase]), 600)),
    
    create: (task) => new Promise((resolve, reject) => {
        if (!isOnline()) return reject(new Error("Offline"));
        setTimeout(() => {
            const newTask = { id: Date.now(), ...task };
            mockDatabase.unshift(newTask); 
            saveToLocalStorage(); 
            resolve(newTask);
        }, 500);
    }),
    
    update: (id, changes) => new Promise((resolve, reject) => {
        if (!isOnline()) return reject(new Error("Offline"));
        setTimeout(() => {
            mockDatabase = mockDatabase.map(t => t.id === id ? { ...t, ...changes } : t); 
            saveToLocalStorage();
            resolve(mockDatabase.find(t => t.id === id));
        }, 400);
    }),
    
    delete: (id) => new Promise((resolve, reject) => {
        if (!isOnline()) return reject(new Error("Offline"));
        setTimeout(() => { 
            mockDatabase = mockDatabase.filter(t => t.id !== id); 
            saveToLocalStorage(); 
            resolve(true); 
        }, 400);
    })
};

// ==========================================
// 3. CAPA DE INTERFAZ (UI y Notificaciones)
// ==========================================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications-container');
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateCounter() {
    const pendingTasks = tasks.filter(t => !t.completed).length;
    pendingCounter.textContent = pendingTasks;
}

function renderTasks() {
    taskList.innerHTML = '';
    
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.completed) li.classList.add('completed');
        
        li.innerHTML = `
            <div class="task-info" onclick="handleToggleTask(${task.id})">
                <span class="task-text">${task.text}</span>
            </div>
            <button class="delete-btn" onclick="handleDeleteTask(${task.id})">🗑</button>
        `;
        taskList.appendChild(li);
    });
    
    updateCounter();
}

// ==========================================
// 4. LÓGICA DE NEGOCIO (Eventos y Estado)
// ==========================================
async function loadTasks() {
    try {
        tasks = await api.fetchAll();
        renderTasks();
    } catch (error) {
        showNotification('Error al cargar las tareas', 'error');
    }
}

async function handleAddTask() {
    const text = taskInput.value.trim();
    if (!text) return showNotification('Escribe una tarea primero', 'error');

    // Lógica Offline
    if (!isOnline()) {
        offlineQueue.push({ action: 'create', text });
        tasks.unshift({ id: Date.now(), text, completed: false });
        renderTasks();
        taskInput.value = '';
        return showNotification('Guardado offline. Se sincronizará luego.', 'info');
    }

    // Lógica Online
    addButton.classList.add('loading');
    try {
        const newTask = await api.create({ text, completed: false });
        tasks.unshift(newTask);
        renderTasks();
        taskInput.value = '';
        showNotification('Tarea añadida', 'success');
    } catch (error) {
        showNotification('Error al añadir la tarea', 'error');
    } finally {
        addButton.classList.remove('loading');
    }
}

async function handleToggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // UI Optimista
    task.completed = !task.completed;
    renderTasks();

    if (isOnline()) {
        try {
            await api.update(id, { completed: task.completed });
        } catch (error) {
            // Revertir si falla
            task.completed = !task.completed;
            renderTasks();
            showNotification('Error al actualizar la tarea', 'error');
        }
    }
}

async function handleDeleteTask(id) {
    if (!confirm('¿Seguro que quieres eliminar esta tarea?')) return;

    // Animación de salida
    const li = document.querySelector(`li[data-id="${id}"]`);
    if (li) li.classList.add('removing');
    
    setTimeout(async () => {
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        
        if (isOnline()) {
            try {
                await api.delete(id);
                showNotification('Tarea eliminada', 'success');
            } catch (error) {
                showNotification('Error al eliminar la tarea', 'error');
            }
        }
    }, 300);
}

// ==========================================
// 5. INICIALIZACIÓN Y EVENTOS
// ==========================================
addButton.addEventListener('click', handleAddTask);

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTask();
});

reloadButton.addEventListener('click', async () => {
    reloadButton.classList.add('loading');
    await loadTasks();
    reloadButton.classList.remove('loading');
    showNotification('Datos actualizados', 'success');
});

// Sincronización Offline/Online
offlineSwitch.addEventListener('change', async () => {
    if (isOnline()) {
        if (offlineQueue.length > 0) {
            showNotification(`Sincronizando ${offlineQueue.length} tareas...`, 'info');
            for (let item of offlineQueue) {
                if (item.action === 'create') await api.create({ text: item.text, completed: false });
            }
            offlineQueue = [];
            await loadTasks();
            showNotification('¡Todo sincronizado!', 'success');
        }
    } else {
        showNotification('Modo offline activado', 'error');
    }
});

// Iniciar aplicación al cargar
loadTasks();
