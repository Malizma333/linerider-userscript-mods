// ==UserScript==

// @name         Image Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates colored line arrays from image data
// @version      1.4.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-image-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-image-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==


const updateLines = (linesToRemove, linesToAdd) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const addLayer = () => ({ type: "ADD_LAYER" });

const renameLayer = (id, name) => ({
  type: "RENAME_LAYER",
  payload: { id, name }
});

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getSimulatorLayers = state => state.simulator.engine.engine.state.layers.buffer;

class ImageMod {
  constructor (store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;

    this.track = this.store.getState().simulator.committedEngine;
    this.layers = this.store.getState().simulator.engine.engine.state.layers.buffer;
    this.camPos = this.store.getState().camera.editorPosition;

    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  commit () {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
      return true;
    }
  }

  onUpdate (nextState = this.state) {
    let shouldUpdate = false;

    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    const track = getSimulatorCommittedTrack(this.store.getState());

    if (this.track !== track) {
      this.track = track;
      shouldUpdate = true;
    }

    const layers = getSimulatorLayers(this.store.getState());

    if (layers && this.layers !== layers) {
      this.layers = layers;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let lineArr = [];
        let layerArr = [];
        let bufferLen = this.layers.length;

        for (let { type, color, x1, y1, x2, y2, layer } of genLines(this.state)) {
          if (type == "layer") {
            layerArr.push({
              name: color,
              editable: true,
              visible: true
            });
          } else {
            lineArr.push({
              layer: layer + bufferLen,
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2,
              type: 2
            });
          }
        }

        if (layerArr.length > 0) {
          for (let i = 0; i < layerArr.length; i++) {
            this.store.dispatch(addLayer());
            this.store.dispatch(renameLayer(bufferLen, layerArr[i].name));
            bufferLen++;
          }
          this.changed = true;
        }

        if (lineArr.length > 0) {
          this.store.dispatch(addLines(lineArr));
          this.changed = true;
        }
      }
    }
  }
}

function main () {
  const {
    React,
    store
  } = window;

  const create = React.createElement;

  class ImageModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        imageData: null,
        clamping: 1
      };

      this.message = "";

      this.imageMod = new ImageMod(store, this.state);
    }

    componentWillUpdate (nextProps, nextState) {
      this.imageMod.onUpdate(nextState);
    }

    onFileChange () {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        if (file == null) return;

        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = () => {
          let dataURL = fileReader.result;
          let image = document.getElementById("output");
          image.onload = function () {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            resolve(ctx.getImageData(0, 0, image.width, image.height));
          };
          image.src = dataURL;
        };
        fileReader.readAsDataURL(file);
      });
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => {
          let v = parseFloat(create.target.value);
          props.min <= v && v <= props.max && this.setState({ [key]: v });
        }
      };

      return create("div", null,
        title,
        create("input", { style: { width: "3em" }, type: "number", ...props }),
        create("input", { type: "range", ...props, onFocus: create => create.target.blur() })
      );
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    onCommit () {
      const committed = this.imageMod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    render () {
      return create("div", null,
        this.state.active && create("div", null,
          create("div", null,
            "Image: ",
            create("input", { type: "file",
              onChange: () => this.onFileChange().then(result => {
                this.setState({ imageData : result });
                this.message = "Image Loaded";
              }).catch(err => {
                this.message = "Invalid Image File";
                console.log(err);
              })
            }),
            this.renderSlider("clamping", "Color Clamp", { min: 1, max: 3, step: 1 }),
            create("img", { id: "output", style: { display: "none" } })
          ),
          create("div", null, this.message),
          create("button", { style: { float: "left" }, onClick: () => this.onCommit() },
            "Commit"
          )
        ),
        create("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Image Mod"
        )
      );
    }
  }

  window.registerCustomSetting(ImageModComponent);
}

if (window.registerCustomSetting) {
  main();
} else {
  const prevCb = window.onCustomToolsApiReady;
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb();
    main();
  };
}

function* genLines ({ imageData = null, clamping = 1 } = {}) {
  if (imageData == null) return;

  const camPos = window.store.getState().camera.editorPosition;

  let colorArray = [];
  let lastColor = null;
  let currentLine = null;

  for (let yOff = 0; yOff < imageData.height; yOff++) {
    for (let xOff = 0; xOff < imageData.width; xOff++) {
      let color = [ 0, 0, 0, 255 ];

      for (let i = 0; i < 4; i++) {
        color[i] = imageData.data[i + xOff * 4 + yOff * imageData.width * 4];
      }

      let currentColor = rgbToHex(color, clamping);
      let index = colorArray.indexOf(currentColor);

      if (index === -1) {
        colorArray.push(currentColor);
        index = colorArray.length - 1;
        yield {
          type: "layer",
          color: currentColor,
          x1: null,
          y1: null,
          x2: null,
          y2: null,
          layer: null
        };
      }

      if (lastColor != currentColor || xOff == 0) {
        if (currentLine) {
          yield currentLine;
        }
        currentLine = {
          type: "line",
          color: null,
          x1: (xOff - 1) * 2 + camPos.x,
          y1: yOff * 2 + camPos.y,
          x2: xOff * 2 + camPos.x,
          y2: yOff * 2 + camPos.y + 0.01,
          layer: index
        };
      } else {
        currentLine.x2 = xOff * 2 + camPos.x;
      }

      lastColor = currentColor;
    }
  }

  yield currentLine;
}

function rgbToHex (color, clamp) {
  let p = color[3]/256;
  let rHex = Math.floor(255 - p * (255 - (color[0] & (-16 << clamp)))).toString(16);
  let gHex = Math.floor(255 - p * (255 - (color[1] & (-16 << clamp)))).toString(16);
  let bHex = Math.floor(255 - p * (255 - (color[2] & (-16 << clamp)))).toString(16);

  rHex = rHex.length == 1 ? "0" + rHex : rHex;
  gHex = gHex.length == 1 ? "0" + gHex : gHex;
  bHex = bHex.length == 1 ? "0" + bHex : bHex;

  return "#" + rHex + gHex + bHex;
}
