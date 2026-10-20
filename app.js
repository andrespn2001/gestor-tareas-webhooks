// ==========================================
// ESTADO DE LA APP
// ==========================================
let tasks = [
    { id: 1, text: "Estudiar Webhooks", completed: false },
    { id: 2, text: "Configurar Make", completed: false }
];
let okCount = 0;
let errorCount = 0;

const taskList = document.getElementById('taskList');
const taskInput = document.getElementById('taskInput');
const consoleBox = document.getElementById('console');
const supabaseTable = document.getElementById('supabaseTable');

// ==========================================
// RENDERIZADO
// ==========================================
function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach(t => {
        const li = document.createElement('li');
        if (t.completed) li.classList.add('completed');
        li.innerHTML = `
            <span>${t.text}</span>
            <span class="status-icon">${t.completed ? '✅' : '⏳'}</span>
        `;
        li.onclick = () => toggleTask(t.id);
        taskList.appendChild(li);
    });
}

function addTask() {
    if (!taskInput.value.trim()) return;
    tasks.push({ id: Date.now(), text: taskInput.value.trim(), completed: false });
    taskInput.value = '';
    renderTasks();
}

// ==========================================
// LÓGICA DEL WEBHOOK CON LOGGING
// ==========================================
async function toggleTask(id) {
    const tarea = tasks.find(x => x.id === id);
    if (!tarea) return;

    tarea.completed = !tarea.completed;
    renderTasks();

    if (tarea.completed) {
        await enviarWebhookSeguro(tarea);
    }
}

async function enviarWebhookSeguro(tarea) {
    const timestamp = new Date().toISOString();
    const url = 'https://hook.make.com/fake-webhook-url';

    // Simulamos un 30% de fallo en la red
    const simulacionFallo = Math.random() < 0.3;

    try {
        // Simulamos la latencia de red
        await sleep(800);

        if (simulacionFallo) {
            throw new Error("Error 500: El servidor de Make no responde");
        }

        // === CASO ÉXITO ===
        okCount++;
        document.getElementById('count-ok').textContent = okCount;
        
        console.log(`[WEBHOOK OK] POST ${url} → Tarea ID: ${tarea.id}`);
        addSupabaseLog(timestamp, "Ninguno", "OK");

    } catch (error) {
        // === CASO ERROR (TRY/CATCH EN ACCIÓN) ===
        errorCount++;
        document.getElementById('count-error').textContent = errorCount;
        
        console.error(`[WEBHOOK ERROR] Tarea ${tarea.id}: ${error.message}`);
        console.warn(`[FALLBACK] La tarea se guardó localmente. Se reintentará luego.`);
        
        addSupabaseLog(timestamp, error.message, "ERROR");
    }
}

// ==========================================
// UTILIDADES DE UI
// ==========================================
function logToConsole(msg, type) {
    const div = document.createElement('div');
    div.className = 'log-line';
    
    const time = new Date().toLocaleTimeString();
    let colorClass = '';
    if (type === 'error') colorClass = 'log-error';
    else if (type === 'ok') colorClass = 'log-ok';
    else if (type === 'warn') colorClass = 'log-warn';

    div.innerHTML = `<span class="log-time">[${time}]</span> <span class="${colorClass}">${msg}</span>`;
    consoleBox.appendChild(div);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function addSupabaseLog(timestamp, errorMsg, status) {
    const div = document.createElement('div');
    div.className = 'table-row';
    
    const timeShort = new Date(timestamp).toLocaleTimeString();
    const statusClass = status === 'OK' ? 'ok' : 'error';

    div.innerHTML = `
        <span style="color:#94a3b8;">${timeShort}</span>
        <span style="color:${status === 'OK' ? '#475569' : '#e74c3c'};">${errorMsg}</span>
        <span><span class="badge-status ${statusClass}">${status}</span></span>
    `;
    supabaseTable.appendChild(div);
    supabaseTable.scrollTop = supabaseTable.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Sobrescribimos console.log y console.error para que salgan en nuestra UI
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(msg) { originalLog(msg); logToConsole(msg, 'ok'); };
console.error = function(msg) { originalError(msg); logToConsole(msg, 'error'); };
console.warn = function(msg) { originalWarn(msg); logToConsole(msg, 'warn'); };

// Inicio
renderTasks();
