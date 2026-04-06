document.addEventListener('DOMContentLoaded', () => {
    const portfolioGrid = document.getElementById('portfolio-grid');
    const categoryGrid = document.getElementById('category-grid');
    const filtersContainer = document.getElementById('portfolio-filters');
    const categoryDesc = document.getElementById('category-description');
    const portfolioTitle = document.getElementById('portfolio-title');
    
    const categories = portfolioData.categories || [];
    const items = portfolioData.items || [];
    
    // ------------------------------------
    // 1. HOME PAGE: CATEGORY GRID
    // ------------------------------------
    if (categoryGrid) {
        categories.filter(cat => cat.id !== 'video').forEach(cat => {
            let imgSrc = '';
            if (cat.id === 'corporate') imgSrc = 'images/Reklamen_fotograf_Grigor_Dimitrov-1.jpg';
            else if (cat.id === 'corporate_portrait') imgSrc = 'images/Korporativen_portret_EAE_Petar_Peshev-1.jpg';
            else if (cat.id === 'fashion') imgSrc = 'images/Modna_fotografia_Petar_Peshev-1.jpg';
            else if (cat.id === 'portrait') imgSrc = 'images/Martin_Portret_fotograf_petar_peshev-1.jpg';
            else if (cat.id === 'ambrotype') imgSrc = 'images/Ambrotipia_fotograf_Petar_Peshev-1.jpg';
            else if (cat.id === 'sport') imgSrc = 'images/Neviana_Vladinova_sportna_fotografia_petar_peshev-1.jpg';
            else {
                const reprItem = items.find(item => item.category === cat.id);
                imgSrc = reprItem ? reprItem.image : 'images/PPP-2.png';
            }
            
            let catTitle = cat.title;
            if (cat.id === 'corporate') catTitle = 'РЕКЛАМНА ФОТОГРАФИЯ';
            else if (cat.id === 'fashion') catTitle = 'МОДНА ФОТОГРАФИЯ';
            else if (cat.id === 'portrait') catTitle = 'ПОРТРЕТНА ФОТОГРАФИЯ';
            else if (cat.id === 'corporate_portrait') catTitle = 'БИЗНЕС ПОРТРЕТ';
            else if (cat.id === 'ambrotype') catTitle = 'АМБРОТИПИЯ';
            else if (cat.id === 'sport') catTitle = 'СПОРТНА ФОТОГРАФИЯ';

            const a = document.createElement('a');
            a.className = 'category-card';
            a.href = `/portfolio?category=${cat.id}`;
            a.innerHTML = `
                <div class="category-card-img-wrapper">
                    <img src="${imgSrc}" alt="${catTitle}" loading="lazy">
                    <div class="category-card-overlay">
                        <h3>${catTitle}</h3>
                    </div>
                </div>
            `;
            categoryGrid.appendChild(a);
        });
    }

    // ------------------------------------
    // 2. PORTFOLIO PAGE: PORTFOLIO GRID
    // ------------------------------------
    if (portfolioGrid) {
        // Read URL parameter to see which category to preload
        const urlParams = new URLSearchParams(window.location.search);
        let selectedCategory = urlParams.get('category') || 'all';
        
        // Ensure the parameter passed exists in our categories list, otherwise fallback to "all"
        if (selectedCategory !== 'all' && !categories.find(c => c.id === selectedCategory)) {
            selectedCategory = 'all';
        }

        // Render Filters dynamically (only if filter bar exists)
        if (filtersContainer) {
            categories.forEach(cat => {
                const li = document.createElement('li');
                li.className = 'filter';
                if (selectedCategory === cat.id) {
                    li.classList.add('active');
                }
                li.setAttribute('data-filter', cat.id);
                li.textContent = cat.title;
                filtersContainer.appendChild(li);
            });

            if (selectedCategory === 'all') {
                const allBtn = filtersContainer.querySelector('.filter[data-filter="all"]');
                if (allBtn) allBtn.classList.add('active');
            }
        }

        const allFilters = document.querySelectorAll('.filter');

        // Current rendered items for lightbox navigation
        let currentItems = [];

        // Function to render items
        function renderPortfolio(renderItems) {
            portfolioGrid.classList.add('filtering');
            setTimeout(() => {
                portfolioGrid.innerHTML = '';
                currentItems = renderItems;

                const isVideoCategory = renderItems.length > 0 && renderItems[0].type === 'video';
                if (isVideoCategory) {
                    portfolioGrid.classList.add('video-grid');
                } else {
                    portfolioGrid.classList.remove('video-grid');
                }

                renderItems.forEach((item, index) => {
                    const article = document.createElement('article');

                    if (item.type === 'video') {
                        article.className = 'portfolio-item video-item';
                        const start = item.youtubeStart ? `?start=${item.youtubeStart}` : '';
                        article.innerHTML = `
                            <div class="video-embed-wrap">
                                <iframe
                                    src="https://www.youtube.com/embed/${item.youtubeId}${start}"
                                    title="${item.title}"
                                    frameborder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowfullscreen
                                    loading="lazy"
                                ></iframe>
                            </div>
                        `;
                    } else {
                        article.className = 'portfolio-item';
                        article.dataset.index = index;
                        article.innerHTML = `
                            <img src="${item.image}" alt="${item.title}" loading="lazy">
                            <div class="portfolio-overlay">
                                <span>${item.description}</span>
                            </div>
                        `;
                        article.addEventListener('click', () => openLightbox(index));
                    }

                    portfolioGrid.appendChild(article);
                });
                portfolioGrid.classList.remove('filtering');
            }, 160);
        }

        // Lightbox
        const lightbox     = document.getElementById('lightbox');
        const lbImg        = document.getElementById('lightbox-img');
        const lbCaption    = document.getElementById('lightbox-caption');
        const lbClose      = document.getElementById('lightbox-close');
        const lbPrev       = document.getElementById('lightbox-prev');
        const lbNext       = document.getElementById('lightbox-next');
        let lbIndex = 0;

        function openLightbox(index) {
            if (!lightbox) return;
            lbIndex = index;
            const item = currentItems[lbIndex];
            lbImg.src = item.image;
            lbImg.alt = item.title;
            lbCaption.textContent = item.description;
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            if (!lightbox) return;
            lightbox.classList.remove('open');
            document.body.style.overflow = '';
            setTimeout(() => { lbImg.src = ''; }, 300);
        }

        function navigateLightbox(dir) {
            lbIndex = (lbIndex + dir + currentItems.length) % currentItems.length;
            const item = currentItems[lbIndex];
            lbImg.style.opacity = '0';
            setTimeout(() => {
                lbImg.src = item.image;
                lbImg.alt = item.title;
                lbCaption.textContent = item.description;
                lbImg.style.opacity = '1';
            }, 150);
        }

        if (lightbox) {
            lbClose.addEventListener('click', closeLightbox);
            lbPrev.addEventListener('click', () => navigateLightbox(-1));
            lbNext.addEventListener('click', () => navigateLightbox(1));
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) closeLightbox();
            });
            document.addEventListener('keydown', (e) => {
                if (!lightbox.classList.contains('open')) return;
                if (e.key === 'Escape')      closeLightbox();
                if (e.key === 'ArrowLeft')   navigateLightbox(-1);
                if (e.key === 'ArrowRight')  navigateLightbox(1);
            });
        }
        
        // Function to update visual state based on category string
        function updateCategoryView(categoryId) {
            if (categoryId === 'all') {
                if (categoryDesc) categoryDesc.classList.remove('visible');
                if (portfolioTitle) portfolioTitle.textContent = "Всички Творби";
                renderPortfolio(items);
            } else {
                const filtered = items.filter(item => item.category === categoryId);
                const currentCategory = categories.find(c => c.id === categoryId);

                if (currentCategory && currentCategory.description && currentCategory.description.trim().length > 0) {
                    if (categoryDesc) {
                        // Strip the boilerplate cookie/service text that gets appended
                        let desc = currentCategory.description;
                        const cutoff = desc.indexOf('&#8211; Рекламна фотография');
                        if (cutoff > 0) desc = desc.substring(0, cutoff).trim();
                        categoryDesc.innerHTML = desc;
                        categoryDesc.classList.add('visible');
                    }
                } else {
                    if (categoryDesc) categoryDesc.classList.remove('visible');
                }

                if (portfolioTitle && currentCategory) {
                    portfolioTitle.textContent = currentCategory.title;
                }

                renderPortfolio(filtered);
            }
        }
        
        // Initial execution
        updateCategoryView(selectedCategory);

        // Filter Click Events (only if filters exist)
        if (allFilters.length > 0) {
            allFilters.forEach(filter => {
                filter.addEventListener('click', (e) => {
                    allFilters.forEach(f => f.classList.remove('active'));
                    e.target.classList.add('active');
                    const catId = e.target.getAttribute('data-filter');
                    window.history.pushState({}, '', `/portfolio?category=${catId}`);
                    updateCategoryView(catId);
                });
            });
        }
    }

    // ------------------------------------
    // 3. UI BEHAVIORS
    // ------------------------------------
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        // Only apply scroll effect if it's not already forced scrolled (e.g. portfolio page has 'scrolled' class initially)
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            // Keep scrolled class if background is needed at top
            const isPortfolioPage = !!document.querySelector('.port-header');
            if (!isPortfolioPage) {
                navbar.classList.remove('scrolled');
            }
        }
    });
    
    // Ensure Portfolio page starts with solid navbar background
    if (document.querySelector('.port-header')) {
        navbar.classList.add('scrolled');
    }

    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            mobileBtn.classList.toggle('open', isOpen);
            mobileBtn.setAttribute('aria-expanded', isOpen);
            // Collapse portfolio dropdown when main menu closes
            if (!isOpen) {
                document.querySelectorAll('.nav-dropdown-wrap').forEach(w => w.classList.remove('mobile-open'));
            }
        });

        // Portfolio dropdown toggle on mobile
        const dropdownWrap = navLinks.querySelector('.nav-dropdown-wrap');
        if (dropdownWrap) {
            const portfolioLink = dropdownWrap.querySelector('a');
            portfolioLink.addEventListener('click', (e) => {
                // Only intercept on mobile (menu is open)
                if (navLinks.classList.contains('open')) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    dropdownWrap.classList.toggle('mobile-open');
                }
            });
        }

        // Close menu when a non-portfolio link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.closest('.nav-dropdown')) return; // dropdown links close normally
            if (link.closest('.nav-dropdown-wrap') && !link.closest('.nav-dropdown')) return; // skip portfolio toggle link
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                mobileBtn.classList.remove('open');
                mobileBtn.setAttribute('aria-expanded', 'false');
                document.querySelectorAll('.nav-dropdown-wrap').forEach(w => w.classList.remove('mobile-open'));
            });
        });

        // Close menu when dropdown category links are clicked
        navLinks.querySelectorAll('.nav-dropdown a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                mobileBtn.classList.remove('open');
                mobileBtn.setAttribute('aria-expanded', 'false');
                document.querySelectorAll('.nav-dropdown-wrap').forEach(w => w.classList.remove('mobile-open'));
            });
        });
    }

    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Благодарим ви! Вашето съобщение беше изпратено успешно.');
            form.reset();
        });
    }

    // ------------------------------------
    // PAGE TRANSITION ON NAVIGATION
    // ------------------------------------
    document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        // Only intercept same-site, non-anchor, non-target-blank links
        if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;
        // Skip links with query params (portfolio category links) to avoid issues
        if (href.includes('?')) return;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.add('page-exit');
            setTimeout(() => { window.location.href = href; }, 150);
        });
    });

    // ------------------------------------
    // 4. SCROLL-TRIGGERED ANIMATIONS
    // ------------------------------------
    const animatedEls = document.querySelectorAll('[data-animate]');
    if (animatedEls.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        animatedEls.forEach(el => observer.observe(el));
    }

    // Stagger category cards on home page
    if (categoryGrid) {
        const cards = categoryGrid.querySelectorAll('.category-card');
        cards.forEach((card, i) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
            card.style.transitionDelay = `${i * 0.08}s`;
        });

        const gridObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                categoryGrid.querySelectorAll('.category-card').forEach(card => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
                gridObserver.unobserve(categoryGrid);
            }
        }, { threshold: 0.1 });

        gridObserver.observe(categoryGrid);
    }
});
