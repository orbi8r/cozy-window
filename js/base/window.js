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
    // Create drag area (single type)
    this.dragArea = document.createElement('div');
    this.dragArea.classList.add('drag-area');
    this.element.appendChild(this.dragArea);
    this.container.appendChild(this.element);
    
    // Spawn animation: scale from 0 to 1
    this.element.style.transform = 'scale(0)';
    setTimeout(() => {
      this.element.style.transform = 'scale(1)';
    }, 50);
  }
  setupDragging() {
    let isDragging = false, offsetX = 0, offsetY = 0;
    let currentX = 0, currentY = 0, targetX = 0, targetY = 0;
    let dragRAFID = null;
    const deleteThreshold = 50;
    let inDeleteZone = false;
    const lerp = (a, b, t) => a + (b - a) * t;
    
    const updateDrag = () => {
      if(!isDragging) return;
      currentX = lerp(currentX, targetX, 0.2);
      currentY = lerp(currentY, targetY, 0.2);
      this.element.style.left = currentX + 'px';
      this.element.style.top = currentY + 'px';
      
      // Update deletion zone and dispatch windowmove event
      const rect = this.element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const area = rect.width * rect.height;
      const velocity = { vx: targetX - currentX, vy: targetY - currentY };
      if (this.config.deletable !== false &&
         (rect.left < deleteThreshold ||
          rect.top < deleteThreshold ||
          rect.right > window.innerWidth - deleteThreshold ||
          rect.bottom > window.innerHeight - deleteThreshold)) {
        inDeleteZone = true;
        let globalHint = document.getElementById('global-delete-hint');
        if (!globalHint) {
          globalHint = document.createElement('div');
          globalHint.id = 'global-delete-hint';
          globalHint.textContent = 'DELETE';
          globalHint.classList.add('global-delete-hint');
          document.getElementById('viewport').appendChild(globalHint);
        }
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
          hintX = window.innerWidth - 105;
          hintY = rect.top + rect.height / 2 - 25;
        } else {
          hintX = rect.left + rect.width / 2 - 50;
          hintY = window.innerHeight - 55;
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
      this.canvas.dispatchEvent(new CustomEvent('windowmove', { 
        detail: { x: centerX, y: centerY, velocity, area, id: this.element.id } 
      }));
      dragRAFID = requestAnimationFrame(updateDrag);
    };
    
    const dragStart = (e) => {
      isDragging = true;
      offsetX = e.clientX - this.element.offsetLeft;
      offsetY = e.clientY - this.element.offsetTop;
      currentX = this.element.offsetLeft;
      currentY = this.element.offsetTop;
      targetX = currentX;
      targetY = currentY;
      this.element.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
      e.preventDefault();
      dragRAFID = requestAnimationFrame(updateDrag);
    };
    
    this.dragArea.addEventListener('pointerdown', dragStart);
    document.addEventListener('pointermove', (e) => {
      if (isDragging) {
        targetX = e.clientX - offsetX;
        targetY = e.clientY - offsetY;
      }
    });
    const dragEnd = () => {
      if (isDragging) {
        cancelAnimationFrame(dragRAFID);
        if (inDeleteZone && this.config.deletable !== false) {
          const rect = this.element.getBoundingClientRect();
          const delX = rect.left + rect.width / 2;
          const delY = rect.top + rect.height / 2;
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
        let globalHint = document.getElementById('global-delete-hint');
        if (globalHint) { globalHint.remove(); }
        isDragging = false;
        this.element.style.boxShadow = '';
      }
    };
    document.addEventListener('pointerup', dragEnd);
  }
  setupResizing() {
    const borderThreshold = 10;
    let isResizing = false, startX, startY, startWidth, startHeight, startLeft, startTop;
    let activeEdges = { left: false, right: false, top: false, bottom: false };
    let currentWidth, currentHeight, currentLeft, currentTop;
    let targetWidth, targetHeight, targetLeft, targetTop;
    let resizeRAFID;
    const lerp = (a, b, t) => a + (b - a) * t;
    
    const updateResize = () => {
      if (!isResizing) return;
      currentWidth = lerp(currentWidth, targetWidth, 0.2);
      currentHeight = lerp(currentHeight, targetHeight, 0.2);
      currentLeft = lerp(currentLeft, targetLeft, 0.2);
      currentTop = lerp(currentTop, targetTop, 0.2);
      this.element.style.width = currentWidth + 'px';
      this.element.style.height = currentHeight + 'px';
      this.element.style.left = currentLeft + 'px';
      this.element.style.top = currentTop + 'px';
      resizeRAFID = requestAnimationFrame(updateResize);
    };
    
    const onPointerDown = (e) => {
      const rect = this.element.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      currentWidth = startWidth;
      currentHeight = startHeight;
      currentLeft = startLeft;
      currentTop = startTop;
      activeEdges = {
        left: e.clientX - rect.left <= borderThreshold,
        right: rect.right - e.clientX <= borderThreshold,
        top: e.clientY - rect.top <= borderThreshold,
        bottom: rect.bottom - e.clientY <= borderThreshold
      };
      if (activeEdges.left || activeEdges.right || activeEdges.top || activeEdges.bottom) {
        isResizing = true;
        e.preventDefault();
        e.stopPropagation();
        targetWidth = startWidth;
        targetHeight = startHeight;
        targetLeft = startLeft;
        targetTop = startTop;
        resizeRAFID = requestAnimationFrame(updateResize);
      }
    };
    
    const onPointerMove = (e) => {
      if (isResizing) {
        let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;
        if (activeEdges.right) {
          newWidth = Math.max(startWidth + (e.clientX - startX), this.config.minWidth);
        }
        if (activeEdges.bottom) {
          newHeight = Math.max(startHeight + (e.clientY - startY), this.config.minHeight);
        }
        if (activeEdges.left) {
          newWidth = Math.max(startWidth - (e.clientX - startX), this.config.minWidth);
          newLeft = startLeft + (e.clientX - startX);
        }
        if (activeEdges.top) {
          newHeight = Math.max(startHeight - (e.clientY - startY), this.config.minHeight);
          newTop = startTop + (e.clientY - startY);
        }
        targetWidth = newWidth;
        targetHeight = newHeight;
        targetLeft = newLeft;
        targetTop = newTop;
        e.preventDefault();
      } else {
        const rect = this.element.getBoundingClientRect();
        const x = e.clientX, y = e.clientY;
        let cursor = '';
        const nearLeft = x - rect.left <= borderThreshold;
        const nearRight = rect.right - x <= borderThreshold;
        const nearTop = y - rect.top <= borderThreshold;
        const nearBottom = rect.bottom - y <= borderThreshold;
        if ((nearLeft && nearTop) || (nearRight && nearBottom)) {
          cursor = 'nwse-resize';
        } else if ((nearRight && nearTop) || (nearLeft && nearBottom)) {
          cursor = 'nesw-resize';
        } else if (nearLeft || nearRight) {
          cursor = 'ew-resize';
        } else if (nearTop || nearBottom) {
          cursor = 'ns-resize';
        } else {
          cursor = '';
        }
        this.element.style.cursor = cursor;
      }
    };
    
    const onPointerUp = () => {
      if (isResizing) {
        cancelAnimationFrame(resizeRAFID);
        isResizing = false;
        this.element.style.cursor = '';
      }
    };
    
    this.element.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }
  forwardEvents() {
    const forward = (e) => {
      if (!e.target.classList.contains('drag-area')) {
        this.canvas.dispatchEvent(new MouseEvent(e.type, e));
      }
    };
    ['mousemove', 'click'].forEach(evt =>
      this.element.addEventListener(evt, forward)
    );
  }
}
window.BaseWindow = BaseWindow;
