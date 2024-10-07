// ==UserScript==

// @name         Minimal Collision Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates minimal lines needed to reproduce collisions
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  _
// @updateURL    _
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
  meta: { name: name }
});

const addLines = (lines) => updateLines(null, lines, "ADD_LINES");
const removeLines = (lines) => updateLines(lines, null, "REMOVE_LINES");

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
const getSimulatorTrack = state => state.simulator.engine;

function getPlayerIndex(state) {
  return state.player.index;
}

class CollisionsMod {
  constructor (store, initState) {
    this.store = store;
    this.changed = false;
    this.state = initState;

    this.track = getSimulatorCommittedTrack(this.store.getState());
    this.playerIndex = getPlayerIndex(this.store.getState());
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

      const playerIndex = getPlayerIndex(this.store.getState());
      if (this.playerIndex !== playerIndex) {
        this.playerIndex = playerIndex;
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

    for (let { p1, p2, flipped, type, multiplier } of genLines(selectedLines, this.playerIndex, this.track)) {
      linesToAdd.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        flipped,
        type,
        multiplier
      });
    }

    if (linesToAdd.length > 0) {
      this.store.dispatch(addLines(linesToAdd));
    }

    this.store.dispatch(removeLines(
        selectedLines.map(line => line.id)
    ));

    this.store.dispatch(addLines(
        selectedLines.map(line => {return {x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, type: 2}})
    ));

    this.changed = true;
  }
}

// Function to create UI component

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class MinCollisionsModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        width: 5,
        height: 5
      };

      this.mod = new CollisionsMod(store, this.state);

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

    render () {
      return e("div", null,
        this.state.active &&
                     e("div", null,
                       e("button",
                         { style: { float: "left" }, onClick: () => this.onCommit() },
                         "Commit"
                       )
                     ),
        e("button",
          { style: { backgroundColor: this.state.active ? "lightblue" : null }, onClick: this.onActivate.bind(this) },
          "Minimal Collisions Mod"
        )
      );
    }
  }

  window.registerCustomSetting(MinCollisionsModComponent);
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

const dist = (a,b) => Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y))

const between = (a, b, c) => dist(a,b) + .00001 >= dist(a,c) + dist(b,c)

function* genLines (selectedLines, playerIndex, track) {
    const { V2 } = window;
    const lineSize = 0.025;

    for(let i = 0; i < playerIndex; i++) {
        const frameData = track.getFrame(i);
        const collidingLines = selectedLines.filter(line => frameData.involvedLineIds.includes(line.id));
        const points = frameData.snapshot.entities[0].entities[0].points;

        if(collidingLines.length === 0) continue;

        for(const p of points) {
            for(const line of collidingLines) {
                if(between(line.p1, line.p2, p.pos)) {
                    yield {
                        flipped: line.flipped,
                        type: line.type,
                        multiplier: line.multiplier || 0,
                        p1: V2.from(p.pos.x - lineSize * line.norm.y, p.pos.y + lineSize * line.norm.x),
                        p2: V2.from(p.pos.x + lineSize * line.norm.y, p.pos.y - lineSize * line.norm.x)
                    };
                }
            }
        }
    }
}