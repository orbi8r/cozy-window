(function(){
  const container = document.getElementById('windows-container');
  const canvas = document.getElementById('canvas');
  
  class ColorPickerWindow extends BaseWindow {
    constructor(config) {
      super(config, container, canvas);
      this.addControls();
    }
    addControls() {
      const controlDiv = document.createElement('div');
      controlDiv.style.position = 'absolute';
      controlDiv.style.top = '35px';
      controlDiv.style.left = '35px';
      controlDiv.style.zIndex = '5';
      controlDiv.style.background = '#fff';
      controlDiv.style.padding = '15px';
      controlDiv.style.borderRadius = '10px';
      controlDiv.style.fontFamily = 'Arial, sans-serif';
      controlDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      controlDiv.innerHTML = `
        <label style="font-weight:bold; margin-right:8px;">Pick a Color:</label>
        <input type="color" id="custom-color" value="#0000ff" style="vertical-align:middle; border:none; outline:none;"/>
        <br/><br/>
        <button id="spawn-new" style="padding:8px 12px; border:none; background:#4CAF50; color:#fff; border-radius:5px; cursor:pointer;">Spawn New Window</button>
      `;
      this.element.appendChild(controlDiv);
      controlDiv.addEventListener('mousedown', e => e.stopPropagation());
      controlDiv.querySelector('#spawn-new').addEventListener('click', () => {
        const input = controlDiv.querySelector('#custom-color');
        spawnWindow({ color: hexToRGB(input.value), width:300, height:300, minWidth:150, minHeight:150 });
      });
    }
  }
  
  function hexToRGB(hex) {
    let r = parseInt(hex.slice(1,3), 16);
    let g = parseInt(hex.slice(3,5), 16);
    let b = parseInt(hex.slice(5,7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  new ColorPickerWindow({ id: 'color-picker-window', color: 'rgb(255,255,255)', width:350, height:350, minWidth:250, minHeight:250, left:500, top:300, deletable: false });
})();
