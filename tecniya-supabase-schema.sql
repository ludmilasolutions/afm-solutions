-- =============================================
-- TECNIYA - AFM Solutions
-- Esquema de Base de Datos para Plataforma de Profesionales
-- Ejecutar este SQL en el SQL Editor de Supabase
-- =============================================

-- =============================================
-- TABLA: profiles (Extiende auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'professional', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: specialties (Especialidades de profesionales)
-- =============================================
CREATE TABLE IF NOT EXISTS public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: provinces (Provincias)
-- =============================================
CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: cities (Ciudades)
-- =============================================
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, province_id)
);

-- =============================================
-- TABLA: professionals (Perfiles de profesionales)
-- =============================================
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
    business_name TEXT,
    description TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    zones TEXT[], -- Array de zonas donde trabaja
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_certified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMPTZ,
    is_available BOOLEAN DEFAULT true,
    available_days TEXT[], -- ['lunes', 'martes', ...]
    available_hours TEXT, -- '08:00-18:00'
    urgency_service BOOLEAN DEFAULT false,
    rating_avg DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_jobs INTEGER DEFAULT 0,
    profile_photo TEXT,
    cover_photo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: certifications (Certificaciones de profesionales)
-- =============================================
CREATE TABLE IF NOT EXISTS public.certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    issuer TEXT,
    document_url TEXT,
    issue_date DATE,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: work_photos (Fotos de trabajos realizados)
-- =============================================
CREATE TABLE IF NOT EXISTS public.work_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: jobs (Trabajos/Solicitudes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    specialty_id UUID REFERENCES public.specialties(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    zone TEXT,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    urgency BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'aceptado', 'en_proceso', 'finalizado', 'cancelado')),
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    price DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: reviews (Reseñas/Puntuaciones)
-- =============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    price_rating INTEGER CHECK (price_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    overall_rating DECIMAL(3, 2),
    comment TEXT,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: subscriptions (Suscripciones de profesionales destacados)
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    plan TEXT DEFAULT 'destacado',
    amount DECIMAL(10, 2) DEFAULT 5000,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    payment_method TEXT,
    transaction_id TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: ads (Publicidad)
-- =============================================
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link TEXT,
    level TEXT DEFAULT 'nacional' CHECK (level IN ('nacional', 'provincia', 'ciudad')),
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: favorites (Profesionales favoritos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, professional_id)
);

-- =============================================
-- TABLA: addresses (Direcciones guardadas por usuarios)
-- =============================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    address TEXT NOT NULL,
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    zone TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: budgets (Presupuestos)
-- =============================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    items JSONB, -- Array de items del presupuesto
    subtotal DECIMAL(12, 2),
    total DECIMAL(12, 2),
    validity_days INTEGER DEFAULT 30,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: chat_messages (Mensajes de chat)
-- =============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_professionals_specialty ON public.professionals(specialty_id);
CREATE INDEX IF NOT EXISTS idx_professionals_city ON public.professionals(city_id);
CREATE INDEX IF NOT EXISTS idx_professionals_province ON public.professionals(province_id);
CREATE INDEX IF NOT EXISTS idx_professionals_is_featured ON public.professionals(is_featured);
CREATE INDEX IF NOT EXISTS idx_professionals_is_certified ON public.professionals(is_certified);
CREATE INDEX IF NOT EXISTS idx_professionals_rating ON public.professionals(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_professional ON public.jobs(professional_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_specialty ON public.jobs(specialty_id);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_professional ON public.subscriptions(professional_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_ads_level ON public.ads(level);
CREATE INDEX IF NOT EXISTS idx_ads_location ON public.ads(province_id, city_id);
CREATE INDEX IF NOT EXISTS idx_budgets_professional ON public.budgets(professional_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_job ON public.chat_messages(job_id);

-- =============================================
-- FUNCIONES Y TRIGGERS
-- =============================================

-- Función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar rating promedio del profesional
CREATE OR REPLACE FUNCTION public.update_professional_rating()
RETURNS TRIGGER AS $$
DECLARE
    prof_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'reviews' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            prof_id := NEW.professional_id;
        ELSE
            prof_id := OLD.professional_id;
        END IF;
        
        UPDATE public.professionals
        SET 
            rating_avg = (
                SELECT COALESCE(AVG((punctuality_rating + quality_rating + price_rating + communication_rating) / 4.0), 0)
                FROM public.reviews
                WHERE professional_id = prof_id AND is_approved = true
            ),
            total_reviews = (
                SELECT COUNT(*)
                FROM public.reviews
                WHERE professional_id = prof_id AND is_approved = true
            )
        WHERE id = prof_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar rating
CREATE OR REPLACE TRIGGER on_review_change
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_professional_rating();

-- =============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS PARA PROFILES
-- =============================================
CREATE POLICY "Anyone can read profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA SPECIALTIES
-- =============================================
CREATE POLICY "Anyone can read specialties" ON public.specialties
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage specialties" ON public.specialties
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA PROVINCES
-- =============================================
CREATE POLICY "Anyone can read provinces" ON public.provinces
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage provinces" ON public.provinces
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA CITIES
-- =============================================
CREATE POLICY "Anyone can read cities" ON public.cities
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage cities" ON public.cities
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA PROFESSIONALS
-- =============================================
CREATE POLICY "Anyone can read active professionals" ON public.professionals
    FOR SELECT USING (is_active = true);

CREATE POLICY "Professionals can update own profile" ON public.professionals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create professional profile" ON public.professionals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all professionals" ON public.professionals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA CERTIFICATIONS
-- =============================================
CREATE POLICY "Anyone can read certifications" ON public.certifications
    FOR SELECT USING (true);

CREATE POLICY "Professionals can manage own certifications" ON public.certifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage certifications" ON public.certifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA WORK_PHOTOS
-- =============================================
CREATE POLICY "Anyone can read work photos" ON public.work_photos
    FOR SELECT USING (true);

CREATE POLICY "Professionals can manage own work photos" ON public.work_photos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

-- =============================================
-- POLÍTICAS RLS PARA JOBS
-- =============================================
CREATE POLICY "Users can read own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Professionals can read relevant jobs" ON public.jobs
    FOR SELECT USING (
        professional_id IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON public.jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Professionals can update relevant jobs" ON public.jobs
    FOR UPDATE USING (
        professional_id IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can read jobs for professionals list" ON public.jobs
    FOR SELECT USING (professional_id IS NULL);

CREATE POLICY "Admins can manage all jobs" ON public.jobs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA REVIEWS
-- =============================================
CREATE POLICY "Anyone can read approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE id = job_id AND user_id = auth.uid() AND status = 'finalizado'
        )
    );

CREATE POLICY "Users can update own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews" ON public.reviews
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA SUBSCRIPTIONS
-- =============================================
CREATE POLICY "Anyone can read active subscriptions" ON public.subscriptions
    FOR SELECT USING (status = 'active');

CREATE POLICY "Professionals can manage own subscriptions" ON public.subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA ADS
-- =============================================
CREATE POLICY "Anyone can read active ads" ON public.ads
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage ads" ON public.ads
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- POLÍTICAS RLS PARA FAVORITES
-- =============================================
CREATE POLICY "Users can manage own favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS PARA ADDRESSES
-- =============================================
CREATE POLICY "Users can manage own addresses" ON public.addresses
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- POLÍTICAS RLS PARA BUDGETS
-- =============================================
CREATE POLICY "Users can read own budgets" ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Professionals can read own budgets" ON public.budgets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Professionals can create budgets" ON public.budgets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid() AND is_featured = true
        )
    );

CREATE POLICY "Professionals can update own budgets" ON public.budgets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.professionals 
            WHERE id = professional_id AND user_id = auth.uid()
        )
    );

-- =============================================
-- POLÍTICAS RLS PARA CHAT_MESSAGES
-- =============================================
CREATE POLICY "Users can read own messages" ON public.chat_messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- =============================================
-- DATOS INICIALES - SPECIALTIES
-- =============================================
INSERT INTO public.specialties (name, icon, description) VALUES
    ('Electricista', 'fa-bolt', 'Servicios eléctricos residenciales y comerciales'),
    ('Plomero', 'fa-faucet', 'Instalaciones y reparaciones de plomería'),
    ('Carpintero', 'fa-hammer', 'Trabajos de carpintería y mueblería'),
    ('Pintor', 'fa-paint-roller', 'Pintura interior y exterior'),
    ('Albañil', 'fa-brick-wall', 'Construcción y reparaciones estructurales'),
    ('Mecánico', 'fa-car', 'Servicios mecánicos automotrices'),
    ('Técnico HVAC', 'fa-fan', 'Sistemas de climatización'),
    ('Técnico PC', 'fa-laptop', 'Reparación de computadoras'),
    ('Técnico Celulares', 'fa-mobile-screen', 'Reparación de móviles'),
    ('Jardinero', 'fa-leaf', 'Mantenimiento de jardines'),
    ('Limpieza', 'fa-broom', 'Servicios de limpieza'),
    ('Cerrajero', 'fa-key', 'Apertura y cambio de cerraduras'),
    ('Vidriero', 'fa-window-maximize', 'Instalación de vidrios'),
    ('Gasista', 'fa-fire-burner', 'Instalaciones de gas'),
    ('Paisajista', 'fa-tree', 'Diseño de espacios verdes')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- DATOS INICIALES - PROVINCES (Argentina)
-- =============================================
INSERT INTO public.provinces (name) VALUES
    ('Buenos Aires'),
    ('CABA'),
    ('Córdoba'),
    ('Santa Fe'),
    ('Mendoza'),
    ('Tucumán'),
    ('Entre Ríos'),
    ('Corrientes'),
    ('Misiones'),
    ('Chaco'),
    ('Formosa'),
    ('Santiago del Estero'),
    ('Catamarca'),
    ('La Rioja'),
    ('San Juan'),
    ('San Luis'),
    ('La Pampa'),
    ('Río Negro'),
    ('Neuquén'),
    ('Chubut'),
    ('Santa Cruz'),
    ('Tierra del Fuego')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
