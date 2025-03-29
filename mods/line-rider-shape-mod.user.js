// ==UserScript==

// @name         Shape Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates regular polygons
// @version      1.1.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-shape-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-shape-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const SELECT_TOOL = "SELECT_TOOL";
const EMPTY_SET = new Set();

const setTool = (tool) => ({
  type: "SET_TOOL",
  payload: tool
});

const setToolState = (toolId, state) => ({
  type: "SET_TOOL_STATE",
  payload: state,
  meta: { id: toolId }
});

const setSelectToolState = toolState => setToolState(SELECT_TOOL, toolState);

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

const getActiveTool = state => state.selectedTool;
const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getTrackLinesLocked = state => state.trackLinesLocked;
const getSelectedLineType = state => (getTrackLinesLocked(state) ? 2 : state.selectedLineType);

class ShapeMod {
  constructor (store, initState) {
    this.store = store;

    this.changed = false;
    this.state = initState;

    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.selectedPoints = EMPTY_SET;
    this.lineType = getSelectedLineType(this.store.getState());

    store.subscribeImmediate(() => {
      if (this.state.active) {
        const selectToolState = getSelectToolState(this.store.getState());
        if (selectToolState && selectToolState.multi && selectToolState.status.pressed) {
          // prevent multi-adjustment
          this.store.dispatch(setSelectToolState({ status: { inactive: true } }));
        }
      }

      this.onUpdate();
    });
  }

  commitShape () {
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

      const selectToolState = getSelectToolState(this.store.getState());

      let selectedPoints = selectToolState.selectedPoints;

      if (!selectToolState.multi) {
        selectedPoints = EMPTY_SET;
      }

      if (!setsEqual(this.selectedPoints, selectedPoints)) {
        this.selectedPoints = selectedPoints;
        shouldUpdate = true;
      }

      const lineType = getSelectedLineType(this.store.getState());
      if (this.lineType !== lineType) {
        this.lineType = lineType;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      if (this.changed) {
        this.store.dispatch(revertTrackChanges());
        this.changed = false;
      }

      if (this.state.active && this.selectedPoints.size == 2) {
        const selectedLines = [...getLinesFromPoints(this.selectedPoints)]
          .map(id => this.track.getLine(id))
          .filter(l => l);

        const shapeLines = [];

        for (const { p1, p2 } of genShape(selectedLines[0], this.state)) {
          shapeLines.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            type: this.lineType
          });
        }

        if (shapeLines.length > 0) {
          this.store.dispatch(addLines(shapeLines));
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

  Object.defineProperty(window.Tools.SELECT_TOOL, "usesSwatches", { value: true });

  class ShapeModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        sides: 3
      };

      this.shapeMod = new ShapeMod(store, this.state);

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
      this.shapeMod.onUpdate(nextState);
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        store.dispatch(setTool(SELECT_TOOL));
        this.setState({ active: true });
      }
    }

    onCommit () {
      const committed = this.shapeMod.commitShape();
      if (committed) {
        this.setState({ active: false });
      }
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

    render () {
      return create("div", null,
        this.state.active && create("div", null,

          this.renderSlider("sides", "Sides", { min: 3, max: 1000, step: 1 }),

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
          "Shape Mod"
        )
      );
    }
  }

  window.registerCustomSetting(ShapeModComponent);
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

function * genShape (line, { sides = 3 } = {}) {
  const { V2 } = window;

  const center = new V2(line.p1);
  const edge = new V2(line.p2);

  let pointA = new V2(edge);

  for (let i = 0; i < sides; i++) {
    const pointB = new V2(pointA);

    pointA = addAngle(center, pointA, Math.PI - Math.PI * (sides - 2) / sides);

    yield { p1: pointA, p2: pointB };
  }
}

function addAngle (center, point, angle) {
  const r = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
  let t = Math.atan2(point.y - center.y, point.x - center.x);

  t += angle;

  const newPointA = { x: r * Math.cos(t) + center.x, y: r * Math.sin(t) + center.y };

  return newPointA;
}

function setsEqual (a, b) {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const x of a) {
    if (!b.has(x)) {
      return false;
    }
  }
  return true;
}

function getLinesFromPoints (points) {
  return new Set([...points].map(point => point >> 1));
}
