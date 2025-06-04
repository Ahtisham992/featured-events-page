// ===== GLOBAL VARIABLES =====
let eventsData = [];
let filteredEvents = [];
let currentPage = 1;
const eventsPerPage = 6;
let currentCategory = 'all';
let searchQuery = '';

// ===== DOM ELEMENTS =====
const navbar = document.getElementById('mainNavbar');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');
const filterButtons = document.querySelectorAll('.filter-btn');
const eventsContainer = document.getElementById('eventsContainer');
const loadingState = document.getElementById('loadingState');
const noResultsState = document.getElementById('noResultsState');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreSection = document.getElementById('loadMoreSection');
const backToTopBtn = document.getElementById('backToTop');
const eventModal = new bootstrap.Modal(document.getElementById('eventModal'));

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadEvents();
});

// ===== INITIALIZATION =====
function initializeApp() {
    // Add smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    // Initialize intersection observer for animations
    if ('IntersectionObserver' in window) {
        setupIntersectionObserver();
    }

    // Add loading animation classes
    const animatedElements = document.querySelectorAll('.event-card, .section-title, .hero-content');
    animatedElements.forEach(el => el.classList.add('fade-in'));
}

function setupEventListeners() {
    // Navbar scroll effect
    window.addEventListener('scroll', handleNavbarScroll);
    window.addEventListener('scroll', handleBackToTop);

    // Search functionality
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('focus', showSearchSuggestions);
    searchInput.addEventListener('blur', hideSearchSuggestions);

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    // Load more events
    loadMoreBtn.addEventListener('click', loadMoreEvents);

    // Back to top button
    backToTopBtn.addEventListener('click', scrollToTop);

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
}

// ===== NAVBAR FUNCTIONALITY =====
function handleNavbarScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Update active navigation item based on scroll position
    updateActiveNavItem();
}

function updateActiveNavItem() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.offsetHeight;
        
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === currentSection) {
            link.classList.add('active');
        }
    });
}

function smoothScroll(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    
    if (targetSection) {
        const offsetTop = targetSection.offsetTop - 80;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// ===== DATA LOADING =====
async function loadEvents() {
    showLoading();
    
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await fetch('./data/events.json');
        
        if (!response.ok) {
            throw new Error('Failed to load events');
        }
        
        eventsData = await response.json();
        filteredEvents = [...eventsData];
        
        hideLoading();
        renderEvents();
        updateLoadMoreButton();
        
    } catch (error) {
        console.error('Error loading events:', error);
        hideLoading();
        showNoResults('Failed to load events. Please try again later.');
    }
}

// ===== SEARCH FUNCTIONALITY =====
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    currentPage = 1;
    filterAndRenderEvents();
    
    if (searchQuery.length > 0) {
        generateSearchSuggestions();
    } else {
        hideSearchSuggestions();
    }
}

function generateSearchSuggestions() {
    const suggestions = eventsData
        .filter(event => 
            event.title.toLowerCase().includes(searchQuery) ||
            event.category.toLowerCase().includes(searchQuery) ||
            event.location.toLowerCase().includes(searchQuery)
        )
        .slice(0, 5)
        .map(event => ({
            text: event.title,
            type: 'event'
        }));

    // Add category suggestions
    const categories = [...new Set(eventsData.map(event => event.category))];
    const categorySuggestions = categories
        .filter(cat => cat.toLowerCase().includes(searchQuery))
        .slice(0, 3)
        .map(cat => ({
            text: cat,
            type: 'category'
        }));

    const allSuggestions = [...suggestions, ...categorySuggestions];
    
    if (allSuggestions.length > 0) {
        renderSearchSuggestions(allSuggestions);
        showSearchSuggestions();
    } else {
        hideSearchSuggestions();
    }
}

function renderSearchSuggestions(suggestions) {
    searchSuggestions.innerHTML = suggestions
        .map(suggestion => `
            <div class="suggestion-item" data-text="${suggestion.text}" data-type="${suggestion.type}">
                <i class="fas fa-${suggestion.type === 'event' ? 'calendar' : 'tag'} me-2"></i>
                ${suggestion.text}
            </div>
        `).join('');

    // Add click listeners to suggestions
    searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', handleSuggestionClick);
    });
}

function handleSuggestionClick(e) {
    const text = e.currentTarget.getAttribute('data-text');
    const type = e.currentTarget.getAttribute('data-type');
    
    searchInput.value = text;
    searchQuery = text.toLowerCase();
    
    if (type === 'category') {
        // Set category filter
        filterButtons.forEach(btn => btn.classList.remove('active'));
        const categoryBtn = document.querySelector(`[data-category="${text.toLowerCase()}"]`);
        if (categoryBtn) {
            categoryBtn.classList.add('active');
            currentCategory = text.toLowerCase();
        }
    }
    
    hideSearchSuggestions();
    currentPage = 1;
    filterAndRenderEvents();
}

function showSearchSuggestions() {
    searchSuggestions.style.display = 'block';
}

function hideSearchSuggestions() {
    setTimeout(() => {
        searchSuggestions.style.display = 'none';
    }, 200);
}

// ===== FILTER FUNCTIONALITY =====
function handleFilterClick(e) {
    e.preventDefault();
    
    // Update active filter button
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    currentCategory = e.target.getAttribute('data-category');
    currentPage = 1;
    
    filterAndRenderEvents();
}

function filterAndRenderEvents() {
    // Apply filters
    filteredEvents = eventsData.filter(event => {
        const matchesCategory = currentCategory === 'all' || event.category.toLowerCase() === currentCategory;
        const matchesSearch = searchQuery === '' || 
            event.title.toLowerCase().includes(searchQuery) ||
            event.description.toLowerCase().includes(searchQuery) ||
            event.location.toLowerCase().includes(searchQuery) ||
            event.category.toLowerCase().includes(searchQuery);
        
        return matchesCategory && matchesSearch;
    });

    renderEvents();
    updateLoadMoreButton();
    
    // Show no results if no events found
    if (filteredEvents.length === 0) {
        showNoResults();
    } else {
        hideNoResults();
    }

    // Scroll to events section if not searching
    if (searchQuery === '' && currentCategory !== 'all') {
        document.getElementById('events').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// ===== RENDERING FUNCTIONS =====
function renderEvents() {
    const startIndex = 0;
    const endIndex = currentPage * eventsPerPage;
    const eventsToShow = filteredEvents.slice(startIndex, endIndex);
    
    if (currentPage === 1) {
        eventsContainer.innerHTML = '';
    }
    
    eventsToShow.slice((currentPage - 1) * eventsPerPage).forEach((event, index) => {
        const eventCard = createEventCard(event);
        eventsContainer.appendChild(eventCard);
        
        // Add animation delay
        setTimeout(() => {
            eventCard.classList.add('slide-up');
        }, index * 100);
    });
}

function createEventCard(event) {
    const eventCard = document.createElement('div');
    eventCard.className = 'col-lg-4 col-md-6 mb-4';
    
    const formattedDate = formatEventDate(event.date, event.time);
    const categoryIcon = getCategoryIcon(event.category);
    
    eventCard.innerHTML = `
        <div class="event-card" data-event-id="${event.id}">
            <div class="event-image">
                <i class="${categoryIcon}"></i>
            </div>
            <div class="event-content">
                <h3 class="event-title">${event.title}</h3>
                <div class="event-meta">
                    <div class="event-meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${formattedDate}</span>
                    </div>
                    <div class="event-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${event.location}</span>
                    </div>
                    <div class="event-meta-item">
                        <i class="fas fa-tag"></i>
                        <span>${event.category}</span>
                    </div>
                    ${event.price ? `
                    <div class="event-meta-item">
                        <i class="fas fa-ticket-alt"></i>
                        <span>${event.price}</span>
                    </div>
                    ` : ''}
                </div>
                <p class="event-description">${event.description}</p>
                <div class="event-actions">
                    <button class="register-btn" onclick="registerForEvent(${event.id})">
                        <i class="fas fa-user-plus me-2"></i>Register
                    </button>
                    <button class="details-btn" onclick="showEventDetails(${event.id})">
                        <i class="fas fa-info-circle me-2"></i>Details
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return eventCard;
}

function getCategoryIcon(category) {
    const icons = {
        'technology': 'fas fa-laptop-code',
        'business': 'fas fa-briefcase',
        'culture': 'fas fa-palette',
        'recreation': 'fas fa-gamepad',
        'education': 'fas fa-graduation-cap',
        'health': 'fas fa-heartbeat',
        'sports': 'fas fa-running',
        'music': 'fas fa-music'
    };
    
    return icons[category.toLowerCase()] || 'fas fa-calendar-alt';
}

function formatEventDate(date, time) {
    const eventDate = new Date(date);
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    return `${eventDate.toLocaleDateString('en-US', options)} at ${time}`;
}

// ===== EVENT ACTIONS =====
function registerForEvent(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    
    if (event) {
        // Simulate registration process
        showRegistrationSuccess(event.title);
    }
}

function showEventDetails(eventId) {
    const event = eventsData.find(e => e.id === eventId);
    
    if (event) {
        const modalBody = document.getElementById('eventModalBody');
        const modalTitle = document.getElementById('eventModalLabel');
        const modalRegisterBtn = document.getElementById('modalRegisterBtn');
        
        modalTitle.textContent = event.title;
        modalRegisterBtn.onclick = () => registerForEvent(eventId);
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="event-image mb-3" style="height: 200px; border-radius: 12px;">
                        <i class="${getCategoryIcon(event.category)}"></i>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="event-details">
                        <h5>Event Details</h5>
                        <div class="event-meta mb-3">
                            <div class="event-meta-item mb-2">
                                <i class="fas fa-calendar-alt"></i>
                                <span>${formatEventDate(event.date, event.time)}</span>
                            </div>
                            <div class="event-meta-item mb-2">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${event.location}</span>
                            </div>
                            <div class="event-meta-item mb-2">
                                <i class="fas fa-tag"></i>
                                <span>${event.category}</span>
                            </div>
                            ${event.price ? `
                            <div class="event-meta-item mb-2">
                                <i class="fas fa-ticket-alt"></i>
                                <span>${event.price}</span>
                            </div>
                            ` : ''}
                            ${event.organizer ? `
                            <div class="event-meta-item mb-2">
                                <i class="fas fa-user"></i>
                                <span>Organized by ${event.organizer}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h5>Description</h5>
                    <p>${event.description}</p>
                    ${event.fullDescription ? `<p>${event.fullDescription}</p>` : ''}
                    
                    ${event.highlights ? `
                        <h6 class="mt-3">Event Highlights</h6>
                        <ul>
                            ${event.highlights.map(highlight => `<li>${highlight}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            </div>
        `;
        
        eventModal.show();
    }
}

function showRegistrationSuccess(eventTitle) {
    // Create and show success notification
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        <strong>Registration Successful!</strong><br>
        You've been registered for "${eventTitle}".
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ===== LOAD MORE FUNCTIONALITY =====
function loadMoreEvents() {
    currentPage++;
    renderEvents();
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const totalShown = currentPage * eventsPerPage;
    
    if (totalShown >= filteredEvents.length) {
        loadMoreSection.style.display = 'none';
    } else {
        loadMoreSection.style.display = 'block';
        const remaining = filteredEvents.length - totalShown;
        loadMoreBtn.innerHTML = `
            <i class="fas fa-plus me-2"></i>
            Load More Events (${remaining} remaining)
        `;
    }
}

// ===== UTILITY FUNCTIONS =====
function showLoading() {
    loadingState.style.display = 'block';
    eventsContainer.style.display = 'none';
    loadMoreSection.style.display = 'none';
    hideNoResults();
}

function hideLoading() {
    loadingState.style.display = 'none';
    eventsContainer.style.display = '';
}

function showNoResults(message = null) {
    noResultsState.style.display = 'block';
    eventsContainer.style.display = 'none';
    loadMoreSection.style.display = 'none';
    
    if (message) {
        document.querySelector('.no-results-text').textContent = message;
    }
}

function hideNoResults() {
    noResultsState.style.display = 'none';
}

function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    currentCategory = 'all';
    currentPage = 1;
    
    // Reset filter buttons
    filterButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-category="all"]').classList.add('active');
    
    filteredEvents = [...eventsData];
    renderEvents();
    updateLoadMoreButton();
    hideNoResults();
}

// ===== BACK TO TOP FUNCTIONALITY =====
function handleBackToTop() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// ===== KEYBOARD NAVIGATION =====
function handleKeyboardNavigation(e) {
    // Escape key to close modals and suggestions
    if (e.key === 'Escape') {
        hideSearchSuggestions();
        eventModal.hide();
    }
    
    // Enter key in search
    if (e.key === 'Enter' && e.target === searchInput) {
        hideSearchSuggestions();
    }
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.event-card, .section-title, .contact-item');
    animatedElements.forEach(el => observer.observe(el));
}

// ===== UTILITY FUNCTIONS =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== PRIVACY POLICY =====
function showPrivacyPolicy() {
    alert('Privacy Policy: We respect your privacy and protect your personal information. This is a demo application for educational purposes.');
}

// ===== ERROR HANDLING =====
window.addEventListener('error', function(e) {
    console.error('Application Error:', e.error);
    
    // Show user-friendly error message
    const errorNotification = document.createElement('div');
    errorNotification.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    errorNotification.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
    
    errorNotification.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Something went wrong!</strong><br>
        Please refresh the page and try again.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(errorNotification);
});