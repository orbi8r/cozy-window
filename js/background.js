const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let dots = [];
let mouse = { x: -10000, y: -10000 };
let clickIntensity = 0; // drives global shake/zoom
let windowInfluences = [];

// Global explosion event variable
window.explosionEvent = null;

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	initDots();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize dots in a grid pattern including original positions
function initDots() {
	dots = [];
	const spacing = 50; // grid spacing
	const radius = 2;
	for (let x = spacing; x < canvas.width; x += spacing) {
		for (let y = spacing; y < canvas.height; y += spacing) {
			dots.push({
				origX: x,
				origY: y,
				x: x,
				y: y,
				baseRadius: radius,
				radius: radius,
				clickAnim: 0,
				twinklePhase: Math.random() * 2 * Math.PI  // new twinkle phase for each dot
			});
		}
	}

	// Add extra white dots on the top edge
	for (let x = 0; x <= canvas.width; x += 50) {
		dots.push({
			origX: x,
			origY: 0,
			x: x,
			y: 0,
			baseRadius: 2,
			radius: 2,
			clickAnim: 0,
			twinklePhase: Math.random() * 2 * Math.PI
		});
	}
	// Add extra white dots on the left edge
	for (let y = 0; y <= canvas.height; y += 50) {
		dots.push({
			origX: 0,
			origY: y,
			x: 0,
			y: y,
			baseRadius: 2,
			radius: 2,
			clickAnim: 0,
			twinklePhase: Math.random() * 2 * Math.PI
		});
	}
}

// Remove/ignore separate mousemove and touchmove listeners
// Add pointermove listener for both mouse and touch
canvas.addEventListener('pointermove', function(e) {
	// Update mouse coordinates for hover animation
	const rect = canvas.getBoundingClientRect();
	mouse.x = e.clientX - rect.left;
	mouse.y = e.clientY - rect.top;
	e.preventDefault();
});

// Remove old pointerdown simulation and add deferred tap detection:
let lastPointerDown = null;
canvas.addEventListener('pointerdown', function(e) {
  if(e.pointerType === 'touch'){
    lastPointerDown = { time: performance.now(), x: e.clientX, y: e.clientY };
  }
});
canvas.addEventListener('pointerup', function(e) {
  if(e.pointerType === 'touch' && lastPointerDown){
    const dt = performance.now() - lastPointerDown.time;
    const dx = e.clientX - lastPointerDown.x;
    const dy = e.clientY - lastPointerDown.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist < 10 && dt < 200){
      const simulatedEvent = new MouseEvent('click', {
        clientX: e.clientX,
        clientY: e.clientY,
        bubbles: true,
        cancelable: true
      });
      canvas.dispatchEvent(simulatedEvent);
    }
    lastPointerDown = null;
  }
});

// New listener for windowmove events.
canvas.addEventListener('windowmove', function(e) {
	// Each event now carries: x, y, velocity {vx,vy}, and area.
	windowInfluences.push(e.detail);
});

// Listener for explosion events to trigger screen shake and explosion impulse.
canvas.addEventListener('explosion', function(e) {
	const now = performance.now();
	// Store explosion event details (lasting 600ms)
	window.explosionEvent = { 
		x: e.detail.x, 
		y: e.detail.y, 
		force: 100, 
		startTime: now, 
		duration: 600 
	};
	const viewport = document.getElementById('viewport');
	viewport.classList.add('shake');
	setTimeout(() => {
		viewport.classList.remove('shake');
	}, 600);
});

// On click, trigger pulse on dots in an expanded effect radius and start global click effect
canvas.addEventListener('click', function(e) {
	const rect = canvas.getBoundingClientRect();
	const clickX = e.clientX - rect.left;
	const clickY = e.clientY - rect.top;
	dots.forEach(dot => {
		const dx = dot.origX - clickX;
		const dy = dot.origY - clickY;
		const manhattan = Math.abs(dx) + Math.abs(dy);
		if (manhattan < 100) { // expanded effect radius
			dot.clickAnim = 1;
		}
	});
	clickIntensity = 1;
});

// Updated updateDots to use Manhattan distance instead of sqrt
function updateDots() {
	const effectRadius = 150; // increased mouse effect radius
	const currentTime = performance.now();
	let explosionFactor = 0;
	let expX = 0, expY = 0;
	if (window.shockwaveEvent) {
		const elapsed = currentTime - window.shockwaveEvent.startTime;
		if (elapsed < window.shockwaveEvent.duration) {
			explosionFactor = window.shockwaveEvent.force * (1 - elapsed / window.shockwaveEvent.duration);
			expX = window.shockwaveEvent.x;
			expY = window.shockwaveEvent.y;
		} else {
			window.shockwaveEvent = null;
		}
	}
	dots.forEach(dot => {
		const dx = dot.origX - mouse.x;
		const dy = dot.origY - mouse.y;
		const manhattan = Math.abs(dx) + Math.abs(dy);
		let displacement = { x: 0, y: 0 };
		if (manhattan < effectRadius && manhattan > 0) {
			const force = (effectRadius - manhattan) / effectRadius;
			displacement.x = (dx >= 0 ? 1 : -1) * force * 20;
			displacement.y = (dy >= 0 ? 1 : -1) * force * 20;
		}
		// Add window influences like moving air
		windowInfluences.forEach(inf => {
			const dxw = dot.origX - inf.x;
			const dyw = dot.origY - inf.y;
			const manhattanW = Math.abs(dxw) + Math.abs(dyw);
			if (manhattanW < effectRadius && manhattanW > 0) {
				const speed = Math.sqrt(inf.velocity.vx**2 + inf.velocity.vy**2);
				const areaFactor = inf.area / 50000; // normalize area influence
				// If explosionImpulse is active, amplify the force temporarily.
				const impulse = window.explosionImpulse || 1;
				const forceW = ((effectRadius - manhattanW) / effectRadius) * speed * areaFactor * impulse;
				displacement.x += (dxw >= 0 ? 1 : -1) * forceW;
				displacement.y += (dyw >= 0 ? 1 : -1) * forceW;
			}
		});
		 // Apply a constant explosion impulse regardless of dot's distance.
		if (explosionFactor > 0) {
			displacement.x += Math.sign(dot.origX - expX) * explosionFactor;
			displacement.y += Math.sign(dot.origY - expY) * explosionFactor;
		}
		const targetX = dot.origX + displacement.x;
		const targetY = dot.origY + displacement.y;
		dot.x += (targetX - dot.x) * 0.1;
		dot.y += (targetY - dot.y) * 0.1;
		dot.radius = dot.baseRadius;
		if (dot.clickAnim > 0) {
			dot.radius += 5 * dot.clickAnim;
			dot.clickAnim -= 0.05;
			if (dot.clickAnim < 0) dot.clickAnim = 0;
		}
	});
	if (clickIntensity > 0) {
		clickIntensity *= 0.95;
		if (clickIntensity < 0.01) clickIntensity = 0;
	}
	// Clear window influences each frame.
	windowInfluences = [];
}

// Modify drawDots to apply global CSS transform on #viewport in addition to canvas context shake.
function drawDots() {
	// save current transform and apply shake/zoom if clicking
	ctx.save();
	if (clickIntensity > 0) {
		const shake = clickIntensity * 10;
		const dx = (Math.random() - 0.5) * shake;
		const dy = (Math.random() - 0.5) * shake;
		const scale = 1 + clickIntensity * 0.03;
		// Anchor zoom at the mouse with shake: translate to mouse position (with shake), scale, then translate back
		ctx.translate(mouse.x + dx, mouse.y + dy);
		ctx.scale(scale, scale);
		ctx.translate(-(mouse.x + dx), -(mouse.y + dy));
		// Also apply the same transform to the viewport container.
		let viewport = document.getElementById('viewport');
		viewport.style.transform = `translate(${dx}px,${dy}px) scale(${scale})`;
	} else {
		let viewport = document.getElementById('viewport');
		viewport.style.transform = '';
	}
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// Calculate CRT curvature parameters
	const centerX = canvas.width / 2, centerY = canvas.height / 2;
	const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
	const k = -0.065; // adjust strength of curvature
	
	dots.forEach(dot => {
		ctx.beginPath();
		// Apply CRT barrel distortion effect
		let dx = dot.x - centerX, dy = dot.y - centerY;
		let r = Math.sqrt(dx * dx + dy * dy) / maxRadius;
		let factor = 1 + k * (r * r);
		let distortedX = centerX + dx * factor;
		let distortedY = centerY + dy * factor;
		ctx.arc(distortedX, distortedY, dot.radius, 0, Math.PI * 2);
		const twinkle = 0.75 + 0.25 * Math.sin(performance.now() / 500 + dot.twinklePhase);
		ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
		ctx.fill();
	});
	ctx.restore();
}

function animate() {
	updateDots();
	drawDots();
	requestAnimationFrame(animate);
}
animate();