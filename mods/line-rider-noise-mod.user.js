// ==UserScript==

// @name         Noise Mod
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates a captured shape over an area with random transforms
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-noise-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-noise-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const SELECT_TOOL = "SELECT_TOOL";
const EMPTY_SET = new Set();

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
  meta: { name: name }
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class NoiseModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        boundWidth: 100,
        boundHeight: 100,
        iterations: 100,
        rotStep: 1,
        minScale: 1,
        maxScale: 1,
        minWidth: 1,
        maxWidth: 1
      };

      this.currentShape = [];
    }

    componentDidUpdate () {
      this.onRefresh();
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    onCapture () {
      this.currentShape.length = 0;
      const selectedLineIds = new Set([...getSelectToolState(store.getState()).selectedPoints].map(i => i >> 1));
      const shape = [...selectedLineIds].map(id => store.getState().simulator.engine.getLine(id));

      if (shape.length === 0) {
        return;
      }

      const shapeBound = [shape[0].x1, shape[0].y1, shape[0].x1, shape[0].y1];

      for (let i = 0; i < shape.length; i++) {
        shapeBound[0] = Math.min(shape[i].x1, shape[i].x2, shapeBound[0]);
        shapeBound[1] = Math.min(shape[i].y1, shape[i].y2, shapeBound[1]);
        shapeBound[2] = Math.max(shape[i].x1, shape[i].x2, shapeBound[2]);
        shapeBound[3] = Math.max(shape[i].y1, shape[i].y2, shapeBound[3]);
      }

      let midX = shapeBound[0] + (shapeBound[2] - shapeBound[0]) / 2;
      let midY = shapeBound[1] + (shapeBound[3] - shapeBound[1]) / 2;

      for (let i = 0; i < shape.length; i++) {
        this.currentShape.push([
          shape[i].x1 - midX,
          shape[i].y1 - midY,
          shape[i].x2 - midX,
          shape[i].y2 - midY
        ]);
      }
    }

    onRefresh () {
      store.dispatch(revertTrackChanges());

      if (this.currentShape.length === 0 || !this.state.active) {
        return;
      }

      const camera = store.getState().camera.editorPosition;

      let lines = [];

      for (let j = 0; j < this.state.iterations; j++) {
        const xPos = Math.random() * this.state.boundWidth + camera.x - this.state.boundWidth / 2;
        const yPos = Math.random() * this.state.boundHeight + camera.y - this.state.boundHeight / 2;
        const rot = 2 * Math.PI * Math.round(Math.random() * this.state.rotStep) / this.state.rotStep;
        const scale = Math.random() * (this.state.maxScale - this.state.minScale) + this.state.minScale;
        const width = Math.random() * (this.state.maxWidth - this.state.minWidth) + this.state.minWidth;

        for (let i = 0; i < this.currentShape.length; i++) {
          lines.push({
            x1: (Math.cos(rot) * this.currentShape[i][0] - Math.sin(rot) * this.currentShape[i][1]) * scale + xPos,
            y1: (Math.sin(rot) * this.currentShape[i][0] + Math.cos(rot) * this.currentShape[i][1]) * scale + yPos,
            x2: (Math.cos(rot) * this.currentShape[i][2] - Math.sin(rot) * this.currentShape[i][3]) * scale + xPos,
            y2: (Math.sin(rot) * this.currentShape[i][2] + Math.cos(rot) * this.currentShape[i][3]) * scale + yPos,
            type: 2,
            width
          })
        }
      }

      store.dispatch(addLines(lines));
    }

    onCommit () {
      store.dispatch(commitTrackChanges());
      store.dispatch(revertTrackChanges());
      this.setState({ active: false });
    }

    renderCheckbox (key, title = null) {
      if (!title) title = key

      const props = {
        id: key,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      }
      return e('div', null,
        e('label', { style: { width: '4em' }, for: key }, title),
        e('input', { style: { marginLeft: '.5em' }, type: 'checkbox', ...props })
      )
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloat(e.target.value) })
      }

      return e(
        'div', null,
        title,
        e('input', { style: { width: '3em' }, type: 'number', ...props }),
        e('input', { type: 'range', ...props, onFocus: e => e.target.blur() })
      )
    }

    render () {
      return e("div", null,
        this.state.active && e("div", null,
          this.renderSlider('boundWidth', 'Boundary Width', { min: 0, max: 10000, step: 1 }),
          this.renderSlider('boundHeight', 'Boundary Height', { min: 0, max: 10000, step: 1 }),
          this.renderSlider('iterations', 'Count', { min: 1, max: 10000, step: 1 }),
          this.renderSlider('rotStep', 'Rotation Variation', { min: 1, max: 360, step: 1 }),
          this.renderSlider('maxScale', 'Max Scale', { min: 0.01, max: 10, step: 0.01 }),
          this.renderSlider('minScale', 'Min Scale', { min: 0.01, max: 10, step: 0.01 }),
          this.renderSlider('maxWidth', 'Max Width', { min: 0.01, max: 10, step: 0.01 }),
          this.renderSlider('minWidth', 'Min Width', { min: 0.01, max: 10, step: 0.01 }),
          e("button", {
            onClick: () => this.onCapture() },
            "Capture Selected Shape"
          ),
          e("button", {
            onClick: () => this.onRefresh() },
            "Refresh Visual"
          ),
          e("button", {
            style: { float: "left" },
            onClick: () => this.onCommit() },
            "Commit"
          )
        ),
        e("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Noise Mod"
        )
      );
    }
  }

  window.registerCustomSetting(NoiseModComponent);
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
