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
      // Remove inline style and apply CSS class for control panel.
      controlDiv.classList.add('color-picker-control');
      controlDiv.innerHTML = `
        <label>Pick a Color:</label>
        <input type="color" id="custom-color" value="#0000ff"/>
        <br/><br/>
        <button id="spawn-new">Spawn New Window</button>
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
