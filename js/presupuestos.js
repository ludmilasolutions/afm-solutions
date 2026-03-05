/**
 * Módulo de Presupuestos AFM Tools
 * Maneja CRUD de presupuestos y sus ítems con Supabase
 */

const AFPPresupuestos = {
    budgets: [],
    currentBudget: null,
    
    /**
     * Cargar todos los presupuestos del usuario
     */
    async loadBudgets() {
        const userId = AFMAuth.getUserId();
        if (!userId) return [];
        
        const { data, error } = await AFM.supabase
            .from('budgets')
            .select(`
                *,
                clients(name, phone),
                budget_items(*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error cargando presupuestos:', error);
            throw error;
        }
        
        this.budgets = data || [];
        return this.budgets;
    },
    
    /**
     * Crear un nuevo presupuesto
     * @param {Object} budgetData - Datos del presupuesto
     */
    async createBudget(budgetData) {
        const userId = AFMAuth.getUserId();
        if (!userId) throw new Error('Usuario no autenticado');
        
        // Generar número de presupuesto
        const number = await this.generateBudgetNumber();
        
        // Insertar presupuesto
        const { data: budget, error: budgetError } = await AFM.supabase
            .from('budgets')
            .insert({
                user_id: userId,
                client_id: budgetData.clientId || null,
                number: number,
                date: budgetData.date,
                total: budgetData.total,
                observations: budgetData.observations || ''
            })
            .select()
            .single();
        
        if (budgetError) {
            console.error('Error creando presupuesto:', budgetError);
            throw budgetError;
        }
        
        // Insertar ítems
        if (budgetData.items && budgetData.items.length > 0) {
            const itemsToInsert = budgetData.items.map(item => ({
                budget_id: budget.id,
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.quantity * item.price
            }));
            
            const { error: itemsError } = await AFM.supabase
                .from('budget_items')
                .insert(itemsToInsert);
            
            if (itemsError) {
                console.error('Error inserting items:', itemsError);
                // No lanzar error, el presupuesto ya fue creado
            }
        }
        
        return budget;
    },
    
    /**
     * Obtener un presupuesto por ID
     * @param {string} id 
     */
    async getBudget(id) {
        const { data, error } = await AFM.supabase
            .from('budgets')
            .select(`
                *,
                clients(name, phone, email),
                budget_items(*)
            `)
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Error obteniendo presupuesto:', error);
            throw error;
        }
        
        return data;
    },
    
    /**
     * Eliminar un presupuesto
     * @param {string} id 
     */
    async deleteBudget(id) {
        // Primero eliminar ítems
        const { error: itemsError } = await AFM.supabase
            .from('budget_items')
            .delete()
            .eq('budget_id', id);
        
        if (itemsError) {
            console.error('Error eliminando ítems:', itemsError);
        }
        
        // Luego eliminar presupuesto
        const { error: budgetError } = await AFM.supabase
            .from('budgets')
            .delete()
            .eq('id', id);
        
        if (budgetError) {
            console.error('Error eliminando presupuesto:', budgetError);
            throw budgetError;
        }
        
        this.budgets = this.budgets.filter(b => b.id !== id);
        return true;
    },
    
    /**
     * Convertir presupuesto en trabajo
     * @param {string} budgetId 
     */
    async convertToJob(budgetId) {
        const userId = AFMAuth.getUserId();
        if (!userId) throw new Error('Usuario no autenticado');
        
        const budget = await this.getBudget(budgetId);
        
        const { data: job, error } = await AFM.supabase
            .from('jobs')
            .insert({
                user_id: userId,
                client_id: budget.client_id,
                budget_id: budgetId,
                date: new Date().toISOString().split('T')[0],
                description: `Trabajo derivado del presupuesto ${budget.number}`,
                status: 'pendiente',
                amount: budget.total
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error convirtiendo a trabajo:', error);
            throw error;
        }
        
        return job;
    },
    
    /**
     * Generar número de presupuesto automático
     */
    async generateBudgetNumber() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        // Contar presupuestos del mes actual
        const { count } = await AFM.supabase
            .from('budgets')
            .select('*', { count: 'exact', head: true });
        
        const num = (count || 0) + 1;
        return `PRES-${year}${month}-${num.toString().padStart(4, '0')}`;
    },
    
    /**
     * Renderizar lista de presupuestos en el DOM
     */
    renderBudgetsList() {
        const container = document.getElementById('budgetsList');
        if (!container) return;
        
        if (this.budgets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <p>No hay presupuestos guardados</p>
                </div>
            `;
            return;
        }
        
        const formatCurrency = (num) => '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('es-AR');
        
        container.innerHTML = this.budgets.map(budget => `
            <div class="budget-item">
                <div class="budget-header">
                    <span class="budget-number">${budget.number}</span>
                    <span class="budget-date">${formatDate(budget.date)}</span>
                </div>
                <div class="budget-client">
                    <i class="fas fa-user"></i>
                    ${budget.clients?.name || 'Sin cliente'}
                </div>
                <div class="budget-total">
                    <strong>${formatCurrency(budget.total)}</strong>
                </div>
                <div class="budget-actions">
                    <button class="btn btn-sm btn-primary" onclick="AFPViewBudget('${budget.id}')">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-success" onclick="AFPConvertToJob('${budget.id}')">
                        <i class="fas fa-briefcase"></i> Convertir en trabajo
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="AFPDeleteBudget('${budget.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
};

// Funciones globales para usar en el HTML
async function AFPLoadBudgets() {
    showLoader();
    try {
        await AFPPresupuestos.loadBudgets();
        AFPPresupuestos.renderBudgetsList();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar presupuestos');
    } finally {
        hideLoader();
    }
}

async function AFPSaveBudget(budgetData) {
    showLoader();
    try {
        await AFPPresupuestos.createBudget(budgetData);
        showSuccess('Presupuesto guardado correctamente');
        await AFPPresupuestos.loadBudgets();
        AFPPresupuestos.renderBudgetsList();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al guardar presupuesto');
    } finally {
        hideLoader();
    }
}

async function AFPViewBudget(id) {
    showLoader();
    try {
        const budget = await AFPPresupuestos.getBudget(id);
        // Cargar datos en el formulario
        document.getElementById('budgetNumber').value = budget.number;
        document.getElementById('budgetDate').value = budget.date;
        
        if (budget.clients) {
            document.getElementById('clientName').value = budget.clients.name || '';
            document.getElementById('clientPhone').value = budget.clients.phone || '';
            document.getElementById('clientEmail').value = budget.clients.email || '';
        }
        
        document.getElementById('observations').value = budget.observations || '';
        
        // Cargar ítems
        const tbody = document.getElementById('itemsBody');
        tbody.innerHTML = '';
        
        if (budget.budget_items && budget.budget_items.length > 0) {
            budget.budget_items.forEach(item => {
                addItemRow(item.description, item.quantity, item.price);
            });
        } else {
            addItemRow();
        }
        
        calculateTotal();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar presupuesto');
    } finally {
        hideLoader();
    }
}

async function AFPConvertToJob(id) {
    if (!confirm('¿Convertir este presupuesto en un trabajo?')) return;
    
    showLoader();
    try {
        await AFPPresupuestos.convertToJob(id);
        showSuccess('Presupuesto convertido en trabajo');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al convertir presupuesto');
    } finally {
        hideLoader();
    }
}

async function AFPDeleteBudget(id) {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    
    showLoader();
    try {
        await AFPPresupuestos.deleteBudget(id);
        AFPPresupuestos.renderBudgetsList();
        showSuccess('Presupuesto eliminado');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al eliminar presupuesto');
    } finally {
        hideLoader();
    }
}

// Funciones helper
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
window.AFPPresupuestos = AFPPresupuestos;
