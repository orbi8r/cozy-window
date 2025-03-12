(function(){
  const container = document.getElementById('windows-container');
  const canvas = document.getElementById('canvas');
  let windowCounter = 1;
  
  // New helper: generate candidate positions and choose the one with minimal overlap.
  function calculateSpawnPosition(desiredWidth, desiredHeight) {
    const borderMargin = 50;
    const spacing = 30;
    const candidates = [];
    
    // Generate grid candidates within visible area
    for (let left = borderMargin; left <= window.innerWidth - desiredWidth - borderMargin; left += spacing) {
      for (let top = borderMargin; top <= window.innerHeight - desiredHeight - borderMargin; top += spacing) {
        candidates.push({ left, top });
      }
    }
    
    // Helper to compute overlapping area between two rectangles.
    function overlapArea(r1, r2) {
      const overlapWidth = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
      const overlapHeight = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
      return overlapWidth * overlapHeight;
    }
    
    const windows = container.querySelectorAll('.window');
    let bestCandidate = null;
    let minOverlap = Infinity;
    const viewportCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    for (let candidate of candidates) {
      const candidateRect = {
        left: candidate.left,
        top: candidate.top,
        right: candidate.left + desiredWidth,
        bottom: candidate.top + desiredHeight
      };
      let totalOverlap = 0;
      windows.forEach(win => {
        const rect = win.getBoundingClientRect();
        totalOverlap += overlapArea(candidateRect, rect);
      });
      
      if (totalOverlap < minOverlap) {
        minOverlap = totalOverlap;
        bestCandidate = candidate;
      } else if (totalOverlap === minOverlap) {
        // Tiebreaker: candidate closer to viewport center
        const candidateCenter = { x: candidate.left + desiredWidth/2, y: candidate.top + desiredHeight/2 };
        const bestCenter = { x: bestCandidate.left + desiredWidth/2, y: bestCandidate.top + desiredHeight/2 };
        const distCandidate = Math.hypot(candidateCenter.x - viewportCenter.x, candidateCenter.y - viewportCenter.y);
        const distBest = Math.hypot(bestCenter.x - viewportCenter.x, bestCenter.y - viewportCenter.y);
        if (distCandidate < distBest) bestCandidate = candidate;
      }
    }
    
    return bestCandidate || {
      left: Math.max(borderMargin, Math.min((window.innerWidth - desiredWidth) / 2, window.innerWidth - desiredWidth - borderMargin)),
      top: Math.max(borderMargin, Math.min((window.innerHeight - desiredHeight) / 2, window.innerHeight - desiredHeight - borderMargin))
    };
  }
  
  function spawnWindow(config) {
    config.id = 'win-' + (windowCounter++);
    const desiredWidth = config.width || 300;
    const desiredHeight = config.height || 300;
    // Use calculated position that minimizes overlapping area.
    const pos = calculateSpawnPosition(desiredWidth, desiredHeight);
    config.left = pos.left;
    config.top = pos.top;
    new BaseWindow(config, container, canvas);
  }
  
  window.spawnWindow = spawnWindow;
})();
