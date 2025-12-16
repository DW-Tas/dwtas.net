// ===== Navigation Scroll Effect =====
const navbar = document.querySelector('.navbar');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

// Add scrolled class on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile menu toggle
mobileMenuBtn?.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close mobile menu when clicking on a link
navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    });
});

// ===== Smooth Scroll for Anchor Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offset = 80; // Account for fixed navbar
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.project-card, .highlight-card, .section-header').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Add animate-in class styles
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// ===== Stats Counter Animation =====
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateStats();
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = parseInt(stat.textContent.replace(/\D/g, ''));
        const suffix = stat.textContent.replace(/\d/g, '');
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                stat.textContent = target + suffix;
                clearInterval(timer);
            } else {
                stat.textContent = Math.floor(current) + suffix;
            }
        }, 30);
    });
}

// ===== Project Card Hover Effect =====
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Add hover glow effect styles
const hoverStyle = document.createElement('style');
hoverStyle.textContent = `
    .project-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(
            600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(74, 111, 165, 0.08),
            transparent 40%
        );
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        border-radius: inherit;
        z-index: 0;
    }
    
    .project-card:hover::before {
        opacity: 1;
    }
    
    .project-card > * {
        position: relative;
        z-index: 1;
    }
`;
document.head.appendChild(hoverStyle);

// ===== Console Easter Egg =====
console.log('%c🔧 DW Tas', 'font-size: 24px; font-weight: bold; color: #4a6fa5;');
console.log('%cBuilding the future of 3D printing, one project at a time.', 'font-size: 14px; color: #a1a1aa;');
console.log('%cCheck out my projects: https://github.com/DW-Tas', 'font-size: 12px; color: #71717a;');
