// ================================
// SOLVY Main JS
// ================================

// Simple products cache
let solvyProductsCache = null;

// Determine base path for nested pages (e.g. /products/*.html or products\floor-cleaner.html on Windows)
function getBasePath() {
    const path = (window.location.pathname || "").replace(/\\/g, "/");
    const href = (window.location.href || "").replace(/\\/g, "/");
    // In subfolder if path contains /products/ or we have multiple path segments (e.g. /products/floor-cleaner.html)
    if (path.indexOf("/products/") !== -1) return "../";
    if (href.indexOf("/products/") !== -1) return "../";
    // Fallback: path has more than one segment (e.g. /solvy/products/foo.html -> we still need ../ from products/)
    const segments = path.split("/").filter(Boolean);
    if (segments.length >= 2 && segments[0] === "products") return "../";
    return "";
}

// Fix relative href and src in a container (header/footer) after insert - ensures product detail pages work
function fixRelativeUrlsInContainer(container, basePath) {
    if (!container || !basePath) return;
    const isRelative = function (url) {
        if (!url || typeof url !== "string") return false;
        const u = url.trim();
        return u.length > 0 && u[0] !== "#" && u.indexOf("http:") !== 0 && u.indexOf("https:") !== 0 && u.indexOf("//") !== 0 && u.indexOf("mailto:") !== 0 && u.indexOf("tel:") !== 0 && u.indexOf("../") !== 0;
    };
    container.querySelectorAll("a[href]").forEach(function (a) {
        const h = a.getAttribute("href");
        if (isRelative(h)) a.setAttribute("href", basePath + h);
    });
    container.querySelectorAll("img[src]").forEach(function (img) {
        const s = img.getAttribute("src");
        if (isRelative(s)) img.setAttribute("src", basePath + s);
    });
}

// Load Header & Footer components
function loadComponent(id, file) {
    const container = document.getElementById(id);
    if (!container) return;

    const basePath = getBasePath();

    fetch(basePath + file)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load " + file);
            }
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            fixRelativeUrlsInContainer(container, basePath);
            if (id === "header") {
                setActiveMenu();
            }
        })
        .catch(err => console.error("Component Load Error:", err));
}

// Highlight active menu item in navbar
function setActiveMenu() {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".navbar .nav-link");

    // Remove 'active' from all links first
    navLinks.forEach(link => link.classList.remove("active"));

    let foundActive = false;
    navLinks.forEach(link => {
        if (foundActive) return;
        const linkPath = link.getAttribute("href");
        if (!linkPath) return;

        // Match index.html and root, also handle hash links to sections
        const linkFile = linkPath.split("#")[0] || "index.html";

        if (linkFile === currentPath || (currentPath === "" && linkFile === "index.html")) {
            link.classList.add("active");
            foundActive = true;
        }
    });
}

// Fetch products JSON (cached)
async function getSolvyProducts() {
    if (solvyProductsCache) return solvyProductsCache;

    try {
        const basePath = getBasePath();
        const response = await fetch(basePath + "assets/data/products.json");
        if (!response.ok) {
            throw new Error("Unable to load products.json");
        }
        const data = await response.json();
        solvyProductsCache = Array.isArray(data) ? data : data.products || [];
        return solvyProductsCache;
    } catch (error) {
        console.error("Products JSON Error:", error);
        return [];
    }
}

// Render featured products on home page
async function initHomeProducts() {
    const grid = document.getElementById("home-products-grid");
    if (!grid) return;

    const products = await getSolvyProducts();
    if (!products.length) {
        grid.innerHTML = '<p class="text-muted">Product information will be available shortly.</p>';
        return;
    }

    const featured = products.slice(0, 4);

    grid.innerHTML = featured
        .map(product => {
            const basePath = getBasePath();
            const image = basePath + (product.image || "assets/images/placeholder.png");
            const slug = product.slug || "";
            const href = slug ? `products/${slug}.html` : "products.html";
            const category = product.category || "Cleaning Solution";
            return `
        <div class="col-6 col-lg-3">
          <a href="${href}" class="product-card-link">
            <div class="product-card h-100">
              <div class="product-card-image">
                <img src="${image}" alt="${product.name}">
              </div>
              <div class="product-card-body">
                <span class="product-card-category">${category}</span>
                <h3 class="product-card-title">${product.name}</h3>
                <p class="product-card-desc">${product.shortDescription || ""}</p>
                <span class="product-card-cta">View details <i class="bi bi-arrow-right"></i></span>
              </div>
            </div>
          </a>
        </div>
      `;
        })
        .join("");
}

// Render full products grid on products page
async function initProductsPage() {
    const grid = document.getElementById("products-grid");
    if (!grid) return;

    const products = await getSolvyProducts();
    if (!products.length) {
        grid.innerHTML = '<p class="text-muted">Product catalogue is being updated. Please check again soon.</p>';
        return;
    }

    grid.innerHTML = products
        .map(product => {
            const basePath = getBasePath();
            const image = basePath + (product.image || "assets/images/placeholder.png");
            const slug = product.slug || "";
            const href = slug ? `products/${slug}.html` : "javascript:void(0);";
            const category = product.category || "Cleaning Solution";
            const waText = encodeURIComponent("I'm interested in " + product.name + " from SOLVY.");

            return `
                <div class="col-md-6 col-lg-4">
                    <a href="${href}" class="product-card-link">
                        <div class="product-card product-card-full h-100">
                            <div class="product-card-image">
                                <img src="${image}" alt="${product.name}">
                            </div>
                            <div class="product-card-body">
                                <span class="product-card-category">${category}</span>
                                <h3 class="product-card-title">${product.name}</h3>
                                <p class="product-card-desc">${product.shortDescription || ""}</p>
                                
                            </div>
                        </div>
                    </a>
                </div>
            `;
        })
        .join("");
}

// Update SEO meta tags dynamically for product detail page
function updateProductSEO(product) {
    if (!product || !product.seo) return;

    document.title = product.seo.metaTitle || product.name || document.title;

    function setMeta(name, content) {
        if (!content) return;
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", name);
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", content);
    }

    setMeta("description", product.seo.metaDescription);
    const keywords = Array.isArray(product.seo.keywords)
        ? product.seo.keywords.join(", ")
        : product.seo.keywords;
    setMeta("keywords", keywords);
}

// Inject JSON-LD Product schema
function injectProductSchema(product) {
    if (!product) return;

    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product.name,
        "image": [product.image],
        "description": product.description || product.shortDescription,
        "brand": {
            "@type": "Brand",
            "name": "SOLVY"
        },
        "category": product.category || "Cleaning Chemical",
        "sku": String(product.id || ""),
        "url": window.location.href
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

// Initialise product detail page
async function initProductDetailPage() {
    const pageType = document.body.dataset.page;
    if (pageType !== "product-detail") return;

    const explicitSlug = document.body.dataset.slug;
    const pathSlug = window.location.pathname.split("/").pop().replace(".html", "");
    const slug = explicitSlug || pathSlug;

    const products = await getSolvyProducts();
    const product = products.find(p => p.slug === slug);

    const container = document.getElementById("product-detail");
    if (!product || !container) {
        if (container) {
            container.innerHTML = '<p class="text-muted">Product details are not available at the moment.</p>';
        }
        return;
    }

    // build modern layout HTML using data
    const basePath = getBasePath();
    const imgUrl = basePath + (product.image || "assets/images/placeholder.png");
    const waText = encodeURIComponent(`I am interested in ${product.name} from SOLVY.`);

    function renderFeatures(features) {
        if (!Array.isArray(features)) return "";
        // simple keyword-to-icon mapping
        const iconMap = {
            "fast": "bi-flash",
            "tough": "bi-droplet",
            "odor": "bi-geo-alt-fill",
            "fresh": "bi-clock",
            "commercial": "bi-building",
            "safe": "bi-shield-check",
            "grease": "bi-fire",
            "degreasing": "bi-brush",
            "soft": "bi-leaf",
            "absorb": "bi-droplet",
            "gentle": "bi-flower1",
            "streak": "bi-sun",
            "dry": "bi-sun",
            "antimicrobial": "bi-shield-check"
        };
        return features
            .map(f => {
                let icon = 'bi-check2-circle';
                const lower = f.toLowerCase();
                for (const key in iconMap) {
                    if (lower.includes(key)) {
                        icon = iconMap[key];
                        break;
                    }
                }
                return `<div class=\"feature-item\"><i class=\"bi ${icon}\"></i>${f}</div>`;
            })
            .join("");
    }
    function renderSizes(sizes) {
        if (!Array.isArray(sizes)) return "";
        // non-interactive pills (no active state)
        return sizes
            .map(s => `<div class=\"size-pill\">${s}</div>`)
            .join("");
    }
    function renderIndustries(inds) {
        if (!Array.isArray(inds)) return "";
        return inds
            .map(i => `<div class=\"industry-item\"><i class=\"bi bi-building\"></i>${i}</div>`)
            .join("");
    }

    container.innerHTML = `
        <div class="product-detail modern">
            <div class="product-detail-content">
                <div class="product-detail-header">
                    <h1 class="product-detail-title">${product.name}</h1>
                    <div class="product-detail-category">${product.category || ""}</div>
                </div>
                <!-- gallery still early in source order so mobile sees it just after header -->
                <div class="product-detail-gallery">
                    <img src="${imgUrl}" alt="${product.name}" class="product-detail-image">
                </div>
                <div class="product-detail-body">
                    <div class="product-tagline">${product.shortDescription || ""}</div>
                    <p class="product-detail-description">${product.description || ""}</p>

                    <div class="features-grid">
                        ${renderFeatures(product.features)}
                    </div>
                    <!-- sizes with label -->
                    <div class="sizes-label mb-2"><strong>Sizes:</strong></div>
                    <div class="sizes">
                        ${renderSizes(product.sizes)}
                    </div>
                    ${product.application ? `<div class="application-block mt-3"><strong>Application:</strong> ${product.application}</div>` : ''}
                    <!-- industries with label -->
                    <div class="industries-label mb-2"><strong>Industries:</strong></div>
                    <div class="industries">
                        ${renderIndustries(product.industries)}
                    </div>
                </div>
            </div>
        </div>
    `;


    // update WP float button if present
    const floatBtn = document.querySelector('.whatsapp-float');
    if(floatBtn) {
        floatBtn.href = "https://wa.me/919111912346?text=" + waText;
    }

    // Update SEO and schema
    updateProductSEO(product);
    injectProductSchema(product);
}

// Initialise page by data-page attribute
function initSolvyPage() {
    const page = document.body.dataset.page;
    if (page === "home") {
        initHomeProducts();
        initOwlSlider();
    } else if (page === "products") {
        initProductsPage();
    } else if (page === "product-detail") {
        initProductDetailPage();
    }
}
// Initialize Owl Carousel for the homepage slider
function initOwlSlider() {
    const el = document.getElementById('home-owl');
    if (!el) return;

    // If Owl is not available yet, wait a bit
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.owlCarousel === 'undefined') {
        setTimeout(initOwlSlider, 250);
        return;
    }

    const $el = jQuery(el);
    if ($el.data('owl-initialized')) return;

    $el.owlCarousel({
        items: 1,
        loop: true,
        autoplay: true,
        autoplayTimeout: 3000,
        autoplayHoverPause: true,
        nav: false,
        dots: true,
        navText: ['‹', '›'],
        smartSpeed: 700,
        autoHeight: false,
        onInitialized: function () {
            // ensure internal wrappers fill the container
            try { jQuery(this.$element).find('.owl-stage-outer').css('height', '100%'); } catch (e) { }
        },
        responsive: { 0: { items: 1 }, 768: { items: 1 } }
    });

    $el.data('owl-initialized', true);
}

// DOM Ready
document.addEventListener("DOMContentLoaded", function () {
    loadComponent("header", "components/header.html");
    loadComponent("footer", "components/footer.html");
    initSolvyPage();
    initCookieBanner();
});

// Cookie banner: show fixed bar and persist acceptance in localStorage
function initCookieBanner() {
    try {
        const params = new URLSearchParams(window.location.search);
        const forceShow = params.get('showcookie') === '1';
        const accepted = localStorage.getItem('solvy_cookie_accepted');
        if (accepted === '1' && !forceShow) return;
        if (document.getElementById('cookieBanner')) return;

        const basePath = getBasePath();
        const banner = document.createElement('div');
        banner.id = 'cookieBanner';
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML = `
            <div class="cookie-inner">
                <p class="cookie-text mb-0">We use cookies to improve your experience and analyse site traffic. By continuing you agree to our <a href="${basePath}privacy.html">Privacy Policy</a>.</p>
                <div class="cookie-actions">
                    <button type="button" class="btn btn-outline-secondary btn-sm" id="cookieManageBtn">Manage</button>
                    <button type="button" class="btn btn-accent btn-sm" id="cookieAcceptBtn">Accept</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);

        const acceptBtn = document.getElementById('cookieAcceptBtn');
        const manageBtn = document.getElementById('cookieManageBtn');

        if (acceptBtn) acceptBtn.addEventListener('click', function () {
            localStorage.setItem('solvy_cookie_accepted', '1');
            banner.remove();
        });

        if (manageBtn) manageBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showCookieModal(basePath, banner);
        });

        window.showSolvyCookieBanner = function () {
            localStorage.removeItem('solvy_cookie_accepted');
            const existing = document.getElementById('cookieBanner');
            if (existing) existing.remove();
            initCookieBanner();
        };
    } catch (err) {
        console.error('Cookie banner init error', err);
    }
}

// Create and show cookie preferences modal (Bootstrap)
function showCookieModal(basePath, bannerReference) {
    try {
        if (typeof bootstrap === 'undefined') {
            window.location.href = basePath + 'privacy.html';
            return;
        }
        let modalEl = document.getElementById('cookieModal');
        if (modalEl) {
            const existing = new bootstrap.Modal(modalEl);
            existing.show();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'cookieModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.setAttribute('aria-labelledby', 'cookieModalTitle');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="cookieModalTitle">Cookie Preferences</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p class="small text-muted mb-0">We use essential cookies for site functionality and optional analytics to improve the experience. See our <a href="${basePath}privacy.html">Privacy Policy</a> for details.</p>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" id="cookieOptAnalytics" checked>
                            <label class="form-check-label" for="cookieOptAnalytics">Analytics cookies</label>
                        </div>
                        <div class="form-check mt-2">
                            <input class="form-check-input" type="checkbox" id="cookieOptMarketing">
                            <label class="form-check-label" for="cookieOptMarketing">Marketing cookies</label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-accent" id="cookieSavePrefsBtn">Save preferences</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        const saveBtn = document.getElementById('cookieSavePrefsBtn');
        if (saveBtn) saveBtn.addEventListener('click', function () {
            const analytics = document.getElementById('cookieOptAnalytics').checked;
            const marketing = document.getElementById('cookieOptMarketing').checked;
            const prefs = { accepted: true, analytics: !!analytics, marketing: !!marketing };
            try { localStorage.setItem('solvy_cookie_prefs', JSON.stringify(prefs)); } catch (e) { }
            try { localStorage.setItem('solvy_cookie_accepted', '1'); } catch (e) { }
            const b = document.getElementById('cookieBanner') || bannerReference;
            if (b) b.remove();
            bsModal.hide();
        });
    } catch (err) {
        console.error('showCookieModal error', err);
    }
}

// Robust carousel initializer: retry if bootstrap isn't ready or carousel element not yet available
function initHomeCarousel() {
    const el = document.getElementById('homeCarousel');
    if (!el) return;
    // avoid double-init
    if (el.__solvyCarouselInitialized) return;
    try {
        // eslint-disable-next-line no-undef
        const car = new bootstrap.Carousel(el, {
            interval: 5000,
            ride: 'carousel',
            pause: 'hover',
            wrap: true
        });
        el.__solvyCarouselInitialized = true;
        return car;
    } catch (err) {
        // bootstrap might not be loaded yet; ignore and allow retries
        return null;
    }
}

// Try to initialize carousel at several times: DOMContentLoaded, window load and a few retries
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initHomeCarousel, 200);
});
window.addEventListener('load', function () {
    initHomeCarousel();
    // additional retries in case resources take longer
    setTimeout(initHomeCarousel, 500);
    setTimeout(initHomeCarousel, 1500);
});
