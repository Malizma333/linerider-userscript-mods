// ==UserScript==

// @name         Chain Select
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Adds lines to selection that are connected in a chain
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-chain-select-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-chain-select-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const SELECT_TOOL = "SELECT_TOOL";

const setToolState = (toolId, state) => ({
  type: "SET_TOOL_STATE",
  payload: state,
  meta: { id: toolId }
});

const setSelectToolState = toolState => setToolState(SELECT_TOOL, toolState);

const getActiveTool = state => state.selectedTool;
const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class ChainSelectModComponent extends React.Component {
    constructor (props) {
      super(props);
    }

    onChain () {
      const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL;

      if (!selectToolActive) {
        return;
      }

      const selectedPoints = getSelectToolState(store.getState()).selectedPoints;

      if (selectedPoints.size === 0) {
        return;
      }

      const t = performance.now();

      const track = getSimulatorCommittedTrack(store.getState());
      const lineQueue = [...selectedPoints].map(point => point >> 1);

      const linesShareOnePoint = (lineA, lineB) => (
        lineA.p1.x === lineB.p1.x && lineA.p1.y === lineB.p1.y && !(lineA.p2.x === lineB.p2.x && lineA.p2.y === lineB.p2.y) ||
        lineA.p1.x === lineB.p2.x && lineA.p1.y === lineB.p2.y && !(lineA.p2.x === lineB.p1.x && lineA.p2.y === lineB.p1.y) ||
        lineA.p2.x === lineB.p1.x && lineA.p2.y === lineB.p1.y && !(lineA.p1.x === lineB.p2.x && lineA.p1.y === lineB.p2.y) ||
        lineA.p2.x === lineB.p2.x && lineA.p2.y === lineB.p2.y && !(lineA.p1.x === lineB.p1.x && lineA.p1.y === lineB.p1.y)
      );

      // Worse case O(N^2)...
      while (lineQueue.length > 0) {
        const currentLine = track.getLine(lineQueue.pop());
        for (const line of track.linesList) {
          if (!(selectedPoints.has(line.id * 2) || selectedPoints.has(line.id * 2 + 1)) && linesShareOnePoint(currentLine, line)) {
            lineQueue.push(line.id);
            selectedPoints.add(line.id * 2);
            selectedPoints.add(line.id * 2 + 1);
          }
        }
      }

      store.dispatch(setSelectToolState({ selectedPoints }));

      console.log("Took", Math.round(performance.now() - t), "ms");
    }

    render () {
      return e("div", null,
        e("button",
          { onClick: this.onChain.bind(this) },
          "Chain Select Mod"
        )
      );
    }
  }

  window.registerCustomSetting(ChainSelectModComponent);
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
