/**
 * Módulo de CRM AFM Tools
 * Maneja CRUD de clientes y trabajos con Supabase
 */

const AFPCRM = {
    clients: [],
    jobs: [],
    
    /**
     * Cargar todos los clientes del usuario
     */
    async loadClients() {
        const userId = AFMAuth.getUserId();
        if (!userId) return [];
        
        const { data, error } = await AFM.supabase
            .from('clients')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error cargando clientes:', error);
            throw error;
        }
        
        this.clients = data || [];
        return this.clients;
    },
    
    /**
     * Cargar todos los trabajos del usuario
     */
    async loadJobs() {
        const userId = AFMAuth.getUserId();
        if (!userId) return [];
        
        const { data, error } = await AFM.supabase
            .from('jobs')
            .select(`
                *,
                clients(name, phone),
                budgets(number, total)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error cargando trabajos:', error);
            throw error;
        }
        
        this.jobs = data || [];
        return this.jobs;
    },
    
    // ========== CLIENTES ==========
    
    /**
     * Crear nuevo cliente
     * @param {Object} clientData 
     */
    async createClient(clientData) {
        const userId = AFMAuth.getUserId();
        if (!userId) throw new Error('Usuario no autenticado');
        
        const { data, error } = await AFM.supabase
            .from('clients')
            .insert({
                user_id: userId,
                name: clientData.name,
                phone: clientData.phone,
                email: clientData.email || '',
                address: clientData.address || '',
                notes: clientData.notes || ''
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creando cliente:', error);
            throw error;
        }
        
        this.clients.unshift(data);
        return data;
    },
    
    /**
     * Actualizar cliente
     * @param {string} id 
     * @param {Object} clientData 
     */
    async updateClient(id, clientData) {
        const { data, error } = await AFM.supabase
            .from('clients')
            .update({
                name: clientData.name,
                phone: clientData.phone,
                email: clientData.email || '',
                address: clientData.address || '',
                notes: clientData.notes || ''
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error actualizando cliente:', error);
            throw error;
        }
        
        const index = this.clients.findIndex(c => c.id === id);
        if (index !== -1) {
            this.clients[index] = data;
        }
        
        return data;
    },
    
    /**
     * Eliminar cliente
     * @param {string} id 
     */
    async deleteClient(id) {
        const { error } = await AFM.supabase
            .from('clients')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error eliminando cliente:', error);
            throw error;
        }
        
        this.clients = this.clients.filter(c => c.id !== id);
        return true;
    },
    
    // ========== TRABAJOS ==========
    
    /**
     * Crear nuevo trabajo
     * @param {Object} jobData 
     */
    async createJob(jobData) {
        const userId = AFMAuth.getUserId();
        if (!userId) throw new Error('Usuario no autenticado');
        
        const { data, error } = await AFM.supabase
            .from('jobs')
            .insert({
                user_id: userId,
                client_id: jobData.clientId,
                budget_id: jobData.budgetId || null,
                date: jobData.date,
                description: jobData.description,
                status: jobData.status || 'pendiente',
                amount: jobData.amount || 0
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creando trabajo:', error);
            throw error;
        }
        
        this.jobs.unshift(data);
        return data;
    },
    
    /**
     * Actualizar trabajo
     * @param {string} id 
     * @param {Object} jobData 
     */
    async updateJob(id, jobData) {
        const { data, error } = await AFM.supabase
            .from('jobs')
            .update({
                client_id: jobData.clientId,
                budget_id: jobData.budgetId || null,
                date: jobData.date,
                description: jobData.description,
                status: jobData.status,
                amount: jobData.amount || 0
            })
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error actualizando trabajo:', error);
            throw error;
        }
        
        const index = this.jobs.findIndex(j => j.id === id);
        if (index !== -1) {
            this.jobs[index] = data;
        }
        
        return data;
    },
    
    /**
     * Cambiar estado de trabajo
     * @param {string} id 
     * @param {string} status 
     */
    async updateJobStatus(id, status) {
        const { data, error } = await AFM.supabase
            .from('jobs')
            .update({ status })
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error actualizando estado:', error);
            throw error;
        }
        
        const index = this.jobs.findIndex(j => j.id === id);
        if (index !== -1) {
            this.jobs[index] = data;
        }
        
        return data;
    },
    
    /**
     * Eliminar trabajo
     * @param {string} id 
     */
    async deleteJob(id) {
        const { error } = await AFM.supabase
            .from('jobs')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error eliminando trabajo:', error);
            throw error;
        }
        
        this.jobs = this.jobs.filter(j => j.id !== id);
        return true;
    },
    
    // ========== DASHBOARD ==========
    
    /**
     * Obtener estadísticas para el dashboard
     */
    getStats() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const totalClients = this.clients.length;
        
        const pendingJobs = this.jobs.filter(j => 
            j.status === 'pendiente' || j.status === 'proceso'
        ).length;
        
        const monthIncome = this.jobs
            .filter(j => j.status === 'finalizado')
            .filter(j => {
                const jobDate = new Date(j.date);
                return jobDate.getMonth() === currentMonth && 
                       jobDate.getFullYear() === currentYear;
            })
            .reduce((sum, j) => sum + (j.amount || 0), 0);
        
        const totalIncome = this.jobs
            .filter(j => j.status === 'finalizado')
            .reduce((sum, j) => sum + (j.amount || 0), 0);
        
        return {
            totalClients,
            pendingJobs,
            monthIncome,
            totalIncome
        };
    },
    
    /**
     * Renderizar clientes en el DOM
     */
    renderClients() {
        const tbody = document.getElementById('clientsTableBody');
        const empty = document.getElementById('clientsEmpty');
        
        if (!tbody) return;
        
        if (this.clients.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        tbody.innerHTML = this.clients.map(client => `
            <tr>
                <td><strong>${escapeHtml(client.name)}</strong></td>
                <td>${escapeHtml(client.phone)}</td>
                <td>${escapeHtml(client.email) || '-'}</td>
                <td>${escapeHtml(client.address) || '-'}</td>
                <td>${escapeHtml(client.notes) || '-'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="AFPCRMEditClient('${client.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="AFPCRMDeleteClient('${client.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        this.updateClientSelect();
    },
    
    /**
     * Renderizar trabajos en el DOM
     */
    renderJobs() {
        const tbody = document.getElementById('jobsTableBody');
        const empty = document.getElementById('jobsEmpty');
        
        if (!tbody) return;
        
        if (this.jobs.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = 'block';
            return;
        }
        
        if (empty) empty.style.display = 'none';
        
        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString('es-AR');
        };
        
        const formatCurrency = (num) => {
            return '$' + (num || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        };
        
        const statusLabels = {
            'pendiente': 'Pendiente',
            'proceso': 'En Proceso',
            'finalizado': 'Finalizado'
        };
        
        tbody.innerHTML = this.jobs.map(job => `
            <tr>
                <td>${formatDate(job.date)}</td>
                <td><strong>${escapeHtml(job.clients?.name || 'Sin cliente')}</strong></td>
                <td>${escapeHtml(job.description)}</td>
                <td>
                    <select class="status-select" onchange="AFPCRMUpdateStatus('${job.id}', this.value)" 
                            data-current="${job.status}">
                        <option value="pendiente" ${job.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="proceso" ${job.status === 'proceso' ? 'selected' : ''}>En Proceso</option>
                        <option value="finalizado" ${job.status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
                    </select>
                </td>
                <td>${formatCurrency(job.amount)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="AFPCRMEditJob('${job.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="AFPCRMDeleteJob('${job.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    },
    
    /**
     * Actualizar selector de clientes en formulario de trabajos
     */
    updateClientSelect() {
        const select = document.getElementById('jobClient');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar cliente...</option>' +
            this.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    },
    
    /**
     * Actualizar dashboard
     */
    updateDashboard() {
        const stats = this.getStats();
        
        const totalClients = document.getElementById('totalClients');
        const pendingJobs = document.getElementById('pendingJobs');
        const monthIncome = document.getElementById('monthIncome');
        const totalIncome = document.getElementById('totalIncome');
        
        if (totalClients) totalClients.textContent = stats.totalClients;
        if (pendingJobs) pendingJobs.textContent = stats.pendingJobs;
        if (monthIncome) monthIncome.textContent = '$' + stats.monthIncome.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        if (totalIncome) totalIncome.textContent = '$' + stats.totalIncome.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
};

// ========== FUNCIONES GLOBALES ==========

async function AFPCRMInit() {
    showLoader();
    try {
        await AFPCRM.loadClients();
        await AFPCRM.loadJobs();
        AFPCRM.renderClients();
        AFPCRM.renderJobs();
        AFPCRM.updateDashboard();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar datos');
    } finally {
        hideLoader();
    }
}

async function AFPCRMAddClient(e) {
    e.preventDefault();
    
    const clientData = {
        name: document.getElementById('clientName').value,
        phone: document.getElementById('clientPhone').value,
        email: document.getElementById('clientEmail').value,
        address: document.getElementById('clientAddress').value,
        notes: document.getElementById('clientNotes').value
    };
    
    showLoader();
    try {
        await AFPCRM.createClient(clientData);
        document.getElementById('clientForm').reset();
        AFPCRM.renderClients();
        AFPCRM.updateDashboard();
        showSuccess('Cliente agregado');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al agregar cliente');
    } finally {
        hideLoader();
    }
}

function AFPCRMEditClient(id) {
    const client = AFPCRM.clients.find(c => c.id === id);
    if (!client) return;
    
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientPhone').value = client.phone;
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientAddress').value = client.address || '';
    document.getElementById('clientNotes').value = client.notes || '';
    
    // Guardar ID para actualizar
    document.getElementById('clientForm').dataset.editId = id;
    document.getElementById('clientName').focus();
}

async function AFPCRMDeleteClient(id) {
    if (!confirm('¿Eliminar este cliente? Los trabajos asociados también se eliminarán.')) return;
    
    showLoader();
    try {
        await AFPCRM.deleteClient(id);
        AFPCRM.renderClients();
        await AFPCRM.loadJobs();
        AFPCRM.renderJobs();
        AFPCRM.updateDashboard();
        showSuccess('Cliente eliminado');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar cliente');
    } finally {
        hideLoader();
    }
}

async function AFPCRMAddJob(e) {
    e.preventDefault();
    
    const jobData = {
        clientId: document.getElementById('jobClient').value,
        date: document.getElementById('jobDate').value,
        description: document.getElementById('jobDescription').value,
        status: document.getElementById('jobStatus').value,
        amount: parseFloat(document.getElementById('jobAmount').value) || 0
    };
    
    if (!jobData.clientId) {
        showError('Selecciona un cliente');
        return;
    }
    
    showLoader();
    try {
        await AFPCRM.createJob(jobData);
        document.getElementById('jobForm').reset();
        document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
        AFPCRM.renderJobs();
        AFPCRM.updateDashboard();
        showSuccess('Trabajo agregado');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al agregar trabajo');
    } finally {
        hideLoader();
    }
}

function AFPCRMEditJob(id) {
    const job = AFPCRM.jobs.find(j => j.id === id);
    if (!job) return;
    
    document.getElementById('jobClient').value = job.client_id || '';
    document.getElementById('jobDate').value = job.date;
    document.getElementById('jobStatus').value = job.status;
    document.getElementById('jobDescription').value = job.description;
    document.getElementById('jobAmount').value = job.amount || 0;
    
    document.getElementById('jobForm').dataset.editId = id;
    document.getElementById('jobDescription').focus();
}

async function AFPCRMDeleteJob(id) {
    if (!confirm('¿Eliminar este trabajo?')) return;
    
    showLoader();
    try {
        await AFPCRM.deleteJob(id);
        AFPCRM.renderJobs();
        AFPCRM.updateDashboard();
        showSuccess('Trabajo eliminado');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar trabajo');
    } finally {
        hideLoader();
    }
}

async function AFPCRMUpdateStatus(id, status) {
    showLoader();
    try {
        await AFPCRM.updateJobStatus(id, status);
        AFPCRM.updateDashboard();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al actualizar estado');
    } finally {
        hideLoader();
    }
}

// Helper para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Funciones helper globales
function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert(message);
}

// Exportar
window.AFPCRM = AFPCRM;
