// ==UserScript==

// @name         Image Generator
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Generates colored line arrays from image data
// @version      1.7.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-image-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-image-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd) => ({ type: "UPDATE_LINES", payload: { linesToRemove, linesToAdd }});
const addLines = (line) => updateLines(null, line, "ADD_LINES");
const addLayer = (name) => ({ type: "ADD_LAYER", payload: { name } });
const moveLayer = (id, index) => ({ type: "MOVE_LAYER", payload: {id, index} });
const addFolder = (name) => ({ type: "ADD_FOLDER", payload: {name} });
const commitTrackChanges = () => ({ type: "COMMIT_TRACK_CHANGES" });
const revertTrackChanges = () => ({ type: "REVERT_TRACK_CHANGES" });

const getLayers = (state) => state.simulator.engine.engine.state.layers;

class ImageMod {
  constructor (store) {
    this.store = store;

    this.changed = false;
    this.drawTask = false;

    this.animEvent = 0;
  }

  commit () {
    if (this.changed && !this.drawTask) {
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
      return true;
    }
  }

  cancelDraw () {
    if (this.animEvent) {
      cancelAnimationFrame(this.animEvent);
    }

    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
    }

    this.drawTask = false;
  }

  async draw (state) {
    this.drawTask = true;

    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
    }

    this.changed = true;

    const layers = getLayers(this.store.getState());
    const folderId = Math.max(...layers.map(layer => layer.id)) + 1;
    const actionArray = [addFolder("New Image")];
    const targetIndex = layers.size();

    let nextId = folderId + 1;

    for (const { type, color, x1, y1, x2, y2, layer } of genLines(state)) {
      if (type == "layer") {
        actionArray.push(addLayer(color));
        actionArray.push(moveLayer(nextId++, targetIndex));
      } else {
        actionArray.push(addLines([{ layer: layer + folderId + 1, x1, y1, x2, y2, type: 2 }]));
      }
    }

    if (actionArray.length === 0) {
      return;
    }

    if (this.animEvent) {
      cancelAnimationFrame(this.animEvent);
    }

    let currentAction = 0;
    let start;

    const dispatchAction = (t, ts) => {
      if (start === undefined) {
        start = ts;
      }

      const actionCount = Math.floor((ts - start) / 100);

      for (let i = 0; i < actionCount && currentAction < actionArray.length; i++) {
        t.store.dispatch(actionArray[currentAction++]);
      }

      if (currentAction < actionArray.length) {
        t.animEvent = requestAnimationFrame((ts) => dispatchAction(t, ts));
      } else {
        t.drawTask = false;
        t.animEvent = 0;
      }
    };

    this.animEvent = requestAnimationFrame((ts) => dispatchAction(this, ts));
  }
}

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class ImageModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        imageData: null,
        clamping: 1,
        message: ""
      };

      this.imageMod = new ImageMod(store);
    }

    onFileChange () {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        if (file == null) return;

        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = () => {
          const dataURL = fileReader.result;
          const image = document.getElementById("output");
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
          const v = parseFloat(create.target.value);
          props.min <= v && v <= props.max && this.setState({ [key]: v });
        }
      };

      return e(
        "div", null,
        title,
        e("input", { type: "range", ...props, onFocus: create => create.target.blur() })
      );
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
        this.imageMod.cancelDraw();
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
      return e(
        "div", null,
        this.state.active && e(
          "div", null,
          e(
            "div", null,
            "Image: ",
            e(
              "input",
              {
                type: "file",
                onChange: () => this.onFileChange().then(result => {
                  this.setState({ imageData: result });
                  this.setState({ message: "Image Loaded" });
                }).catch(err => {
                  this.setState({ message: "Invalid Image File" });
                  console.error(err.message);
                })
              }),
            e("br"),
            "Color Resolution",
            e(
              "div",
              { style: { display: "flex", flexDirection: "row" } },
              "High",
              this.renderSlider("clamping", "", { min: 0, max: 3, step: 1 }),
              "Low"
            ),
            e("img", { id: "output", style: { display: "none" } })
          ),
          e(
            "div", null,
            this.state.message
          ),
          e(
            "button",
            { style: { float: "left" }, onClick: () => this.onCommit() },
            "Commit"
          ),
          this.state.imageData && e(
            "button",
            { style: { float: "left" }, onClick: () => this.imageMod.draw(this.state) },
            "Render"
          )
        ),
        e(
          "button",
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

function * genLines ({ imageData = null, clamping = 1 } = {}) {
  if (imageData == null) return;

  const camPos = window.store.getState().camera.editorPosition;
  const colorArray = [];
  let lastColor = null;
  let currentLine = null;

  for (let yOff = 0; yOff < imageData.height; yOff++) {
    for (let xOff = 0; xOff < imageData.width; xOff++) {
      const color = [0, 0, 0, 255];

      for (let i = 0; i < 4; i++) {
        color[i] = imageData.data[i + xOff * 4 + yOff * imageData.width * 4];
      }

      const currentColor = rgbToHex(color, clamping);
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
          y2: yOff * 2 + 0.01 + camPos.y,
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
  const p = color[3] / 256;
  let rHex = Math.floor(255 - p * (255 - (color[0] & (-16 << clamp)))).toString(16);
  let gHex = Math.floor(255 - p * (255 - (color[1] & (-16 << clamp)))).toString(16);
  let bHex = Math.floor(255 - p * (255 - (color[2] & (-16 << clamp)))).toString(16);

  rHex = rHex.length == 1 ? "0" + rHex : rHex;
  gHex = gHex.length == 1 ? "0" + gHex : gHex;
  bHex = bHex.length == 1 ? "0" + bHex : bHex;

  return "#" + rHex + gHex + bHex;
}
