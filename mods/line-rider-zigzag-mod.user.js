// ==UserScript==

// @name         Line Rider Zigzag Mod
// @author       Malizma
// @description  Linerider.com userscript to generate zigzags
// @version      1.1

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @match        https://*.surge.sh/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-zigzag-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-zigzag-mod.user.js

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
  meta: { name: name }
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

class ZigZagMod {
  constructor (store, initState) {
    this.store = store;
    this.changed = false;
    this.state = initState;

    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.selectedPoints = EMPTY_SET;

    store.subscribeImmediate(() => {
      if (this.state.active) {
        const selectToolState = getSelectToolState(this.store.getState());
        if (selectToolState && selectToolState.status.pressed) {
          this.store.dispatch(setSelectToolState({ status: { inactive: true } }));
        }
      }

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

      const selectToolState = getSelectToolState(this.store.getState());

      let selectedPoints = selectToolState.selectedPoints;

      if (!setsEqual(this.selectedPoints, selectedPoints)) {
        this.selectedPoints = selectedPoints;
        shouldUpdate = true;
      }
    }

    if (!shouldUpdate) return;

    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
    }

    if (!this.state.active || this.selectedPoints.size === 0) return;

    const selectedLines = [ ...getLinesFromPoints(this.selectedPoints) ]
      .map(id => this.track.getLine(id))
      .filter(l => l);
    let linesToAdd = [];

    for (let { p1, p2 } of genZigZag(selectedLines, this.state)) {
      linesToAdd.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        type: 2
      });
    }

    if (linesToAdd.length > 0) {
      this.store.dispatch(addLines(linesToAdd));
      this.changed = true;
    }
  }
}

// Function to create UI component

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class ZigZagModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        width: 5,
        height: 5
      };

      this.mod = new ZigZagMod(store, this.state);

      store.subscribe(() => {
        const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL;

        if (this.state.active && !selectToolActive) {
          this.setState({ active: false });
        }
      });
    }

    componentWillUpdate (nextProps, nextState) {
      this.mod.onUpdate(nextState);
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
      const committed = this.mod.commit();
      if (committed) {
        this.setState({ active: false });
      }
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloat(e.target.value) })
      };

      return e(
        "div", null,
        title,
        e("input", { style: { width: "3em" }, type: "number", ...props }),
        e("input", { type: "range", ...props, onFocus: e => e.target.blur() })
      );
    }

    render () {
      return e("div", null,
        this.state.active &&
                     e("div", null,
                       this.renderSlider("width", "Width", { min: 1, max: 100, step: .1 }),
                       this.renderSlider("height", "Height", { min: -100, max: 100, step: .1 }),
                       e("button",
                         { style: { float: "left" }, onClick: () => this.onCommit() },
                         "Commit"
                       )
                     ),
        e("button",
          { style: { backgroundColor: this.state.active ? "lightblue" : null }, onClick: this.onActivate.bind(this) },
          "Zig Zag Mod"
        )
      );
    }
  }

  window.registerCustomSetting(ZigZagModComponent);
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

function setsEqual (a, b) {
  if (a === b) {
    return true;
  }
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
  return new Set([ ...points ].map(point => point >> 1));
}

function linesShareOnePoint (lineA, lineB) {
  return (
    lineA.p1.x === lineB.p1.x && lineA.p1.y === lineB.p1.y && !(lineA.p2.x === lineB.p2.x && lineA.p2.y === lineB.p2.y) ||
    lineA.p1.x === lineB.p2.x && lineA.p1.y === lineB.p2.y && !(lineA.p2.x === lineB.p1.x && lineA.p2.y === lineB.p1.y) ||
    lineA.p2.x === lineB.p1.x && lineA.p2.y === lineB.p1.y && !(lineA.p1.x === lineB.p2.x && lineA.p1.y === lineB.p2.y) ||
    lineA.p2.x === lineB.p2.x && lineA.p2.y === lineB.p2.y && !(lineA.p1.x === lineB.p1.x && lineA.p1.y === lineB.p1.y)
  );
}

function findShapes (lines) {
  const shapes = [];

  while (lines.length > 0) {
    const queue = [ lines.pop() ];

    shapes.push([]);

    while (queue.length > 0) {

      const currentLine = queue.pop();
      const toRemove = [];

      shapes[shapes.length - 1].push({
        id: currentLine.id,
        endpoints: {
          p1: currentLine.p1,
          p2: currentLine.p2
        },
        neighbors: {
          p1ToP1: [],
          p1ToP2: [],
          p2ToP1: [],
          p2ToP2: []
        }
      });

      for (let j = 0; j < lines.length; j++) {
        if (linesShareOnePoint(currentLine, lines[j])) {
          queue.push(lines[j]);
          toRemove.unshift(j);
        }
      }

      for (const j of toRemove) {
        lines.splice(j, 1);
      }
    }
  }

  for (const shape of shapes) {
    for (const lineA of shape) {
      for (const lineB of shape) {
        if (linesShareOnePoint(lineA.endpoints, lineB.endpoints)) {
          if (lineA.endpoints.p1.x === lineB.endpoints.p1.x && lineA.endpoints.p1.y === lineB.endpoints.p1.y) {
            lineA.neighbors.p1ToP1.push(lineB);
          }

          if (lineA.endpoints.p1.x === lineB.endpoints.p2.x && lineA.endpoints.p1.y === lineB.endpoints.p2.y) {
            lineA.neighbors.p1ToP2.push(lineB);
          }

          if (lineA.endpoints.p2.x === lineB.endpoints.p1.x && lineA.endpoints.p2.y === lineB.endpoints.p1.y) {
            lineA.neighbors.p2ToP1.push(lineB);
          }

          if (lineA.endpoints.p2.x === lineB.endpoints.p2.x && lineA.endpoints.p2.y === lineB.endpoints.p2.y) {
            lineA.neighbors.p2ToP2.push(lineB);
          }
        }
      }
    }
  }

  return shapes;
}

function interpolateLine (line, width, offset, startFromP1) {
  const startPoint = startFromP1 ? line.p1 : line.p2;
  const inv = startFromP1 ? 1 : -1;
  const vector = { x: inv * (line.p2.x - line.p1.x), y: inv * (line.p2.y - line.p1.y) };
  const length = Math.hypot(vector.x, vector.y);
  const normVector = { x: vector.x / length, y: vector.y / length };
  const theta = Math.atan2(vector.y, vector.x);
  let remaining = (offset - length) % width;
  const points = [];

  for (let i = offset; i <= length; i += width) {
    points.push({
      x: startPoint.x + i * normVector.x,
      y: startPoint.y + i * normVector.y,
      a: theta
    });
  }

  return { points, remaining };
}

function* genZigZag (selectedLines, { width = 5, height = 5 } = {}) {
  const { V2 } = window;

  const shapesArray = findShapes(selectedLines);

  if (width <= 0 || !shapesArray) return;

  const visited = [];
  const dataStack = [];

  for (const shape of shapesArray) {
    visited.length = 0;
    dataStack.length = 0;

    const initDirection = Math.atan2(shape[0].endpoints.p2.y - shape[0].endpoints.p1.y, shape[0].endpoints.p2.x - shape[0].endpoints.p1.x) - Math.PI / 2;
    const initHeightVector = { x: height * Math.cos(initDirection), y: height * Math.sin(initDirection) };
    const initLastPoint = V2.from(shape[0].endpoints.p1.x + initHeightVector.x, shape[0].endpoints.p1.y + initHeightVector.y);

    dataStack.push({ currentLine: shape[0], offset: 0, startFromP1: true, lastPoint: initLastPoint, flipped: -1 });

    while (dataStack.length > 0) {
      const { currentLine, offset, startFromP1, lastPoint, flipped } = dataStack.pop();

      if (visited.includes(currentLine.id)) continue;
      visited.push(currentLine.id);

      const startPoint = V2.from(lastPoint.x, lastPoint.y);
      const initFlipped = -flipped;
      let flipTracker = flipped;

      const { points, remaining } = interpolateLine(currentLine.endpoints, width, offset, startFromP1);
      const nextOffset = remaining;

      for (let i = 1; i < points.length; i++) {
        const currentPoint = points[i];
        flipTracker = -flipTracker;
        const currentDirection = currentPoint.a + flipTracker * Math.PI / 2;
        const heightVector = { x: height * Math.cos(currentDirection), y: height * Math.sin(currentDirection) };

        yield {
          p1: V2.from(currentPoint.x + heightVector.x, currentPoint.y + heightVector.y),
          p2: V2.from(lastPoint.x, lastPoint.y)
        };

        lastPoint.x = currentPoint.x + heightVector.x;
        lastPoint.y = currentPoint.y + heightVector.y;
      }

      for (const neighbor of currentLine.neighbors.p1ToP1) {
        if (startFromP1) {
          dataStack.push({ currentLine: neighbor, offset: offset, startFromP1: true, lastPoint: startPoint, flipped: initFlipped });
        } else {
          dataStack.push({ currentLine: neighbor, offset: nextOffset, startFromP1: true, lastPoint: lastPoint, flipped: flipTracker });
        }
      }

      for (const neighbor of currentLine.neighbors.p1ToP2) {
        if (startFromP1) {
          dataStack.push({ currentLine: neighbor, offset: offset, startFromP1: false, lastPoint: startPoint, flipped: initFlipped });
        } else {
          dataStack.push({ currentLine: neighbor, offset: nextOffset, startFromP1: false, lastPoint: lastPoint, flipped: flipTracker });
        }
      }

      for (const neighbor of currentLine.neighbors.p2ToP1) {
        if (startFromP1) {
          dataStack.push({ currentLine: neighbor, offset: nextOffset, startFromP1: true, lastPoint: lastPoint, flipped: flipTracker });
        } else {
          dataStack.push({ currentLine: neighbor, offset: offset, startFromP1: true, lastPoint: startPoint, flipped: initFlipped });
        }
      }

      for (const neighbor of currentLine.neighbors.p2ToP2) {
        if (startFromP1) {
          dataStack.push({ currentLine: neighbor, offset: nextOffset, startFromP1: false, lastPoint: lastPoint, flipped: flipTracker });
        } else {
          dataStack.push({ currentLine: neighbor, offset: offset, startFromP1: false, lastPoint: startPoint, flipped: initFlipped });
        }
      }
    }
  }
}
