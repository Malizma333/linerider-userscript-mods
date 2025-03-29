// ==UserScript==

// @name         Selection Metadata Mod
// @namespace    https://www.linerider.com/
// @author       Ethan Li & Malizma
// @description  Adds ability to edit selected line metadata
// @version      0.1.2
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-selection-metadata.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-selection-metadata.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

/* constants */
const SELECT_TOOL = "SELECT_TOOL";
const EMPTY_SET = new Set();
const LINE_WIDTH = 2;

/* actions */
const setTool = (tool) => ({
  type: "SET_TOOL",
  payload: tool
});

const updateLines = (linesToRemove, linesToAdd) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd }
});

const setLines = (line) => updateLines(null, line);

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const setEditScene = (scene) => ({
  type: "SET_RENDERER_SCENE",
  payload: { key: "edit", scene }
});

/* selectors */
const getActiveTool = state => state.selectedTool;
const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getEditorZoom = state => state.camera.editorZoom;

class MetadataMod {
  constructor (store, initState, resetUI) {
    this.store = store;

    this.changed = false;
    this.state = initState;
    this.resetUI = resetUI;

    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.selectedPoints = EMPTY_SET;

    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  commit () {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.store.dispatch(setEditScene(new Millions.Scene()));
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

    if (this.state.active) {
      const track = getSimulatorCommittedTrack(this.store.getState());
      if (this.track !== track) {
        this.track = track;
        shouldUpdate = true;
      }

      const selectToolState = getSelectToolState(this.store.getState());

      let selectedPoints = selectToolState.selectedPoints;

      if (selectToolState.size == 0) {
        selectedPoints = EMPTY_SET;
      }

      if (!setsEqual(this.selectedPoints, selectedPoints)) {
        /*if (this.selectedPoints.size == 0) {
          this.loadOriginals()
          this.reloadState()
          this.resetUI()
        }*/
        this.selectedPoints = selectedPoints;
        shouldUpdate = true;
      }
    }

    if (!shouldUpdate) {
      return;
    }

    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.store.dispatch(setEditScene(new Millions.Scene()));
      this.changed = false;
    }

    if (!this.active()) {
      return;
    }

    /*if (!this.state.originalsLoaded) {
      this.loadOriginals()
      this.reloadState()
      this.resetUI()
    }*/
    const lines = [...getLinesFromPoints(this.selectedPoints)]
      .map(id => this.track.getLine(id))
      .filter(l => l);
    const editedLines = [];
    const multiplierSign = this.state.negativeMultiplier ? -1 : 1;
    for (let line of lines) {
      editedLines.push({
        ...line.toJSON(),
        flipped: this.state.flipped,
        multiplier: multiplierSign * (
          parseFloat(this.state.multiplierSmall) + parseFloat(this.state.multiplierLarge)
        ),
        width: this.state.sceneryWidth
      });
    }
    this.store.dispatch(setLines(editedLines));

    this.changed = true;
  }

  active() {
    return this.state.active && this.selectedPoints.size > 0;
  }

  resetOriginals () {
    this.state.originalsLoaded = false;
    this.state.originalFlipped = false;
    this.state.originalMultiplier = 1.0;
    this.state.originalWidth = 1.0;
  }

  loadOriginals () {
    const lines = [...getLinesFromPoints(this.selectedPoints)]
      .map(id => this.track.getLine(id))
      .filter(l => l);
    if (lines.length === 0) {
      return;
    }

    this.state.originalsLoaded = true;
    const line = lines[0];
    this.state.originalFlipped = line.flipped;
    this.state.originalMultiplier = line.multiplier;
    if (this.state.originalMultiplier === undefined || this.state.originalMultiplier === null) {
      this.state.originalMultiplier = 1.0;
    }
    this.state.originalMultiplier = parseFloat(this.state.originalMultiplier);
    this.state.originalWidth = line.width;
    if (this.state.originalWidth === undefined) {
      this.state.originalWidth = 1.0;
    }
  }

  reloadState() {
    this.state.flipped = this.state.originalFlipped;
    const multipliers = splitMultiplier(this.state.originalMultiplier);
    this.state.negativeMultiplier = multipliers.negative;
    this.state.multiplierSmall = multipliers.small;
    this.state.multiplierLarge = multipliers.large;
    this.state.sceneryWidth = this.state.originalWidth;
  }
}

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class MetadataModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.defaults = {
        flipped: false,
        negativeMultiplier: false,
        multiplierSmall: 1.0,
        multiplierLarge: 0,
        sceneryWidth: 1,
        originalsLoaded: false,
        originalFlipped: false,
        originalMultiplier: 1,
        originalWidth: 1,
      };
      this.state = {
        ...this.defaults,
        active: false,
      };

      this.metadataMod = new MetadataMod(store, this.state, this.reloadFromOriginals.bind(this));

      store.subscribe(() => {
        if (!this._mounted) return;

        const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL;

        if (this.state.active && !selectToolActive) {
          this.setState({ active: false });
        }
      });
    }

    componentDidMount() {
      this._mounted = true;
    }

    componentWillUnmount() {
      this._mounted = false;
    }

    componentWillUpdate (nextProps, nextState) {
      this.metadataMod.onUpdate(nextState);
    }

    onResetAll () {
      this.metadataMod.loadOriginals();
      this.reloadFromOriginals();
    }

    reloadFromOriginals () {
      const multipliers = splitMultiplier(this.state.originalMultiplier);
      this.setState({
        flipped: this.state.originalFlipped,
        negativeMultiplier: multipliers.negative,
        multiplierSmall: multipliers.small,
        multiplierLarge: multipliers.large,
        sceneryWidth: this.state.originalWidth,
      });
    }

    onCommit () {
      this.metadataMod.commit();
      this.setState({
        ...this.defaults,
        active: false,
      });
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        store.dispatch(setTool(SELECT_TOOL));
        this.setState({ active: true });
      }
    }

    renderCheckbox (key, props) {
      props = {
        ...props,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      };
      return e("div", null,
        key,
        e("input", { type: "checkbox", ...props })
      );
    }

    renderSlider (key, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloatOrDefault(e.target.value) })
      };
      const rangeProps = {
        ...props
      };
      const numberProps = {
        ...props
      };
      return e("div", null,
        key,
        e("input", { style: { width: "4em" }, type: "number", ...numberProps }),
        e("input", { type: "range", ...rangeProps, onFocus: e => e.target.blur() }),
      );
    }

    render () {
      let tools = [];
      if (this.state.active) {
        tools = [
          this.renderCheckbox("flipped"),
          this.renderCheckbox("negativeMultiplier"),
          this.renderSlider("multiplierSmall", { min: 0, max: 1, step: 0.001 }),
          this.renderSlider("multiplierLarge", { min: 0, max: 1000, step: 1 }),
          this.renderSlider("sceneryWidth", { min: 0.01, max: 1000, step: 0.1 }),
        ];
        tools = [
          ...tools,
          e("button", { style: { float: "left" }, onClick: () => this.onResetAll() }, "Load"),
          e("button", { style: { float: "left" }, onClick: () => this.onCommit() }, "Commit"),
        ];
      }
      return e("div",
        null,
        this.state.active && e("div", null, tools),
        e("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Metadata Mod"
        )
      );
    }
  }

  // this is a setting and not a standalone tool because it extends the select tool
  window.registerCustomSetting(MetadataModComponent);
}

/* init */
if (window.registerCustomSetting) {
  main();
} else {
  const prevCb = window.onCustomToolsApiReady;
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb();
    main();
  };
}

/* utils */
function setsEqual (a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (let x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}

function getLinesFromPoints (points) {
  return new Set([...points].map(point => point >> 1));
}

function parseFloatOrDefault (string, defaultValue = 0) {
  const x = parseFloat(string);
  return isNaN(x) ? defaultValue : x;
}

function splitMultiplier (multiplier) {
  const smallPrecision = 2;
  const negative = multiplier < 0;
  if (multiplier < 0) {
    multiplier *= -1;
  }
  const large = parseFloat(multiplier).toFixed(0);
  const small = parseFloat(multiplier - large).toFixed(smallPrecision);
  return {negative, small, large};
}
