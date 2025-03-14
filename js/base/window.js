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
    const deleteThreshold = 50; // px from any screen edge triggers deletion zone
    let inDeleteZone = false;
    
    const dragStart = (e) => {
      isDragging = true;
      offsetX = e.clientX - this.element.offsetLeft;
      offsetY = e.clientY - this.element.offsetTop;
      this.element.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
      e.preventDefault();
    };

    // Touch version of dragStart
    const touchStart = (e) => {
      const touch = e.touches[0];
      isDragging = true;
      offsetX = touch.clientX - this.element.offsetLeft;
      offsetY = touch.clientY - this.element.offsetTop;
      this.element.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
      e.preventDefault();
    };

    this.dragArea.addEventListener('mousedown', dragStart);
    this.dragArea.addEventListener('touchstart', touchStart);

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
            // Removed inline style assignments; using CSS class instead.
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
      }
    });
    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        const newLeft = touch.clientX - offsetX;
        const newTop = touch.clientY - offsetY;
        this.element.style.left = newLeft + 'px';
        this.element.style.top = newTop + 'px';
        // Replicate delete zone logic using touch coordinates
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const area = rect.width * rect.height;
        const velocity = { vx: touch.clientX - centerX, vy: touch.clientY - centerY };
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
          // ...existing code to position globalHint...
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
        e.preventDefault();
      }
    });

    const dragEnd = () => {
      if (isDragging) {
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
        if (globalHint) {
          globalHint.remove();
        }
        isDragging = false;
        this.element.style.boxShadow = '';
      }
    };

    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
  }
  setupResizing() {
    const borderThreshold = 10;
    let isResizing = false, startX, startY, startWidth, startHeight, startLeft, startTop;
    let activeEdges = { left: false, right: false, top: false, bottom: false };

    const onMouseDown = (e) => {
      const rect = this.element.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
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
      }
    };

    // Touch version of onMouseDown for resizing
    const onTouchStart = (e) => {
      const touch = e.touches[0];
      const rect = this.element.getBoundingClientRect();
      startX = touch.clientX;
      startY = touch.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      startTop = rect.top;
      activeEdges = {
        left: touch.clientX - rect.left <= borderThreshold,
        right: rect.right - touch.clientX <= borderThreshold,
        top: touch.clientY - rect.top <= borderThreshold,
        bottom: rect.bottom - touch.clientY <= borderThreshold
      };
      if (activeEdges.left || activeEdges.right || activeEdges.top || activeEdges.bottom) {
        isResizing = true;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onMouseMove = (e) => {
      if (isResizing) {
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
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
        this.element.style.width = newWidth + 'px';
        this.element.style.height = newHeight + 'px';
        this.element.style.left = newLeft + 'px';
        this.element.style.top = newTop + 'px';
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.canvas.dispatchEvent(new CustomEvent('windowmove', { 
          detail: { x: centerX, y: centerY, velocity: { vx: 0, vy: 0 }, area: newWidth * newHeight, id: this.element.id }
        }));
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

    const onTouchMove = (e) => {
      if (isResizing) {
        const touch = e.touches[0];
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
        if (activeEdges.right) {
          newWidth = Math.max(startWidth + (touch.clientX - startX), this.config.minWidth);
        }
        if (activeEdges.bottom) {
          newHeight = Math.max(startHeight + (touch.clientY - startY), this.config.minHeight);
        }
        if (activeEdges.left) {
          newWidth = Math.max(startWidth - (touch.clientX - startX), this.config.minWidth);
          newLeft = startLeft + (touch.clientX - startX);
        }
        if (activeEdges.top) {
          newHeight = Math.max(startHeight - (touch.clientY - startY), this.config.minHeight);
          newTop = startTop + (touch.clientY - startY);
        }
        this.element.style.width = newWidth + 'px';
        this.element.style.height = newHeight + 'px';
        this.element.style.left = newLeft + 'px';
        this.element.style.top = newTop + 'px';
        const rect = this.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.canvas.dispatchEvent(new CustomEvent('windowmove', { 
          detail: { x: centerX, y: centerY, velocity: { vx: 0, vy: 0 }, area: newWidth * newHeight, id: this.element.id }
        }));
        e.preventDefault();
      }
    };

    const onMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        this.element.style.cursor = '';
      }
    };

    const onTouchEnd = () => {
      if (isResizing) {
        isResizing = false;
        this.element.style.cursor = '';
      }
    };

    this.element.addEventListener('mousedown', onMouseDown);
    this.element.addEventListener('touchstart', onTouchStart);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onTouchEnd);
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
