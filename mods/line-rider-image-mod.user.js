// ==UserScript==

// @name         Line Rider Image Mod
// @author       Malizma
// @description  Adds the ability to import images
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-image-mod.user.js
// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')
const addLayer = () => ({ type: 'ADD_LAYER' })

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

const getSimulatorCommittedTrack = state => state.simulator.committedEngine
const getSimulatorLayers = track => track.engine.state.layers.buffer

class ImageMod {
  constructor (store, initState, modComponent) {
    this.store = store
    this.state = initState
    this.modComponent = modComponent

    this.changed = false

    this.track = this.store.getState().simulator.committedEngine
    this.camPos = this.store.getState().camera.editorPosition

    store.subscribeImmediate(() => {
      this.onUpdate()
    })
  }

  commit() {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges())
      this.store.dispatch(revertTrackChanges())
      this.changed = false
      return true
    }
  }

  onUpdate (nextState = this.state) {
      let shouldUpdate = false

      if (this.state !== nextState) {
          this.state = nextState
          shouldUpdate = true
      }

      const track = getSimulatorCommittedTrack(this.store.getState())

      if (this.track !== track) {
          this.track = track
          shouldUpdate = true
      }

      if (shouldUpdate) {

          if (this.changed) {
              this.store.dispatch(revertTrackChanges())
              this.changed = false
          }

          if(this.state.active) {
              let myLines = [];
              let layerArr = getSimulatorLayers(getSimulatorCommittedTrack(this.store.getState()));

              for(let {id, color} of genLayers(this.state, layerArr)) {
                  this.store.dispatch(addLayer());
                  layerArr[layerArr.length - 1] = {
                      id: layerArr.length - 1,
                      name: color,
                      editable: true,
                      visible: true
                  }
              }

              for (let { p1, p2, layer } of genLines(this.state, layerArr)) {
                  myLines.push({
                      layer: layer,
                      x1: p1.x,
                      y1: p1.y,
                      x2: p2.x,
                      y2: p2.y,
                      type: 2
                  })
              }

              if (myLines.length > 0) {
                  this.store.dispatch(addLines(myLines))
                  this.changed = true
              }
          }
      }
  }
}

function main () {
  const {
    React,
    store
  } = window

  const create = React.createElement

  class ImageModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        imageData: null
      }

      this.imageMod = new ImageMod(store, this.state, this)
    }

    componentWillUpdate (nextProps, nextState) {
      this.imageMod.onUpdate(nextState)
    }

    onFileChange() {
       return new Promise((resolve) => {
           const file = event.target.files[0];
           const fileReader = new FileReader();
           if(file == null) return;

           fileReader.fileName = event.target.files[0].name;
           fileReader.onloadend = (e) => {
               let dataURL = fileReader.result;
               let image = document.getElementById('output');
               image.onload = function() {

                   if(image.width * image.height > 65536) {
                       resolve(null);
                   }

                   const canvas = document.createElement('canvas');
                   const ctx = canvas.getContext('2d');
                   ctx.drawImage(image, 0, 0);
                   resolve(ctx.getImageData(0, 0, image.width, image.height));
               }
               image.src = dataURL;
           }
           fileReader.readAsDataURL(file);
       });
    }

      onActivate () {
          if (this.state.active) {
              this.setState({ active: false })
          } else {
              this.setState({ active: true })
          }
      }

    onCommit () {
      const committed = this.imageMod.commit();
       if (committed) {
        this.setState({ active: false })
      }
    }

    render () {
      return create('div', null,
        this.state.active && create('div', null,
          create('div', null,
                  'Image: ',
                  create('input', {type: 'file',
                  onChange: create => this.onFileChange().then(result => {
                      this.setState({ imageData : result });
                      console.log("Loaded image successfully");
                  }).catch(err => {console.log("Error when parsing: Invalid image file"); console.log(err);})
              }),
              create('img', { id: 'output', style: { display: 'none' } })
          ),
          create('button', { style: { float: 'left' }, onClick: () => this.onCommit() },
            'Commit'
          )
        ),
        create('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'Image Mod'
        )
      )
    }
  }

  window.registerCustomSetting(ImageModComponent)
}

if (window.registerCustomSetting) {
  main()
} else {
  const prevCb = window.onCustomToolsApiReady
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb()
    main()
  }
}

function* genLines ({ imageData = null } = {}, layerArr) {
    if(imageData == null) return;

    const { V2 } = window
    const camPos = window.store.getState().camera.editorPosition;
    let pos = V2.from(camPos.x, camPos.y);

    for(let yOff = 0; yOff < imageData.height; yOff++) {
        for(let xOff = 0; xOff < imageData.width; xOff++) {
            let colorArray = [0,0,0];

            for(let i = 0; i < 3; i++) {
                colorArray[i] = imageData.data[i + xOff * 4 + yOff * imageData.width * 4];
            }

            let currentColor = rgbToHex(colorArray);
            let index = hasColor(layerArr, currentColor);

            if(index === -1) {
                continue;
            }

            yield {
                p1: V2.from(xOff + pos.x + 0.01, yOff + pos.y),
                p2: V2.from(xOff + pos.x, yOff + pos.y + 0.01),
                layer: index
            }
        }
    }
}

function* genLayers({ imageData = null } = {}, layerArr) {
    if(imageData == null) return;

    for(let yOff = 0; yOff < imageData.height; yOff++) {
        for(let xOff = 0; xOff < imageData.width; xOff++) {
            let colorArray = [0,0,0];

            for(let i = 0; i < 3; i++) {
                colorArray[i] = imageData.data[i + xOff * 4 + yOff * imageData.width * 4];
            }

            let currentColor = rgbToHex(colorArray);
            let index = hasColor(layerArr, currentColor);

            if(index === -1) {
                yield {
                    color: currentColor
                }
            }
        }
    }
}

function hasColor(layerArr, color) {
    for(let layer of layerArr) {
        if(layer.name == color) {
            return layer.id;
        }
    }

    return -1;
}

function rgbToHex(color) {
    let rHex = (8 * Math.floor(color[0] / 8)).toString(16);
    let gHex = (8 * Math.floor(color[1] / 8)).toString(16);
    let bHex = (8 * Math.floor(color[2] / 8)).toString(16);

    rHex = rHex.length == 1 ? "0" + rHex : rHex;
    gHex = gHex.length == 1 ? "0" + gHex : gHex;
    bHex = bHex.length == 1 ? "0" + bHex : bHex;

    return "#" + rHex + gHex + bHex;
}
