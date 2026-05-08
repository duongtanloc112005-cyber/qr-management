// ⚡ PERFORMANCE OPTIMIZATIONS FOR QR MANAGEMENT SYSTEM
// Tối ưu hóa hiệu suất và trải nghiệm người dùng

class PerformanceOptimizer {
    constructor() {
        this.observers = new Map();
        this.cache = new Map();
        this.batchQueue = [];
        this.batchTimeout = null;
        this.metrics = {
            renderTime: 0,
            dataLoadTime: 0,
            userInteractions: 0,
            errors: 0
        };
    }

    // Virtual scrolling cho bảng lớn
    createVirtualScroller(container, items, itemHeight = 50, visibleCount = 20) {
        const scroller = {
            container: container,
            items: items,
            itemHeight: itemHeight,
            visibleCount: visibleCount,
            scrollTop: 0,
            startIndex: 0,
            endIndex: visibleCount,
            
            init() {
                this.container.style.height = `${this.visibleCount * this.itemHeight}px`;
                this.container.style.overflow = 'auto';
                this.container.addEventListener('scroll', this.handleScroll.bind(this));
                this.render();
            },
            
            handleScroll() {
                this.scrollTop = this.container.scrollTop;
                this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
                this.endIndex = Math.min(this.startIndex + this.visibleCount, this.items.length);
                this.render();
            },
            
            render() {
                const fragment = document.createDocumentFragment();
                const offsetY = this.startIndex * this.itemHeight;
                
                for (let i = this.startIndex; i < this.endIndex; i++) {
                    if (i >= this.items.length) break;
                    
                    const item = this.createItemElement(this.items[i], i);
                    item.style.position = 'absolute';
                    item.style.top = `${offsetY + (i - this.startIndex) * this.itemHeight}px`;
                    item.style.width = '100%';
                    item.style.height = `${this.itemHeight}px`;
                    fragment.appendChild(item);
                }
                
                this.container.innerHTML = '';
                this.container.appendChild(fragment);
            },
            
            createItemElement(item, index) {
                // Override this method in your implementation
                const div = document.createElement('div');
                div.textContent = `Item ${index}: ${JSON.stringify(item)}`;
                return div;
            }
        };
        
        return scroller;
    }

    // Lazy loading cho images và content
    createLazyLoader() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    this.loadElement(element);
                    observer.unobserve(element);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
        
        return {
            observe: (element) => observer.observe(element),
            unobserve: (element) => observer.unobserve(element)
        };
    }

    loadElement(element) {
        if (element.dataset.src) {
            element.src = element.dataset.src;
            element.classList.add('loaded');
        }
        
        if (element.dataset.content) {
            element.innerHTML = element.dataset.content;
            element.classList.add('loaded');
        }
    }

    // Batch processing cho WebSocket messages
    batchWebSocketMessage(message, delay = 50) {
        this.batchQueue.push(message);
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        this.batchTimeout = setTimeout(() => {
            this.flushBatchQueue();
        }, delay);
    }

    flushBatchQueue() {
        if (this.batchQueue.length === 0) return;
        
        const batch = [...this.batchQueue];
        this.batchQueue = [];
        
        // Gửi batch message
        if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
            window.websocket.send(JSON.stringify({
                type: 'batch_update',
                messages: batch
            }));
        }
    }

    // Debounce cho search và filter
    debounce(func, wait) {
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

    // Throttle cho scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Memory management
    optimizeMemory() {
        // Clean up old cache entries
        const maxCacheSize = 1000;
        if (this.cache.size > maxCacheSize) {
            const entries = Array.from(this.cache.entries());
            const toKeep = entries.slice(-maxCacheSize);
            this.cache.clear();
            toKeep.forEach(([key, value]) => this.cache.set(key, value));
        }
        
        // Clean up observers
        for (const [key, observer] of this.observers.entries()) {
            if (observer.disconnected) {
                observer.disconnect();
                this.observers.delete(key);
            }
        }
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        // Monitor render performance
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'measure') {
                    this.metrics.renderTime = entry.duration;
                }
            }
        });
        
        observer.observe({ entryTypes: ['measure'] });
        
        // Monitor user interactions
        document.addEventListener('click', () => {
            this.metrics.userInteractions++;
        });
        
        // Monitor errors
        window.addEventListener('error', (event) => {
            this.metrics.errors++;
            console.error('Performance error:', event.error);
        });
    }

    // Get performance metrics
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            observersCount: this.observers.size,
            memoryUsage: this.getMemoryUsage()
        };
    }

    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    // Optimize table rendering
    optimizeTableRendering(tableId, data, options = {}) {
        const {
            pageSize = 50,
            virtualScrolling = true,
            lazyLoading = true
        } = options;
        
        const table = document.getElementById(tableId);
        if (!table) return;
        
        if (virtualScrolling && data.length > 100) {
            return this.createVirtualScroller(table, data);
        }
        
        // Pagination for large datasets
        if (data.length > pageSize) {
            return this.createPagination(table, data, pageSize);
        }
        
        return this.renderTableDirect(table, data);
    }

    createPagination(table, data, pageSize) {
        let currentPage = 1;
        const totalPages = Math.ceil(data.length / pageSize);
        
        const pagination = {
            currentPage,
            totalPages,
            pageSize,
            data,
            
            render() {
                const startIndex = (this.currentPage - 1) * this.pageSize;
                const endIndex = Math.min(startIndex + this.pageSize, this.data.length);
                const pageData = this.data.slice(startIndex, endIndex);
                
                this.renderTableBody(pageData);
                this.renderPaginationControls();
            },
            
            renderTableBody(data) {
                const tbody = table.querySelector('tbody');
                if (!tbody) return;
                
                tbody.innerHTML = data.map((item, index) => 
                    this.createTableRow(item, index)
                ).join('');
            },
            
            createTableRow(item, index) {
                // Override this method in your implementation
                return `<tr><td>${index + 1}</td><td>${JSON.stringify(item)}</td></tr>`;
            },
            
            renderPaginationControls() {
                let controls = table.querySelector('.pagination-controls');
                if (!controls) {
                    controls = document.createElement('div');
                    controls.className = 'pagination-controls';
                    table.parentNode.appendChild(controls);
                }
                
                controls.innerHTML = `
                    <button ${this.currentPage <= 1 ? 'disabled' : ''} 
                            onclick="pagination.previousPage()">Previous</button>
                    <span>Page ${this.currentPage} of ${this.totalPages}</span>
                    <button ${this.currentPage >= this.totalPages ? 'disabled' : ''} 
                            onclick="pagination.nextPage()">Next</button>
                `;
            },
            
            nextPage() {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.render();
                }
            },
            
            previousPage() {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.render();
                }
            }
        };
        
        pagination.render();
        return pagination;
    }

    renderTableDirect(table, data) {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        data.forEach((item, index) => {
            const row = this.createTableRowElement(item, index);
            fragment.appendChild(row);
        });
        
        tbody.innerHTML = '';
        tbody.appendChild(fragment);
    }

    createTableRowElement(item, index) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${index + 1}</td><td>${JSON.stringify(item)}</td>`;
        return tr;
    }

    // Loading states management
    showLoadingState(element, message = 'Đang tải...') {
        const loading = document.createElement('div');
        loading.className = 'loading-overlay';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        
        loading.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        element.style.position = 'relative';
        element.appendChild(loading);
        
        return loading;
    }

    hideLoadingState(element) {
        const loading = element.querySelector('.loading-overlay');
        if (loading) {
            loading.remove();
        }
    }

    // Preload critical resources
    preloadResources(resources) {
        resources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.url;
            link.as = resource.type;
            if (resource.crossorigin) {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        });
    }

    // Optimize images
    optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        const lazyLoader = this.createLazyLoader();
        
        images.forEach(img => {
            lazyLoader.observe(img);
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
} else {
    window.PerformanceOptimizer = PerformanceOptimizer;
}

