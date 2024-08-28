// ==UserScript==

// @name         Geometrize Converter
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Converts geometrize line maps into line rider lines
// @version      1.1.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-geometrize-converter.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-geometrize-converter.user.js
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
const getSimulatorLayers = track => track.engine.state.layers.buffer;

class GeoConvertMod {
  constructor (store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;

    this.track = this.store.getState().simulator.committedEngine;

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

    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true;
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false;
    }

    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    if (this.state.active) {
      const track = getSimulatorCommittedTrack(this.store.getState());

      if (this.track !== track) {
        this.track = track;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {

      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let lineArr = [];
        let layerArr = [];
        let layerBuffer = getSimulatorLayers(this.track);

        if (!layerBuffer) return;

        let bufferLen = layerBuffer.length;

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

  class GeoConvertModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        fileData: null,
        clamping: 4
      };

      this.message = "";

      this.geoConvert = new GeoConvertMod(store, this.state);
    }

    componentWillUpdate (nextProps, nextState) {
      this.geoConvert.onUpdate(nextState);
    }

    onFileChange () {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        if (file == null) return;

        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = () => {
          resolve(JSON.parse(fileReader.result));
        };
        fileReader.readAsText(file);
      });
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: create => this.setState({ [key]: parseFloat(create.target.value) })
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
      const committed = this.geoConvert.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    render () {
      return create("div", null,
        this.state.active && create("div", null,
          create("div", null,
            "JSON: ",
            create("input", { type: "file",
              onChange: () => this.onFileChange().then(result => {
                this.setState({ fileData : result });
                this.message = "JSON Loaded";
              }).catch(err => {
                this.message = "Invalid JSON File";
                console.log(err);
              })
            })
          ),
          this.renderSlider("clamping", "Color Clamp", { min: 1, max: 4, step: 1 }),
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
          "Geo-Convert Mod"
        )
      );
    }
  }

  window.registerCustomSetting(GeoConvertModComponent);
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

function* genLines ({ fileData = null, clamping = 4 } = {}) {
  if (!fileData || !fileData.shapes || !fileData.shapes[0].data) return;

  const camPos = window.store.getState().camera.editorPosition;

  let colorArray = [];

  for (let i = 0; i < fileData.shapes.length; i++) {
    let currentColor = rgbToHex(fileData.shapes[i].color, clamping);
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

    let coords = fileData.shapes[i].data;

    yield {
      type: "line",
      color: null,
      x1: coords[0] + camPos.x,
      y1: coords[1] + camPos.y,
      x2: coords[2] + camPos.x,
      y2: coords[3] + camPos.y,
      layer: index
    };
  }
}

function rgbToHex (color, clamp) {
  let powerClamp = Math.pow(2, clamp+3);
  let rHex = (powerClamp * Math.floor(color[0] / powerClamp)).toString(16);
  let gHex = (powerClamp * Math.floor(color[1] / powerClamp)).toString(16);
  let bHex = (powerClamp * Math.floor(color[2] / powerClamp)).toString(16);

  rHex = rHex.length == 1 ? "0" + rHex : rHex;
  gHex = gHex.length == 1 ? "0" + gHex : gHex;
  bHex = bHex.length == 1 ? "0" + bHex : bHex;

  return "#" + rHex + gHex + bHex;
}
