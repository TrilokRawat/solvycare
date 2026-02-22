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
          <div class="product-card product-card-full h-100">
            <div class="product-card-image">
              <img src="${image}" alt="${product.name}">
            </div>
            <div class="product-card-body">
              <span class="product-card-category">${category}</span>
              <h3 class="product-card-title">${product.name}</h3>
              <p class="product-card-desc">${product.shortDescription || ""}</p>
              <div class="product-card-actions">
                <a href="${href}" class="btn btn-accent btn-sm">View details</a>
                <a href="https://wa.me/919111912346?text=${waText}" target="_blank" rel="noopener" class="btn btn-outline-success btn-sm" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
              </div>
            </div>
          </div>
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

    // Populate elements
    const img = document.getElementById("product-image");
    const nameEl = document.getElementById("product-name");
    const shortDescEl = document.getElementById("product-short-description");
    const descEl = document.getElementById("product-description");
    const featuresList = document.getElementById("product-features");
    const sizesList = document.getElementById("product-sizes");
    const industriesList = document.getElementById("product-industries");

    const categoryEl = document.getElementById("product-category");
    if (img) {
        const basePath = getBasePath();
        img.src = basePath + (product.image || "assets/images/placeholder.png");
        img.alt = product.name + " product image";
    }
    if (categoryEl) categoryEl.textContent = product.category || "Cleaning Solution";
    if (nameEl) nameEl.textContent = product.name || "";
    if (shortDescEl) shortDescEl.textContent = product.shortDescription || "";
    if (descEl) descEl.textContent = product.description || "";

    function renderList(listElement, items) {
        if (!listElement) return;
        listElement.innerHTML = "";
        if (Array.isArray(items)) {
            items.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                listElement.appendChild(li);
            });
        }
    }

    renderList(featuresList, product.features);
    renderList(sizesList, product.sizes);
    renderList(industriesList, product.industries);

    // Update dynamic SEO + schema
    updateProductSEO(product);
    injectProductSchema(product);

    // Update Get Quote and WhatsApp CTA (if present)
    const quoteBtn = document.getElementById("product-quote-btn");
    if (quoteBtn) {
        const basePath = getBasePath();
        quoteBtn.href = basePath + "contact.html";
    }
    const waBtn = document.getElementById("product-whatsapp-btn");
    if (waBtn) {
        const text = `I am interested in ${product.name} from SOLVY.`;
        waBtn.href = "https://wa.me/919111912346?text=" + encodeURIComponent(text);
    }
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
