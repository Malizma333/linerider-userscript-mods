// ==UserScript==

// @name         Duplicate Line Remover
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Removes duplicate lines from a selection
// @version      1.2.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-remove-dupes.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-remove-dupes.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const SELECT_TOOL = "SELECT_TOOL";

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
  meta: { name }
});

const removeLines = (lineIds) => updateLines(lineIds, null, "REMOVE_LINES");

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

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class RemoveDuplicatesModComponent extends React.Component {
    constructor (props) {
      super(props);
    }

    onRemove () {
      const t = performance.now();

      const linesToRemove = new Set();
      const track = store.getState().simulator.engine

      for (const line of track.linesList.toArray().sort((l1, l2) => l2.width || 1 - l1.width || 1)) {
        if (line.type !== 2 || linesToRemove.has(line.id)) {
          continue;
        }

        const touchingP1 = new Set();

        for (const line2 of track.selectLinesInRadius(line.p1, Number.EPSILON)) {
          if (line2.id !== line.id) {
            touchingP1.add(line2.id)
          }
        }

        for (const line2 of track.selectLinesInRadius(line.p2, Number.EPSILON)) {
          if (touchingP1.has(line2.id) && line2.type === 2 && line.layer === line2.layer) {
            linesToRemove.add(line2.id)
          }
        }
      }

      store.dispatch(removeLines([...linesToRemove]));
      store.dispatch(commitTrackChanges());
      store.dispatch(revertTrackChanges());

      console.log("Took", Math.round(performance.now() - t), "ms");
    }

    render () {
      return e("div", null,
        e("button",
          { onClick: this.onRemove.bind(this) },
          "Remove Duplicates Select Mod"
        )
      );
    }
  }

  window.registerCustomSetting(RemoveDuplicatesModComponent);
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
