-- =============================================
-- AFM TOOLS - Esquema de Base de Datos
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =============================================

-- =============================================
-- TABLA: clients (Clientes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: budgets (Presupuestos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    number TEXT NOT NULL,
    date DATE NOT NULL,
    total DECIMAL(12, 2) DEFAULT 0,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: budget_items (Ítems de Presupuesto)
-- =============================================
CREATE TABLE IF NOT EXISTS public.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    price DECIMAL(12, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: jobs (Trabajos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'proceso', 'finalizado')),
    amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_client_id ON public.budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON public.budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS PARA CLIENTS
-- =============================================

-- Permiso de lectura para el propietario
CREATE POLICY "Users can read own clients" ON public.clients
    FOR SELECT
    USING (auth.uid() = user_id);

-- Permiso de inserción para el propietario
CREATE POLICY "Users can insert own clients" ON public.clients
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Permiso de actualización para el propietario
CREATE POLICY "Users can update own clients" ON public.clients
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Permiso de eliminación para el propietario
CREATE POLICY "Users can delete own clients" ON public.clients
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS PARA BUDGETS
-- =============================================

-- Permiso de lectura para el propietario
CREATE POLICY "Users can read own budgets" ON public.budgets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Permiso de inserción para el propietario
CREATE POLICY "Users can insert own budgets" ON public.budgets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Permiso de actualización para el propietario
CREATE POLICY "Users can update own budgets" ON public.budgets
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Permiso de eliminación para el propietario
CREATE POLICY "Users can delete own budgets" ON public.budgets
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS PARA BUDGET_ITEMS
-- =============================================

-- Permiso de lectura (a través del presupuesto)
CREATE POLICY "Users can read own budget items" ON public.budget_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_items.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- Permiso de inserción (a través del presupuesto)
CREATE POLICY "Users can insert own budget items" ON public.budget_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_items.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- Permiso de actualización (a través del presupuesto)
CREATE POLICY "Users can update own budget items" ON public.budget_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_items.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- Permiso de eliminación (a través del presupuesto)
CREATE POLICY "Users can delete own budget items" ON public.budget_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_items.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- =============================================
-- POLÍTICAS RLS PARA JOBS
-- =============================================

-- Permiso de lectura para el propietario
CREATE POLICY "Users can read own jobs" ON public.jobs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Permiso de inserción para el propietario
CREATE POLICY "Users can insert own jobs" ON public.jobs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Permiso de actualización para el propietario
CREATE POLICY "Users can update own jobs" ON public.jobs
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Permiso de eliminación para el propietario
CREATE POLICY "Users can delete own jobs" ON public.jobs
    FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- CONFIGURACIÓN DE AUTENTICACIÓN
-- =============================================

-- Habilitar confirmación de email (opcional - comentar si no se quiere confirmación)
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTA: CONFIGURACIÓN DE GOOGLE OAUTH
-- =============================================
-- Para habilitar login con Google:
-- 1. Ir a Authentication > Providers > Google
-- 2. Habilitar Google
-- 3. Ingresar Client ID y Client Secret desde Google Cloud Console
-- 4. Agregar URL de redirect: https://[tu-proyecto].supabase.co/auth/v1/callback

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
