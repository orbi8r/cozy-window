document.addEventListener('DOMContentLoaded', () => {
	// Create version info element
	const versionDiv = document.createElement('div');
	versionDiv.id = 'version-info';
	versionDiv.textContent = 'v0.1.1';
	// Style for fixed bottom right display
	versionDiv.style.position = 'fixed';
	versionDiv.style.bottom = '10px';
	versionDiv.style.right = '10px';
	versionDiv.style.fontSize = '12px';
	versionDiv.style.fontFamily = 'monospace';
	versionDiv.style.color = '#fff';
	versionDiv.style.background = 'rgba(0, 0, 0, 0.5)';
	versionDiv.style.padding = '4px 8px';
	versionDiv.style.borderRadius = '4px';
	versionDiv.style.zIndex = '10000';
	document.body.appendChild(versionDiv);
});
