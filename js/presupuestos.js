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
     * Crear un nuevo presupuesto.
     * Si budgetData.clientName está presente, crea (o reutiliza) el cliente.
     * @param {Object} budgetData
     */
    async createBudget(budgetData) {
        const userId = AFMAuth.getUserId();
        if (!userId) throw new Error('Usuario no autenticado');

        // ── 1. Resolver cliente ──────────────────────────────────────────────
        let clientId = budgetData.clientId || null;

        if (!clientId && budgetData.clientName) {
            // Buscar si ya existe un cliente con ese nombre para este usuario
            const { data: existingClients } = await AFM.supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId)
                .ilike('name', budgetData.clientName.trim())
                .limit(1);

            if (existingClients && existingClients.length > 0) {
                clientId = existingClients[0].id;
            } else {
                // Crear cliente nuevo
                const { data: newClient, error: clientError } = await AFM.supabase
                    .from('clients')
                    .insert({
                        user_id: userId,
                        name: budgetData.clientName.trim(),
                        phone: budgetData.clientPhone || '',
                        email: budgetData.clientEmail || '',
                        address: '',
                        notes: ''
                    })
                    .select()
                    .single();

                if (clientError) {
                    console.error('Error creando cliente:', clientError);
                    // Continuar sin cliente en vez de romper todo
                } else {
                    clientId = newClient.id;
                }
            }
        }

        // ── 2. Generar número de presupuesto ─────────────────────────────────
        const number = await this.generateBudgetNumber();

        // Actualizar el input visible si existe
        const numEl = document.getElementById('budgetNumber');
        if (numEl) numEl.value = number;

        // ── 3. Insertar presupuesto ──────────────────────────────────────────
        const { data: budget, error: budgetError } = await AFM.supabase
            .from('budgets')
            .insert({
                user_id: userId,
                client_id: clientId,
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

        // ── 4. Insertar ítems ────────────────────────────────────────────────
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
                console.error('Error insertando ítems:', itemsError);
            }
        }

        return budget;
    },

    /**
     * Obtener un presupuesto por ID
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
     * Eliminar un presupuesto (los ítems se eliminan solos por CASCADE en el schema)
     */
    async deleteBudget(id) {
        const { error } = await AFM.supabase
            .from('budgets')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error eliminando presupuesto:', error);
            throw error;
        }

        this.budgets = this.budgets.filter(b => b.id !== id);
        return true;
    },

    /**
     * Convertir presupuesto en trabajo
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

        const formatCurrency = (num) => '$' + Number(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const formatDate = (dateStr) => {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('es-AR');
        };

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
                        <i class="fas fa-briefcase"></i> A trabajo
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="AFPDeleteBudget('${budget.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
};

// ── Funciones globales para usar en el HTML ───────────────────────────────────

async function AFPLoadBudgets() {
    showLoader();
    try {
        await AFPPresupuestos.loadBudgets();
        AFPPresupuestos.renderBudgetsList();
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar presupuestos: ' + error.message);
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
        showError('Error al guardar: ' + error.message);
    } finally {
        hideLoader();
    }
}

async function AFPViewBudget(id) {
    showLoader();
    try {
        const budget = await AFPPresupuestos.getBudget(id);

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
                addItem(item.description, item.quantity, item.price);
            });
        } else {
            addItem();
        }

        calculateTotal();

        // Scroll al formulario
        document.getElementById('budgetForm').scrollIntoView({ behavior: 'smooth' });

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
        showSuccess('Presupuesto convertido en trabajo. Podés verlo en el CRM.');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al convertir presupuesto');
    } finally {
        hideLoader();
    }
}

async function AFPDeleteBudget(id) {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;

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

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Exportar
window.AFPPresupuestos = AFPPresupuestos;
