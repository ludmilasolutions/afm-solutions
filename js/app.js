/* =============================================
   TECNIYA - AFM Solutions
   JavaScript Principal
   ============================================= */

// Configuración de Supabase
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';

let supabase;
let currentUser = null;
let currentProfile = null;
let currentProfessional = null;

// Estado de la aplicación
let appState = {
    currentPage: 'home',
    filters: {
        province: '',
        city: '',
        specialty: '',
        onlyCertified: false,
        onlyFeatured: false,
        onlyAvailable: false,
        withUrgency: false
    },
    professionals: [],
    jobs: [],
    favorites: [],
    addresses: [],
    budgets: [],
    page: 1,
    totalPages: 1
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    setupEventListeners();
    await loadInitialData();
    checkAuthState();
    
    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(console.error);
    }
});

function initSupabase() {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

function setupEventListeners() {
    // Scroll header
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Star rating
    document.querySelectorAll('.star-rating').forEach(rating => {
        rating.querySelectorAll('i').forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.dataset.value);
                const container = star.parentElement;
                container.dataset.value = value;
                container.querySelectorAll('i').forEach((s, i) => {
                    s.classList.toggle('active', i < value);
                    s.classList.toggle('fas', i < value);
                    s.classList.toggle('far', i >= value);
                });
            });
        });
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('userDropdown')?.classList.remove('show');
        }
    });

    // Búsqueda con Enter
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProfessionals();
        }
    });
}

// =============================================
// AUTENTICACIÓN
// =============================================

async function checkAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }

    // Escuchar cambios en autenticación
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            await loadUserProfile();
            updateAuthUI(true);
        } else {
            currentUser = null;
            currentProfile = null;
            currentProfessional = null;
            updateAuthUI(false);
        }
    });
}

async function loadUserProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (profile) {
        currentProfile = profile;
        
        if (profile.role === 'professional') {
            const { data: professional } = await supabase
                .from('professionals')
                .select('*')
                .eq('user_id', currentUser.id)
                .single();
            
            currentProfessional = professional;
        }
    }
}

function updateAuthUI(isLoggedIn) {
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    
    if (isLoggedIn) {
        authLinks.style.display = 'none';
        userMenu.style.display = 'block';
        
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        
        if (currentProfile) {
            userName.textContent = currentProfile.full_name || currentProfile.email;
            if (currentProfile.avatar_url) {
                userAvatar.src = currentProfile.avatar_url;
            }
        }
    } else {
        authLinks.style.display = 'flex';
        userMenu.style.display = 'none';
    }
}

async function login(e) {
    e.preventDefault();
    showLoading();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    hideLoading();
    
    if (error) {
        showToast(error.message, 'error');
    } else {
        closeModal('loginModal');
        showToast('¡Bienvenido!', 'success');
    }
}

async function register(e) {
    e.preventDefault();
    showLoading();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                role: role
            }
        }
    });
    
    hideLoading();
    
    if (error) {
        showToast(error.message, 'error');
    } else {
        closeModal('registerModal');
        showToast('¡Cuenta creada! Verifica tu email.', 'success');
    }
}

async function loginWithGoogle() {
    showLoading();
    
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    
    hideLoading();
    
    if (error) {
        showToast(error.message, 'error');
    }
}

async function logout() {
    await supabase.auth.signOut();
    showToast('Sesión cerrada', 'success');
    showPage('home');
}

function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('show');
}

function toggleMobileMenu() {
    document.getElementById('navLinks').classList.toggle('show');
}

// =============================================
// NAVEGACIÓN
// =============================================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[onclick="showPage('${pageId}')"]`)?.classList.add('active');
    
    appState.currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Cargar datos según la página
    switch(pageId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'my-jobs':
            loadUserJobs();
            break;
        case 'favorites':
            loadFavorites();
            break;
        case 'addresses':
            loadAddresses();
            break;
        case 'budgets':
            loadBudgets();
            break;
        case 'settings':
            loadSettings();
            break;
    }
    
    return false;
}

function goBack() {
    history.back();
}

// =============================================
// CARGA DE DATOS INICIALES
// =============================================

async function loadInitialData() {
    await Promise.all([
        loadProvinces(),
        loadSpecialties(),
        loadFeaturedProfessionals(),
        loadCertifiedProfessionals(),
        loadTopRatedProfessionals(),
        loadAllProfessionals(),
        loadRandomAd()
    ]);
}

async function loadProvinces() {
    const { data: provinces } = await supabase
        .from('provinces')
        .select('*')
        .eq('is_active', true)
        .order('name');
    
    if (provinces) {
        const options = '<option value="">Provincia</option>' + 
            provinces.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        
        document.getElementById('provinceFilter').innerHTML = options;
        document.getElementById('provinceFilterList').innerHTML = '<option value="">Todas las provincias</option>' + options;
        document.getElementById('jobProvince').innerHTML = '<option value="">Selecciona provincia</option>' + options;
        document.getElementById('profProvince').innerHTML = '<option value="">Selecciona provincia</option>' + options;
        document.getElementById('addressProvince').innerHTML = '<option value="">Selecciona</option>' + options;
    }
}

async function loadCities() {
    const provinceId = document.getElementById('provinceFilter').value;
    if (!provinceId) return;
    
    const { data: cities } = await supabase
        .from('cities')
        .select('*')
        .eq('province_id', provinceId)
        .eq('is_active', true)
        .order('name');
    
    if (cities) {
        const options = '<option value="">Ciudad</option>' + 
            cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        document.getElementById('cityFilter').innerHTML = options;
    }
}

async function loadSpecialties() {
    const { data: specialties } = await supabase
        .from('specialties')
        .select('*')
        .eq('is_active', true)
        .order('name');
    
    if (specialties) {
        const options = '<option value="">Especialidad</option>' + 
            specialties.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        
        document.getElementById('specialtyFilter').innerHTML = options;
        document.getElementById('specialtyFilterList').innerHTML = '<option value="">Todas las especialidades</option>' + options;
        document.getElementById('jobSpecialty').innerHTML = '<option value="">Selecciona especialidad</option>' + options;
        document.getElementById('profSpecialty').innerHTML = '<option value="">Selecciona especialidad</option>' + options;
    }
}

// =============================================
// PROFESIONALES
// =============================================

async function loadFeaturedProfessionals() {
    const { data: professionals } = await supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `)
        .eq('is_featured', true)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false })
        .limit(6);
    
    if (professionals) {
        renderProfessionals('featuredProfessionals', professionals);
    }
}

async function loadCertifiedProfessionals() {
    const { data: professionals } = await supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `)
        .eq('is_certified', true)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false })
        .limit(6);
    
    if (professionals) {
        renderProfessionals('certifiedProfessionals', professionals);
    }
}

async function loadTopRatedProfessionals() {
    const { data: professionals } = await supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false })
        .limit(6);
    
    if (professionals) {
        renderProfessionals('topRatedProfessionals', professionals);
    }
}

async function loadAllProfessionals() {
    appState.page = 1;
    const limit = 12;
    
    let query = supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `, { count: 'exact' })
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('rating_avg', { ascending: false })
        .range(0, limit - 1);
    
    const { data: professionals, count } = await query;
    
    if (professionals) {
        appState.professionals = professionals;
        appState.totalPages = Math.ceil(count / limit);
        renderProfessionals('allProfessionals', professionals);
    }
}

async function loadMoreProfessionals() {
    if (appState.page >= appState.totalPages) return;
    
    appState.page++;
    const limit = 12;
    const offset = (appState.page - 1) * limit;
    
    const { data: professionals } = await supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('rating_avg', { ascending: false })
        .range(offset, offset + limit - 1);
    
    if (professionals) {
        appState.professionals = [...appState.professionals, ...professionals];
        renderProfessionals('allProfessionals', appState.professionals);
    }
}

function renderProfessionals(containerId, professionals) {
    const container = document.getElementById(containerId);
    
    if (!professionals || professionals.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron profesionales</p></div>';
        return;
    }
    
    container.innerHTML = professionals.map(p => `
        <div class="professional-card" onclick="showProfessionalDetail('${p.id}')">
            <div class="professional-card-header">
                <img src="${p.cover_photo || 'assets/cover-default.jpg'}" alt="${p.business_name || 'Profesional'}">
                <div class="professional-card-badges">
                    ${p.is_featured ? '<span class="badge badge-featured">Destacado</span>' : ''}
                    ${p.is_certified ? '<span class="badge badge-certified">Certificado</span>' : ''}
                </div>
                <img src="${p.profile_photo || 'assets/default-avatar.png'}" alt="${p.business_name || 'Profesional'}" class="professional-card-avatar">
            </div>
            <div class="professional-card-body">
                <h3 class="professional-name">
                    ${p.business_name || 'Profesional'}
                    ${p.is_available ? '<span class="badge badge-available">Disponible</span>' : ''}
                </h3>
                <p class="professional-specialty">${p.specialty?.name || 'General'}</p>
                <p class="professional-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${p.city?.name || ''}${p.province?.name ? ', ' + p.province.name : ''}
                </p>
                <div class="professional-rating">
                    <span class="rating-stars">
                        ${renderStars(p.rating_avg)}
                    </span>
                    <span class="rating-value">${p.rating_avg || '0.0'}</span>
                    <span class="rating-count">(${p.total_reviews || 0} reseñas)</span>
                </div>
            </div>
            <div class="professional-card-footer">
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); contactProfessional('${p.id}')">
                    <i class="fas fa-phone"></i> Contactar
                </button>
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); requestJobFromProfessional('${p.id}')">
                    <i class="fas fa-bolt"></i> Solicitar
                </button>
            </div>
        </div>
    `).join('');
}

function renderStars(rating) {
    const stars = [];
    const roundedRating = Math.round(rating || 0);
    
    for (let i = 1; i <= 5; i++) {
        stars.push(`<i class="fas fa-star ${i <= roundedRating ? 'active' : ''}"></i>`);
    }
    
    return stars.join('');
}

async function searchProfessionals() {
    const provinceId = document.getElementById('provinceFilter').value;
    const cityId = document.getElementById('cityFilter').value;
    const specialtyId = document.getElementById('specialtyFilter').value;
    const onlyCertified = document.getElementById('onlyCertified').checked;
    const onlyFeatured = document.getElementById('onlyFeatured').checked;
    const onlyAvailable = document.getElementById('onlyAvailable').checked;
    
    let query = supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `, { count: 'exact' })
        .eq('is_active', true);
    
    if (provinceId) query = query.eq('province_id', provinceId);
    if (cityId) query = query.eq('city_id', cityId);
    if (specialtyId) query = query.eq('specialty_id', specialtyId);
    if (onlyCertified) query = query.eq('is_certified', true);
    if (onlyFeatured) query = query.eq('is_featured', true);
    if (onlyAvailable) query = query.eq('is_available', true);
    
    query = query.order('is_featured', { ascending: false })
        .order('rating_avg', { ascending: false })
        .limit(50);
    
    const { data: professionals } = await query;
    
    if (professionals) {
        renderProfessionals('allProfessionals', professionals);
        document.getElementById('resultsCount').textContent = `${professionals.length} profesionales encontrados`;
        showPage('professionals');
    }
}

async function searchProfessionalsList() {
    const provinceId = document.getElementById('provinceFilterList').value;
    const cityId = document.getElementById('cityFilterList').value;
    const specialtyId = document.getElementById('specialtyFilterList').value;
    const onlyCertified = document.getElementById('onlyCertifiedList').checked;
    const onlyFeatured = document.getElementById('onlyFeaturedList').checked;
    const onlyAvailable = document.getElementById('onlyAvailableList').checked;
    const sortBy = document.getElementById('sortBy').value;
    
    let query = supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name)
        `, { count: 'exact' })
        .eq('is_active', true);
    
    if (provinceId) query = query.eq('province_id', provinceId);
    if (cityId) query = query.eq('city_id', cityId);
    if (specialtyId) query = query.eq('specialty_id', specialtyId);
    if (onlyCertified) query = query.eq('is_certified', true);
    if (onlyFeatured) query = query.eq('is_featured', true);
    if (onlyAvailable) query = query.eq('is_available', true);
    
    switch(sortBy) {
        case 'featured':
            query = query.order('is_featured', { ascending: false });
            break;
        case 'rating':
            query = query.order('rating_avg', { ascending: false });
            break;
        case 'reviews':
            query = query.order('total_reviews', { ascending: false });
            break;
    }
    
    query = query.limit(50);
    
    const { data: professionals } = await query;
    
    if (professionals) {
        renderProfessionals('professionalsList', professionals);
        document.getElementById('resultsCount').textContent = `${professionals.length} profesionales encontrados`;
    }
}

async function showProfessionalDetail(professionalId) {
    showLoading();
    
    const { data: professional } = await supabase
        .from('professionals')
        .select(`
            *,
            specialty:specialties(name),
            city:cities(name),
            province:provinces(name),
            certifications(*),
            work_photos(*),
            reviews(*, user:profiles(full_name))
        `)
        .eq('id', professionalId)
        .single();
    
    hideLoading();
    
    if (!professional) {
        showToast('Profesional no encontrado', 'error');
        return;
    }
    
    const container = document.getElementById('professionalDetail');
    
    container.innerHTML = `
        <div class="professional-detail-header">
            <img src="${professional.cover_photo || 'assets/cover-default.jpg'}" alt="Portada">
            <img src="${professional.profile_photo || 'assets/default-avatar.png'}" alt="${professional.business_name}" class="professional-detail-avatar">
            <div class="professional-detail-badges">
                ${professional.is_featured ? '<span class="badge badge-featured">Destacado</span>' : ''}
                ${professional.is_certified ? '<span class="badge badge-certified">Certificado</span>' : ''}
                ${professional.is_available ? '<span class="badge badge-available">Disponible</span>' : ''}
            </div>
        </div>
        <div class="professional-detail-body">
            <h1 class="professional-detail-name">${professional.business_name || 'Profesional'}</h1>
            <p class="professional-detail-specialty">${professional.specialty?.name || 'General'}</p>
            
            <div class="professional-detail-stats">
                <div class="stat-item">
                    <div class="stat-value">${professional.rating_avg || '0.0'}</div>
                    <div class="stat-label">Puntuación</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${professional.total_reviews || 0}</div>
                    <div class="stat-label">Reseñas</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${professional.total_jobs || 0}</div>
                    <div class="stat-label">Trabajos</div>
                </div>
            </div>
            
            ${professional.description ? `
                <div class="professional-detail-description">
                    <h3>Descripción</h3>
                    <p>${professional.description}</p>
                </div>
            ` : ''}
            
            <div class="professional-detail-info">
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>Ubicación</strong>
                        <p>${professional.city?.name || ''}${professional.province?.name ? ', ' + professional.province.name : ''}</p>
                    </div>
                </div>
                ${professional.phone ? `
                    <div class="info-item">
                        <i class="fas fa-phone"></i>
                        <div>
                            <strong>Teléfono</strong>
                            <p>${professional.phone}</p>
                        </div>
                    </div>
                ` : ''}
                ${professional.whatsapp ? `
                    <div class="info-item">
                        <i class="fab fa-whatsapp"></i>
                        <div>
                            <strong>WhatsApp</strong>
                            <p>${professional.whatsapp}</p>
                        </div>
                    </div>
                ` : ''}
                ${professional.available_hours ? `
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <div>
                            <strong>Horario</strong>
                            <p>${professional.available_hours}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="professional-detail-actions">
                <button class="btn btn-primary" onclick="contactProfessional('${professional.id}')">
                    <i class="fas fa-phone"></i> Contactar
                </button>
                <button class="btn btn-outline" onclick="toggleFavorite('${professional.id}')">
                    <i class="fas fa-heart"></i> Favorito
                </button>
                <button class="btn btn-outline" onclick="requestJobFromProfessional('${professional.id}')">
                    <i class="fas fa-bolt"></i> Solicitar Trabajo
                </button>
            </div>
            
            ${professional.certifications?.length ? `
                <div class="certifications-section mt-4">
                    <h3><i class="fas fa-certificate"></i> Certificaciones</h3>
                    <div class="certifications-list">
                        ${professional.certifications.map(c => `
                            <div class="certification-card">
                                <strong>${c.name}</strong>
                                <p>${c.issuer || ''}</p>
                                ${c.is_verified ? '<span class="badge badge-certified">Verificado</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${professional.work_photos?.length ? `
                <div class="work-photos-section mt-4">
                    <h3><i class="fas fa-images"></i> Trabajos Realizados</h3>
                    <div class="work-photos-grid">
                        ${professional.work_photos.map(photo => `
                            <img src="${photo.photo_url}" alt="${photo.title || 'Trabajo'}">
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${professional.reviews?.length ? `
                <div class="reviews-section">
                    <h3><i class="fas fa-star"></i> Reseñas</h3>
                    ${professional.reviews.slice(0, 5).map(r => `
                        <div class="review-card">
                            <div class="review-header">
                                <span class="review-user">${r.user?.full_name || 'Usuario'}</span>
                                <span class="review-date">${new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <div class="review-rating">
                                ${renderStars(r.overall_rating)}
                            </div>
                            ${r.comment ? `<p>${r.comment}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    showPage('professional-detail');
}

// =============================================
// PUBLICIDAD
// =============================================

async function loadRandomAd() {
    const provinceId = document.getElementById('provinceFilter')?.value;
    const cityId = document.getElementById('cityFilter')?.value;
    
    let query = supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString().split('T')[0])
        .lte('end_date', new Date().toISOString().split('T')[0]);
    
    let { data: ads } = await query;
    
    if (!ads || ads.length === 0) {
        // Cargar ad por defecto
        document.getElementById('adImage').src = 'assets/ad-default.jpg';
        document.getElementById('adTitle').textContent = '¡Registra tu negocio!';
        return;
    }
    
    // Filtrar por ubicación
    let filteredAds = ads.filter(ad => {
        if (ad.level === 'nacional') return true;
        if (ad.level === 'provincia' && ad.province_id === provinceId) return true;
        if (ad.level === 'ciudad' && ad.city_id === cityId) return true;
        return false;
    });
    
    if (filteredAds.length === 0) {
        filteredAds = ads.filter(ad => ad.level === 'nacional');
    }
    
    const randomAd = filteredAds[Math.floor(Math.random() * filteredAds.length)];
    
    if (randomAd) {
        document.getElementById('adImage').src = randomAd.image_url;
        document.getElementById('adTitle').textContent = randomAd.title;
        document.getElementById('adLink').href = randomAd.link || '#';
    }
}

async function updateAds() {
    await loadRandomAd();
}

// =============================================
// USUARIO - DASHBOARD
// =============================================

async function loadDashboard() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Cargar trabajos
    const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
    
    document.getElementById('userJobsCount').textContent = jobsCount || 0;
    
    // Cargar favoritos
    const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
    
    document.getElementById('userFavoritesCount').textContent = favoritesCount || 0;
    
    // Cargar direcciones
    const { count: addressesCount } = await supabase
        .from('addresses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
    
    document.getElementById('userAddressesCount').textContent = addressesCount || 0;
    
    // Cargar presupuestos
    const { count: budgetsCount } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
    
    document.getElementById('userBudgetsCount').textContent = budgetsCount || 0;
}

async function loadUserJobs(status = 'all') {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    let query = supabase
        .from('jobs')
        .select(`
            *,
            professional:professionals(business_name, profile_photo, phone),
            specialty:specialties(name)
        `)
        .eq('user_id', currentUser.id);
    
    if (status !== 'all') {
        query = query.eq('status', status);
    }
    
    const { data: jobs } = await query.order('created_at', { ascending: false });
    
    appState.jobs = jobs || [];
    
    const container = document.getElementById('userJobsList');
    
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <p>No tienes trabajos solicitados</p>
                <button class="btn btn-primary" onclick="showRequestJobModal()">
                    Solicitar tu primer trabajo
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-info">
                <h3>${job.title}</h3>
                <div class="job-meta">
                    <span><i class="fas fa-tools"></i> ${job.specialty?.name || 'General'}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(job.created_at).toLocaleDateString()}</span>
                    ${job.professional ? `<span><i class="fas fa-user"></i> ${job.professional.business_name}</span>` : ''}
                </div>
            </div>
            <div class="job-actions">
                <span class="job-status ${job.status}">${formatStatus(job.status)}</span>
                <button class="btn btn-outline btn-sm" onclick="showJobDetail('${job.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function filterJobs(status) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadUserJobs(status);
}

function formatStatus(status) {
    const statusMap = {
        'solicitado': 'Solicitado',
        'aceptado': 'Aceptado',
        'en_proceso': 'En Proceso',
        'finalizado': 'Finalizado',
        'cancelado': 'Cancelado'
    };
    return statusMap[status] || status;
}

async function showJobDetail(jobId) {
    const { data: job } = await supabase
        .from('jobs')
        .select(`
            *,
            professional:professionals(*),
            specialty:specialties(name)
        `)
        .eq('id', jobId)
        .single();
    
    if (!job) return;
    
    const container = document.getElementById('jobDetail');
    
    container.innerHTML = `
        <div class="job-detail-card">
            <div class="job-detail-header">
                <h2>${job.title}</h2>
                <span class="job-status ${job.status}">${formatStatus(job.status)}</span>
            </div>
            
            <div class="job-detail-info">
                <div class="info-item">
                    <i class="fas fa-tools"></i>
                    <div>
                        <strong>Especialidad</strong>
                        <p>${job.specialty?.name || 'General'}</p>
                    </div>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>Ubicación</strong>
                        <p>${job.zone || ''} ${job.city ? ', ' + job.city.name : ''}</p>
                    </div>
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <div>
                        <strong>Fecha de solicitud</strong>
                        <p>${new Date(job.created_at).toLocaleString()}</p>
                    </div>
                </div>
                ${job.scheduled_date ? `
                    <div class="info-item">
                        <i class="fas fa-calendar-check"></i>
                        <div>
                            <strong>Fecha programada</strong>
                            <p>${new Date(job.scheduled_date).toLocaleString()}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="job-detail-description">
                <h3>Descripción</h3>
                <p>${job.description}</p>
            </div>
            
            ${job.professional ? `
                <div class="job-detail-professional">
                    <h3>Profesional Asignado</h3>
                    <div class="professional-mini-card">
                        <img src="${job.professional.profile_photo || 'assets/default-avatar.png'}" alt="${job.professional.business_name}">
                        <div>
                            <strong>${job.professional.business_name}</strong>
                            <p>${job.professional.phone || ''}</p>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="job-detail-actions">
                ${job.status === 'finalizado' ? `
                    <button class="btn btn-primary" onclick="openRateJobModal('${job.id}')">
                        <i class="fas fa-star"></i> Calificar
                    </button>
                ` : ''}
                ${job.status !== 'finalizado' && job.status !== 'cancelado' ? `
                    <button class="btn btn-danger" onclick="cancelJob('${job.id}')">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    showPage('job-detail');
}

async function cancelJob(jobId) {
    if (!confirm('¿Estás seguro de cancelar este trabajo?')) return;
    
    const { error } = await supabase
        .from('jobs')
        .update({ status: 'cancelado' })
        .eq('id', jobId);
    
    if (error) {
        showToast('Error al cancelar trabajo', 'error');
    } else {
        showToast('Trabajo cancelado', 'success');
        loadUserJobs();
    }
}

// =============================================
// FAVORITOS
// =============================================

async function loadFavorites() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const { data: favorites } = await supabase
        .from('favorites')
        .select(`
            professional:professionals(
                *,
                specialty:specialties(name),
                city:cities(name),
                province:provinces(name)
            )
        `)
        .eq('user_id', currentUser.id);
    
    if (favorites && favorites.length > 0) {
        const professionals = favorites.map(f => f.professional);
        renderProfessionals('favoritesList', professionals);
    }
}

async function toggleFavorite(professionalId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const { data: existing } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('professional_id', professionalId)
        .single();
    
    if (existing) {
        await supabase
            .from('favorites')
            .delete()
            .eq('id', existing.id);
        
        showToast('Eliminado de favoritos', 'success');
    } else {
        await supabase
            .from('favorites')
            .insert({
                user_id: currentUser.id,
                professional_id: professionalId
            });
        
        showToast('Agregado a favoritos', 'success');
    }
}

// =============================================
// DIRECCIONES
// =============================================

async function loadAddresses() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const { data: addresses } = await supabase
        .from('addresses')
        .select(`
            *,
            province:provinces(name),
            city:cities(name)
        `)
        .eq('user_id', currentUser.id)
        .order('is_default', { ascending: false });
    
    appState.addresses = addresses || [];
    
    const container = document.getElementById('addressesList');
    
    if (!addresses || addresses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-map-marker-alt"></i>
                <p>No tienes direcciones guardadas</p>
                <button class="btn btn-primary" onclick="showAddAddressModal()">
                    Agregar tu primera dirección
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = addresses.map(addr => `
        <div class="address-card ${addr.is_default ? 'default' : ''}">
            <h4>
                ${addr.name}
                ${addr.is_default ? '<span class="default-badge">Predeterminada</span>' : ''}
            </h4>
            <p>${addr.address}</p>
            <p>${addr.city?.name || ''}${addr.province?.name ? ', ' + addr.province.name : ''}</p>
            <div class="address-card-actions">
                ${!addr.is_default ? `
                    <button class="btn btn-outline btn-sm" onclick="setDefaultAddress('${addr.id}')">
                        <i class="fas fa-check"></i> Predeterminada
                    </button>
                ` : ''}
                <button class="btn btn-danger btn-sm" onclick="deleteAddress('${addr.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function setDefaultAddress(addressId) {
    if (!currentUser) return;
    
    // Quitar predeterminada actual
    await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', currentUser.id);
    
    // Establecer nueva predeterminada
    await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);
    
    loadAddresses();
    showToast('Dirección predeterminada actualizada', 'success');
}

async function deleteAddress(addressId) {
    if (!confirm('¿Eliminar esta dirección?')) return;
    
    await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);
    
    loadAddresses();
    showToast('Dirección eliminada', 'success');
}

// =============================================
// PRESUPUESTOS
// =============================================

async function loadBudgets() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    const { data: budgets } = await supabase
        .from('budgets')
        .select(`
            *,
            professional:professionals(business_name, profile_photo)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    appState.budgets = budgets || [];
    
    const container = document.getElementById('budgetsList');
    
    if (!budgets || budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <p>No has recibido presupuestos</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = budgets.map(budget => `
        <div class="budget-card">
            <div class="budget-header">
                <img src="${budget.professional?.profile_photo || 'assets/default-avatar.png'}" alt="${budget.professional?.business_name}">
                <div>
                    <h3>${budget.professional?.business_name || 'Profesional'}</h3>
                    <p>${new Date(budget.created_at).toLocaleDateString()}</p>
                </div>
                <span class="budget-status ${budget.status}">${formatBudgetStatus(budget.status)}</span>
            </div>
            <div class="budget-description">
                <p>${budget.description}</p>
            </div>
            <div class="budget-total">
                <strong>Total:</strong>
                <span>$${budget.total?.toLocaleString() || '0'}</span>
            </div>
            <div class="budget-actions">
                <button class="btn btn-outline btn-sm" onclick="viewBudgetPDF('${budget.id}')">
                    <i class="fas fa-file-pdf"></i> Ver PDF
                </button>
            </div>
        </div>
    `).join('');
}

function formatBudgetStatus(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'accepted': 'Aceptado',
        'rejected': 'Rechazado'
    };
    return statusMap[status] || status;
}

// =============================================
// CONFIGURACIÓN
// =============================================

async function loadSettings() {
    if (!currentUser || !currentProfile) return;
    
    document.getElementById('profileName').value = currentProfile.full_name || '';
    document.getElementById('profilePhone').value = currentProfile.phone || '';
}

async function updateProfile(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('profileName').value;
    const phone = document.getElementById('profilePhone').value;
    const avatarFile = document.getElementById('profileAvatar').files[0];
    
    let avatarUrl = currentProfile?.avatar_url;
    
    if (avatarFile) {
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(`${currentUser.id}/${Date.now()}`, avatarFile);
        
        if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(data.path);
            
            avatarUrl = publicUrl;
        }
    }
    
    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            phone: phone,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);
    
    if (error) {
        showToast('Error al actualizar perfil', 'error');
    } else {
        showToast('Perfil actualizado', 'success');
        await loadUserProfile();
        updateAuthUI(true);
    }
}

// =============================================
// SOLICITAR TRABAJO
// =============================================

async function loadCitiesJob() {
    const provinceId = document.getElementById('jobProvince').value;
    if (!provinceId) return;
    
    const { data: cities } = await supabase
        .from('cities')
        .select('*')
        .eq('province_id', provinceId)
        .eq('is_active', true)
        .order('name');
    
    if (cities) {
        const options = '<option value="">Selecciona ciudad</option>' + 
            cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        document.getElementById('jobCity').innerHTML = options;
    }
}

async function requestJob(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    showLoading();
    
    const specialtyId = document.getElementById('jobSpecialty').value;
    const provinceId = document.getElementById('jobProvince').value;
    const cityId = document.getElementById('jobCity').value;
    const zone = document.getElementById('jobZone').value;
    const title = document.getElementById('jobTitle').value;
    const description = document.getElementById('jobDescription').value;
    const address = document.getElementById('jobAddress').value;
    const urgency = document.getElementById('jobUrgency').checked;
    
    // Obtener ubicación del usuario
    let latitude = null;
    let longitude = null;
    
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            latitude = position.coords.latitude;
            longitude = position.coords.longitude;
        } catch (e) {
            console.log('Geolocation not available');
        }
    }
    
    const { data: job, error } = await supabase
        .from('jobs')
        .insert({
            user_id: currentUser.id,
            specialty_id: specialtyId,
            province_id: provinceId || null,
            city_id: cityId || null,
            zone: zone,
            title: title,
            description: description,
            address: address,
            latitude: latitude,
            longitude: longitude,
            urgency: urgency,
            status: 'solicitado'
        })
        .select()
        .single();
    
    hideLoading();
    
    if (error) {
        showToast('Error al crear solicitud', 'error');
    } else {
        closeModal('requestJobModal');
        showToast('Solicitud enviada correctamente', 'success');
        document.getElementById('requestJobForm').reset();
        showPage('my-jobs');
    }
}

async function requestJobFromProfessional(professionalId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Precargar datos del profesional
    const { data: professional } = await supabase
        .from('professionals')
        .select('*, specialty:specialties(name)')
        .eq('id', professionalId)
        .single();
    
    if (professional) {
        document.getElementById('jobSpecialty').value = professional.specialty_id || '';
        if (professional.province_id) {
            document.getElementById('jobProvince').value = professional.province_id;
            loadCitiesJob().then(() => {
                document.getElementById('jobCity').value = professional.city_id || '';
            });
        }
    }
    
    showRequestJobModal();
}

// =============================================
// CALIFICACIONES
// =============================================

let currentRatingJob = null;
let ratings = {
    punctuality: 0,
    quality: 0,
    price: 0,
    communication: 0
};

function openRateJobModal(jobId) {
    currentRatingJob = jobId;
    document.getElementById('rateJobId').value = jobId;
    
    // Reset ratings
    ratings = { punctuality: 0, quality: 0, price: 0, communication: 0 };
    document.querySelectorAll('.star-rating').forEach(r => {
        r.dataset.value = 0;
        r.querySelectorAll('i').forEach(s => {
            s.classList.remove('active');
            s.classList.replace('fas', 'far');
        });
    });
    
    showModal('rateJobModal');
}

async function rateJob(e) {
    e.preventDefault();
    
    if (!currentUser || !currentRatingJob) return;
    
    const punctuality = parseInt(document.getElementById('punctualityRating').dataset.value) || 0;
    const quality = parseInt(document.getElementById('qualityRating').dataset.value) || 0;
    const price = parseInt(document.getElementById('priceRating').dataset.value) || 0;
    const communication = parseInt(document.getElementById('communicationRating').dataset.value) || 0;
    const comment = document.getElementById('reviewComment').value;
    
    if (!punctuality || !quality || !price || !communication) {
        showToast('Por favor completa todas las calificaciones', 'warning');
        return;
    }
    
    showLoading();
    
    const overall = (punctuality + quality + price + communication) / 4;
    
    // Obtener el profesional del trabajo
    const { data: job } = await supabase
        .from('jobs')
        .select('professional_id')
        .eq('id', currentRatingJob)
        .single();
    
    const { error } = await supabase
        .from('reviews')
        .insert({
            job_id: currentRatingJob,
            user_id: currentUser.id,
            professional_id: job.professional_id,
            punctuality_rating: punctuality,
            quality_rating: quality,
            price_rating: price,
            communication_rating: communication,
            overall_rating: overall,
            comment: comment
        });
    
    hideLoading();
    
    if (error) {
        showToast('Error al enviar calificación', 'error');
    } else {
        closeModal('rateJobModal');
        showToast('¡Gracias por tu calificación!', 'success');
    }
}

// =============================================
// PROFESIONAL - PERFIL
// =============================================

async function loadCitiesProfessional() {
    const provinceId = document.getElementById('profProvince').value;
    if (!provinceId) return;
    
    const { data: cities } = await supabase
        .from('cities')
        .select('*')
        .eq('province_id', provinceId)
        .eq('is_active', true)
        .order('name');
    
    if (cities) {
        const options = '<option value="">Selecciona ciudad</option>' + 
            cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        document.getElementById('profCity').innerHTML = options;
    }
}

async function saveProfessionalProfile(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    showLoading();
    
    const businessName = document.getElementById('profBusinessName').value;
    const specialtyId = document.getElementById('profSpecialty').value;
    const description = document.getElementById('profDescription').value;
    const phone = document.getElementById('profPhone').value;
    const whatsapp = document.getElementById('profWhatsapp').value;
    const provinceId = document.getElementById('profProvince').value;
    const cityId = document.getElementById('profCity').value;
    const zones = document.getElementById('profZones').value.split(',').map(z => z.trim()).filter(z => z);
    const address = document.getElementById('profAddress').value;
    const hours = document.getElementById('profHours').value;
    const urgency = document.getElementById('profUrgency').checked;
    
    const days = Array.from(document.querySelectorAll('input[name="profDays"]:checked')).map(d => d.value);
    
    const photoFile = document.getElementById('profPhoto').files[0];
    const coverFile = document.getElementById('profCover').files[0];
    
    let profilePhoto = currentProfessional?.profile_photo;
    let coverPhoto = currentProfessional?.cover_photo;
    
    if (photoFile) {
        const { data, error } = await supabase.storage
            .from('profiles')
            .upload(`${currentUser.id}/photo`, photoFile);
        
        if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(data.path);
            profilePhoto = publicUrl;
        }
    }
    
    if (coverFile) {
        const { data, error } = await supabase.storage
            .from('profiles')
            .upload(`${currentUser.id}/cover`, coverFile);
        
        if (!error && data) {
            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(data.path);
            coverPhoto = publicUrl;
        }
    }
    
    const { error } = await supabase
        .from('professionals')
        .upsert({
            user_id: currentUser.id,
            specialty_id: specialtyId,
            business_name: businessName,
            description: description,
            phone: phone,
            whatsapp: whatsapp,
            province_id: provinceId || null,
            city_id: cityId || null,
            zones: zones,
            address: address,
            available_days: days,
            available_hours: hours,
            urgency_service: urgency,
            profile_photo: profilePhoto,
            cover_photo: coverPhoto,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    
    hideLoading();
    
    if (error) {
        showToast('Error al guardar perfil', 'error');
    } else {
        closeModal('professionalProfileModal');
        showToast('Perfil guardado correctamente', 'success');
        await loadUserProfile();
    }
}

// =============================================
// SUSCRIPCIÓN
// =============================================

async function subscribeToPlan() {
    if (!currentUser || !currentProfessional) {
        showToast('Completa tu perfil profesional primero', 'warning');
        return;
    }
    
    showLoading();
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const { error } = await supabase
        .from('subscriptions')
        .insert({
            professional_id: currentProfessional.id,
            plan: 'destacado',
            amount: 5000,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            status: 'active',
            is_approved: false
        });
    
    hideLoading();
    
    if (error) {
        showToast('Error al procesar suscripción', 'error');
    } else {
        closeModal('subscriptionModal');
        showToast('¡Suscripción activada! Pendiente de aprobación', 'success');
    }
}

// =============================================
// DIRECCIONES - MODAL
// =============================================

async function loadCitiesAddress() {
    const provinceId = document.getElementById('addressProvince').value;
    if (!provinceId) return;
    
    const { data: cities } = await supabase
        .from('cities')
        .select('*')
        .eq('province_id', provinceId)
        .eq('is_active', true)
        .order('name');
    
    if (cities) {
        const options = '<option value="">Selecciona</option>' + 
            cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        document.getElementById('addressCity').innerHTML = options;
    }
}

async function addAddress(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const name = document.getElementById('addressName').value;
    const address = document.getElementById('addressStreet').value;
    const provinceId = document.getElementById('addressProvince').value;
    const cityId = document.getElementById('addressCity').value;
    const zone = document.getElementById('addressZone').value;
    const isDefault = document.getElementById('addressDefault').checked;
    
    if (isDefault) {
        await supabase
            .from('addresses')
            .update({ is_default: false })
            .eq('user_id', currentUser.id);
    }
    
    const { error } = await supabase
        .from('addresses')
        .insert({
            user_id: currentUser.id,
            name: name,
            address: address,
            province_id: provinceId || null,
            city_id: cityId || null,
            zone: zone,
            is_default: isDefault
        });
    
    if (error) {
        showToast('Error al guardar dirección', 'error');
    } else {
        closeModal('addAddressModal');
        showToast('Dirección guardada', 'success');
        document.getElementById('addAddressForm').reset();
        loadAddresses();
    }
}

// =============================================
// MODALES
// =============================================

function showLoginModal() {
    showModal('loginModal');
}

function showRegisterModal() {
    showModal('registerModal');
}

function showRequestJobModal() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showModal('requestJobModal');
}

function showAddAddressModal() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showModal('addAddressModal');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    document.body.style.overflow = '';
}

function switchModal(from, to) {
    closeModal(from);
    setTimeout(() => showModal(to), 300);
}

function showChangePasswordModal() {
    // Implementar cambio de contraseña
    showToast('Función en desarrollo', 'warning');
}

 {
    if (!function deleteAccount()confirm('¿Estás seguro de eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    if (!confirm('¿REALMENTE quieres eliminar tu cuenta?')) return;
    
    // Implementar eliminación de cuenta
    showToast('Función en desarrollo', 'warning');
}

// =============================================
// UTILIDADES
// =============================================

function contactProfessional(professionalId) {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    // Redirigir a WhatsApp o mostrar información de contacto
    window.open(`https://wa.me/`, '_blank');
}

function updateDistanceLabel() {
    const distance = document.getElementById('distanceFilter').value;
    document.getElementById('distanceLabel').textContent = `${distance} km`;
}

function clearFilters() {
    document.getElementById('provinceFilterList').value = '';
    document.getElementById('cityFilterList').innerHTML = '<option value="">Todas las ciudades</option>';
    document.getElementById('specialtyFilterList').value = '';
    document.getElementById('onlyCertifiedList').checked = false;
    document.getElementById('onlyFeaturedList').checked = false;
    document.getElementById('onlyAvailableList').checked = false;
    searchProfessionalsList();
}

function loadCitiesList() {
    const provinceId = document.getElementById('provinceFilterList').value;
    if (!provinceId) {
        document.getElementById('cityFilterList').innerHTML = '<option value="">Todas las ciudades</option>';
        return;
    }
    
    supabase
        .from('cities')
        .select('*')
        .eq('province_id', provinceId)
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => {
            if (data) {
                const options = '<option value="">Todas las ciudades</option>' + 
                    data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                document.getElementById('cityFilterList').innerHTML = options;
            }
        });
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// =============================================
// LOADING
// =============================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}
