const API_URL = 'https://to-do-list-api-8qru.onrender.com/tarefas'; 

let allTasks = []; 

// Inicialização (Carrega assim que a página abre)
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    fetchTasks();
    setupFilters(); // Nova função que conserta os botões
    setupModal();   // Configura o modal de nova tarefa
});

// --- 1. CONFIGURAÇÃO DOS FILTROS (A CORREÇÃO) ---
function setupFilters() {
    const tabs = document.querySelectorAll('.tab');
    
    // Se encontrou os 4 botões, configura o clique de cada um
    if(tabs.length >= 4) {
        // Botão "Todas"
        tabs[0].onclick = () => applyFilter('all', tabs[0]);
        // Botão "Hoje"
        tabs[1].onclick = () => applyFilter('today', tabs[1]);
        // Botão "Pendentes"
        tabs[2].onclick = () => applyFilter('pending', tabs[2]);
        // Botão "Concluídas"
        tabs[3].onclick = () => applyFilter('done', tabs[3]);
    }
}

// Lógica de Filtragem
function applyFilter(type, btnElement) {
    // 1. Atualiza visual (Muda a cor do botão ativo)
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    // 2. Filtra os dados
    let filtered = [];
    if (type === 'all') filtered = allTasks;
    if (type === 'pending') filtered = allTasks.filter(t => t.status !== 'concluída');
    if (type === 'done') filtered = allTasks.filter(t => t.status === 'concluída');
    if (type === 'today') {
        const todayStr = new Date().toDateString(); // Ex: "Wed Jan 28 2026"
        filtered = allTasks.filter(t => {
            // Converte a data da tarefa para o mesmo formato
            const taskDate = new Date(t.createdAt).toDateString();
            return taskDate === todayStr;
        });
    }

    // 3. Mostra na tela
    renderTasks(filtered);
}

// --- 2. BUSCAR TAREFAS (API) ---
async function fetchTasks() {
    try {
        const res = await fetch(API_URL);
        if(!res.ok) throw new Error("Erro na conexão");
        
        allTasks = await res.json();
        
        // Atualiza tudo
        updateStats();
        renderTasks(allTasks); // Começa mostrando todas
        updateChart();
    } catch (error) {
        console.error("Erro ao buscar:", error);
    }
}

// --- 3. RENDERIZAR LISTA ---
function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    if(!list) return;
    list.innerHTML = '';

    tasks.forEach(task => {
        const date = new Date(task.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'});
        
        // Configuração de Cores
        let color = '#4318ff'; // Roxo (A fazer)
        let icon = 'fa-play';
        
        if(task.status === 'em andamento') { color = '#ffb547'; icon = 'fa-check'; }
        if(task.status === 'concluída') { color = '#05cd99'; icon = 'fa-undo'; }

        const li = document.createElement('li');
        li.className = 'task-item';
        li.style.borderLeft = `5px solid ${color}`;
        
        li.innerHTML = `
            <div class="task-content">
                <h4>${task.titulo}</h4>
                <p>${task.descricao || ''}</p>
                <div class="task-meta">
                    <span class="badge ${task.status.replace(' ', '-')}">${task.status}</span>
                    <span><i class="far fa-calendar"></i> ${date}</span>
                </div>
            </div>
            <div class="actions">
                <button class="btn-check" onclick="toggleStatus(${task.id}, '${task.status}')" style="color:${color}">
                    <i class="fas ${icon}"></i>
                </button>
                <button class="btn-delete" onclick="deleteTask(${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(li);
    });
}

// --- 4. ESTATÍSTICAS E GRÁFICO ---
function updateStats() {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === 'concluída').length;
    const pending = total - done;
    
    // Tarefas de Hoje
    const todayStr = new Date().toDateString();
    const todayCount = allTasks.filter(t => new Date(t.createdAt).toDateString() === todayStr).length;

    setText('total-count', total);
    setText('done-count', done);
    setText('pending-count', pending);
    setText('today-count', todayCount);
    setText('mini-done', done);
    setText('mini-pending', pending);
}

function updateChart() {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === 'concluída').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    const circle = document.getElementById('progress-circle');
    const text = document.getElementById('progress-text');
    
    if(circle) circle.style.background = `conic-gradient(#4318ff ${percent * 3.6}deg, #ededed 0deg)`;
    if(text) text.innerText = `${percent}%`;
}

// --- 5. AÇÕES (NOVA, STATUS, DELETE) ---
function setupModal() {
    const btnNew = document.getElementById('btn-new-task');
    const modal = document.getElementById('modal-wrapper');
    const form = document.getElementById('task-form');

    if(btnNew && modal) {
        btnNew.onclick = () => {
            modal.style.display = 'flex';
            document.getElementById('titulo').focus();
        };

        // Fechar ao clicar fora
        window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; };
        
        // Botão de fechar (X)
        const closeBtn = modal.querySelector('button'); 
        if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    }

    if(form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Salvando...';
            btn.disabled = true;

            const newTask = {
                titulo: document.getElementById('titulo').value,
                descricao: document.getElementById('descricao').value,
                status: 'a fazer'
            };

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(newTask)
                });

                if(res.ok) {
                    if(modal) modal.style.display = 'none';
                    document.getElementById('titulo').value = '';
                    document.getElementById('descricao').value = '';
                    fetchTasks();
                } else {
                    const data = await res.json();
                    alert('Erro: ' + (data.erro || data.detalhes || 'Desconhecido'));
                }
            } catch (error) {
                console.error(error);
                alert('Erro de conexão');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
}

// Funções chamadas pelo HTML (precisam ser window.funcao)
window.toggleStatus = async function(id, current) {
    const newStatus = current === 'concluída' ? 'a fazer' : 'concluída';
    try {
        await fetch(`${API_URL}/${id}/status`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({status: newStatus})
        });
        fetchTasks();
    } catch(e) { console.error(e); }
};

window.deleteTask = async function(id) {
    if(confirm('Tem certeza?')) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchTasks();
        } catch(e) { console.error(e); }
    }
};

// Utilitários
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
}

function updateDate() {
    const el = document.getElementById('current-date');
    if(el) {
        const d = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        el.innerText = d.charAt(0).toUpperCase() + d.slice(1);
    }
}