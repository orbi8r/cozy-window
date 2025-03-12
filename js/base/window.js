class BaseWindow {
  constructor(config, container, canvas) {
    this.container = container;
    this.canvas = canvas;
    this.config = Object.assign({
      width: 300,
      height: 300,
      minWidth: 150,
      minHeight: 150,
      color: 'rgba(0,0,0,0.3)',
      id: 'win-' + Date.now(),
      deletable: true  // default is deletable
    }, config);
    this.createElement();
    this.setupDragging();
    this.setupResizing();
    this.forwardEvents();
  }
  createElement() {
    this.element = document.createElement('div');
    this.element.classList.add('window');
    this.element.id = this.config.id;
    this.element.style.setProperty('--window-color', this.config.color);
    this.element.style.width = this.config.width + 'px';
    this.element.style.height = this.config.height + 'px';
    if(this.config.left !== undefined) {
      this.element.style.left = this.config.left + 'px';
    }
    if(this.config.top !== undefined) {
      this.element.style.top = this.config.top + 'px';
    }
    // Create handles
    this.dragArea = document.createElement('div');
    this.dragArea.classList.add('drag-area');
    this.element.appendChild(this.dragArea);
    this.dragAreaLeft = document.createElement('div');
    this.dragAreaLeft.classList.add('drag-area-left');
    this.element.appendChild(this.dragAreaLeft);
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.classList.add('resize-handle');
    this.element.appendChild(this.resizeHandle);
    this.container.appendChild(this.element);
    
    // Spawn animation: scale from 0 to 1
    this.element.style.transform = 'scale(0)';
    setTimeout(() => {
      this.element.style.transform = 'scale(1)';
    }, 50);
  }
  setupDragging() {
    let isDragging = false, offsetX = 0, offsetY = 0;
    const deleteThreshold = 50; // px from any screen edge triggers deletion zone
    let inDeleteZone = false;
    
    const dragStart = (e) => {
      isDragging = true;
      offsetX = e.clientX - this.element.offsetLeft;
      offsetY = e.clientY - this.element.offsetTop;
      this.element.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
      e.preventDefault();
    };
    this.dragArea.addEventListener('mousedown', dragStart);
    this.dragAreaLeft.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newLeft = e.clientX - offsetX;
        const newTop = e.clientY - offsetY;
        this.element.style.left = newLeft + 'px';
        this.element.style.top = newTop + 'px';
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const area = rect.width * rect.height;
        const velocity = { vx: e.clientX - centerX, vy: e.clientY - centerY };
        
        // Check if near any screen edge:
        if (this.config.deletable !== false &&
           (rect.left < deleteThreshold ||
            rect.top < deleteThreshold ||
            rect.right > window.innerWidth - deleteThreshold ||
            rect.bottom > window.innerHeight - deleteThreshold)) {
          inDeleteZone = true;
          // Create or update a global "DELETE" hint positioned at the edge.
          let globalHint = document.getElementById('global-delete-hint');
          if (!globalHint) {
            globalHint = document.createElement('div');
            globalHint.id = 'global-delete-hint';
            globalHint.textContent = 'DELETE';
            globalHint.style.position = 'absolute';
            globalHint.style.background = 'red';
            globalHint.style.color = 'white';
            globalHint.style.fontSize = '32px';
            globalHint.style.fontFamily = 'Arial, sans-serif';
            globalHint.style.padding = '10px 20px';
            globalHint.style.borderRadius = '15px';
            globalHint.style.zIndex = '9999';
            document.getElementById('viewport').appendChild(globalHint);
          }
          // Determine which edge is closest.
          const distances = {
            left: rect.left,
            top: rect.top,
            right: window.innerWidth - (rect.left + rect.width),
            bottom: window.innerHeight - (rect.top + rect.height)
          };
          const minDistance = Math.min(distances.left, distances.top, distances.right, distances.bottom);
          let hintX = 0, hintY = 0;
          if (minDistance === distances.left) {
            hintX = 5;
            hintY = rect.top + rect.height / 2 - 25;
          } else if (minDistance === distances.top) {
            hintX = rect.left + rect.width / 2 - 50;
            hintY = 5;
          } else if (minDistance === distances.right) {
            hintX = window.innerWidth - 105; // 5px padding, approx width 100px
            hintY = rect.top + rect.height / 2 - 25;
          } else { // bottom
            hintX = rect.left + rect.width / 2 - 50;
            hintY = window.innerHeight - 55; // 5px padding, approx height 50px
          }
          globalHint.style.left = hintX + 'px';
          globalHint.style.top = hintY + 'px';
          globalHint.style.opacity = '1';
        } else {
          inDeleteZone = false;
          let globalHint = document.getElementById('global-delete-hint');
          if (globalHint) {
            globalHint.style.opacity = '0';
            setTimeout(() => {
              if (globalHint && globalHint.style.opacity === '0') globalHint.remove();
            }, 300);
          }
        }
        
        // Dispatch move event using window center.
        this.canvas.dispatchEvent(new CustomEvent('windowmove', { 
          detail: { x: centerX, y: centerY, velocity, area, id: this.element.id } 
        }));
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        if (inDeleteZone && this.config.deletable !== false) {
          const rect = this.element.getBoundingClientRect();
          const delX = rect.left + rect.width / 2;
          const delY = rect.top + rect.height / 2;
          // Trigger explosion: scale up (without rotation) and fade out.
          this.element.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
          this.element.style.transform = 'scale(1.8)';
          this.element.style.opacity = '0';
          this.canvas.dispatchEvent(new CustomEvent('explosion', { 
            detail: { x: delX, y: delY, id: this.element.id }
          }));
          setTimeout(() => {
            this.element.remove();
          }, 500);
        }
        // Remove global delete hint if it exists.
        let globalHint = document.getElementById('global-delete-hint');
        if (globalHint) {
          globalHint.remove();
        }
        isDragging = false;
        this.element.style.boxShadow = '';
      }
    });
  }
  setupResizing() {
    let isResizing = false, initW, initH, startX, startY;
    this.resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      initW = this.element.offsetWidth;
      initH = this.element.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      this.element.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        const newW = Math.max(initW + (e.clientX - startX), this.config.minWidth);
        const newH = Math.max(initH + (e.clientY - startY), this.config.minHeight);
        this.element.style.width = newW + 'px';
        this.element.style.height = newH + 'px';
        const rect = this.element.getBoundingClientRect();
        // Use the edge from which size is increasing.
        const pushX = (e.clientX - startX > 0) ? rect.left + rect.width : rect.left;
        const pushY = (e.clientY - startY > 0) ? rect.top + rect.height : rect.top;
        const area = newW * newH;
        this.canvas.dispatchEvent(new CustomEvent('windowmove', { 
          detail: { x: pushX, y: pushY, velocity: { vx: 0, vy: 0 }, area, id: this.element.id } 
        }));
      }
    });
    document.addEventListener('mouseup', () => { 
      isResizing = false;
      this.element.style.boxShadow = ''; 
    });
  }
  forwardEvents() {
    const forward = (e) => {
      if (!e.target.classList.contains('drag-area') &&
          !e.target.classList.contains('drag-area-left') &&
          !e.target.classList.contains('resize-handle')) {
        this.canvas.dispatchEvent(new MouseEvent(e.type, e));
      }
    };
    ['mousemove', 'click'].forEach(evt =>
      this.element.addEventListener(evt, forward)
    );
  }
}
window.BaseWindow = BaseWindow;
