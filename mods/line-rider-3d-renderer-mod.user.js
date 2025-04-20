// ==UserScript==

// @name         3D Renderer
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Supports rendering of 3D object files
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-3d-renderer-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-3d-renderer-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
  meta: { name }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

class _3DMod {
  constructor (store, initState) {
    this.store = store;
    this.state = initState;

    this.changed = false;

    this.track = this.store.getState().simulator.committedEngine;
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

  onUpdate (nextState = this.state, shouldUpdate = false) {
    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active) {
        let lines = createStl(this.state);

        if (lines.length > 0) {
          this.store.dispatch(addLines(lines));
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

  const e = React.createElement;

  class _3DModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        yaw: 0,
        pitch: 0,
        roll: 0,
        scale: 1,
        file: null,
        fileName: "",
        enableFill: false,
      };

      this.mod = new _3DMod(store, this.state);
    }

    componentWillUpdate (_, nextState) {
      this.mod.onUpdate(nextState);
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloat(e.target.value) })
      };

      return e("div", null,
        title,
        e("input", { style: { width: "3em" }, type: "number", ...props }),
        e("input", { type: "range", ...props, onFocus: e => e.target.blur() })
      );
    }

    renderCheckbox (key, title = null) {
      if (!title) title = key;

      const props = {
        id: key,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      };
      return e("div", null,
        e("label", { style: { width: "4em" }, for: key }, title),
        e("input", { style: { marginLeft: ".5em" }, type: "checkbox", ...props })
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
      const committed = this.mod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    onStlFileChange () {
      return new Promise((resolve) => {
        const file = event.target.files[0];
        const fileReader = new FileReader();
        fileReader.fileName = event.target.files[0].name;
        fileReader.onloadend = (e) => {
          resolve([fileReader.fileName, fileReader.result]);
        };
        fileReader.readAsArrayBuffer(file);
      });
    }

    render () {
      const epsilon = 1/32;
      return e("div", null,
        this.state.active && e(
          "div", null,
          "Only supports .stl",
          e("input", {
            type: "file",
            onChange: e => this.onStlFileChange().then(result => {
              let [fileName, file] = result;
              this.setState({ file, fileName });
              console.log(`Loaded ${fileName} successfully`);
            }).catch(err => {
              console.log("Error when parsing: Invalid file");
              console.log(err.message);
            })
          }),
          `Currently loaded: ${this.state.fileName}`,
          this.renderSlider("yaw", "Yaw", {min: 0, max: 360, step: 1}),
          this.renderSlider("pitch", "Pitch", {min: 0, max: 360, step: 1}),
          this.renderSlider("roll", "Roll", {min: 0, max: 360, step: 1}),
          this.renderSlider("scale", "Scale Power", {min: 0, max: 3, step: 1}),
          this.renderCheckbox("enableFill", "Enable Fill"),
          e("button", { style: { float: "left" }, onClick: () => this.onCommit() },
            "Commit"
          ),
        ),
        e("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "3D Mod"
        )
      );
    }
  }

  window.registerCustomSetting(_3DModComponent);
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

function createStl (state) {
  if (!state.file) return [];

  const camPos = window.store.getState().camera.editorPosition;

  let lineArray = [];

  const trig = [
    Math.cos(state.yaw * Math.PI / 180),
    Math.sin(state.yaw * Math.PI / 180),
    Math.cos(state.pitch * Math.PI / 180),
    Math.sin(state.pitch * Math.PI / 180),
    Math.cos(state.roll * Math.PI / 180),
    Math.sin(state.roll * Math.PI / 180)
  ];
  const rotMatrix = [
    trig[2] * trig[4],
    trig[1] * trig[3] * trig[4] - trig[0] * trig[5],
    trig[0] * trig[3] * trig[4] + trig[1] * trig[5],
    trig[2] * trig[5],
    trig[1] * trig[3] * trig[5] + trig[0] * trig[4],
    trig[0] * trig[3] * trig[5] - trig[1] * trig[4],
  ];

  const transformedPoint = (x, y, z) => {
    return {
      x: camPos.x + Math.pow(10, state.scale) * (x * rotMatrix[0] + y * rotMatrix[1] + z * rotMatrix[2]),
      y: camPos.y + Math.pow(10, state.scale) * (x * rotMatrix[3] + y * rotMatrix[4] + z * rotMatrix[5]),
    };
  };

  const dv = new DataView(state.file.slice(80));
  const numTriangles = dv.getUint32(0, true);

  for (let i = 0; i < numTriangles; i++) {
    const triangleOffset = 50 * i;
    const triangle = [
      transformedPoint(dv.getFloat32(triangleOffset + 4 * 4, true), dv.getFloat32(triangleOffset + 5 * 4, true), dv.getFloat32(triangleOffset + 6 * 4, true)),
      transformedPoint(dv.getFloat32(triangleOffset + 7 * 4, true), dv.getFloat32(triangleOffset + 8 * 4, true), dv.getFloat32(triangleOffset + 9 * 4, true)),
      transformedPoint(dv.getFloat32(triangleOffset + 10 * 4, true), dv.getFloat32(triangleOffset + 11 * 4, true), dv.getFloat32(triangleOffset + 12 * 4, true))
    ];

    for (let j = 0; j < 3; j++) {
      lineArray.push({ x1: triangle[j].x, y1: triangle[j].y, x2: triangle[(j + 1) % 3].x, y2: triangle[(j + 1) % 3].y, type: 2 });
    }

    if (!state.enableFill) continue;

    let a = Math.sqrt(Math.pow(triangle[0].x - triangle[1].x, 2) + Math.pow(triangle[0].y - triangle[1].y, 2));
    let b = Math.sqrt(Math.pow(triangle[1].x - triangle[2].x, 2) + Math.pow(triangle[1].y - triangle[2].y, 2));
    let c = Math.sqrt(Math.pow(triangle[2].x - triangle[0].x, 2) + Math.pow(triangle[2].y - triangle[0].y, 2));
    let h = Math.sqrt((a + b + c) * (-a + b + c) * (a - b + c) * (a + b - c)) * 0.5 / c;
    for (let i = 1 / h; i < 1; i += 1 / h) {
      let x1 = i * (triangle[0].x - triangle[1].x) + triangle[1].x;
      let y1 = i * (triangle[0].y - triangle[1].y) + triangle[1].y;
      let x2 = i * (triangle[2].x - triangle[1].x) + triangle[1].x;
      let y2 = i * (triangle[2].y - triangle[1].y) + triangle[1].y;
      lineArray.push({ x1, y1, x2, y2, type: 2 });
    }
  }

  return lineArray;
}

