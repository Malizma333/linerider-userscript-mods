// ==UserScript==

// @name         SVG Exporter
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Generates an svg file from a selection of lines
// @version      1.2.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-svg-exporter.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-svg-exporter.user.js
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

const getActiveTool = state => state.selectedTool;
const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;

class SVGExportMod {
  constructor (store, initState) {
    this.store = store;
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

  onExport () {
    if (this.selectedPoints.size === 0) return 2;

    const selectedLines = [ ...getLinesFromPoints(this.selectedPoints) ]
    .map(id => this.track.getLine(id))
    .filter(l => l);

    const success = 0;

    try {
      if(getSVG(selectedLines)) {
        console.info("[SVG Export] Success");
      } else {
        success = 2;
        console.info("[SVG Export] Failed");
      }
    } catch(e) {
      success = 1;
      console.error("[SVG Export] Failed:", e.message);
    }

    return success;
  }

  onUpdate (nextState = this.state) {
    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true;
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false;
    }

    if (this.state !== nextState) {
      this.state = nextState;
    }

    if (!this.state.active) return;

    const track = getSimulatorCommittedTrack(this.store.getState());

    if(track !== this.track) {
      this.track = track;
    }

    const selectToolState = getSelectToolState(this.store.getState());

    let selectedPoints = selectToolState.selectedPoints;

    if (!setsEqual(this.selectedPoints, selectedPoints)) {
      this.selectedPoints = selectedPoints;
    }
  }
}

function main () {
  const {
    React,
    store
  } = window;

  const e = React.createElement;

  class SvgExportModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        success: 0
      };

      this.mod = new SVGExportMod(store, this.state);

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

    onExport () {
      const exportSuccess = this.mod.onExport();
      this.setState({ success: exportSuccess })
    }

    render () {
      return e("div", null,
               this.state.active &&
               e("div", null,
                 this.state.success === 1 && e("div", null, "Error: See console"),
                 this.state.success === 2 && e("div", null, "Error: No lines selected"),
                 e("button",
                   { style: { float: "left" }, onClick: () => this.onExport() },
                   "Export"
                  )
                ),
               e("button",
                 { style: { backgroundColor: this.state.active ? "lightblue" : null }, onClick: this.onActivate.bind(this) },
                 "SVG Export Mod"
                )
              );
    }
  }

  window.registerCustomSetting(SvgExportModComponent);
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

function getSVG(selectedLines) {
  if(!selectedLines || selectedLines.length === 0) return false;

  const bounds = {
    minX: 0, maxX: 0, minY: 0, maxY: 0
  }

  bounds.minX = selectedLines[0].p1.x;
  bounds.maxX = selectedLines[0].p2.x;
  bounds.minY = selectedLines[0].p1.y;
  bounds.maxY = selectedLines[0].p2.y;

  for(const line of selectedLines) {
    const minLX = Math.min(line.p1.x, line.p2.x);
    const minLY = Math.min(line.p1.y, line.p2.y);
    const maxLX = Math.max(line.p1.x, line.p2.x);
    const maxLY = Math.max(line.p1.y, line.p2.y);

    if(bounds.minX > minLX) {bounds.minX = minLX;}
    if(bounds.minY > minLY) {bounds.minY = minLY;}
    if(bounds.maxX < maxLX) {bounds.maxX = maxLX;}
    if(bounds.maxY < maxLY) {bounds.maxY = maxLY;}
  }

  bounds.minX -= 2;
  bounds.minY -= 2;
  bounds.maxX += 2;
  bounds.maxY += 2;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const svgWidth = bounds.maxX - bounds.minX;
  const svgHeight = bounds.maxY - bounds.minY;
  if(svgWidth < 0 || svgHeight < 0) return false;

  svg.setAttribute("width", String(bounds.maxX - bounds.minX));
  svg.setAttribute("height", String(bounds.maxY - bounds.minY));

  for(const line of selectedLines) {
    const lineElem = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lineElem.setAttribute("x1", String(line.p1.x - bounds.minX));
    lineElem.setAttribute("y1", String(line.p1.y - bounds.minY));
    lineElem.setAttribute("x2", String(line.p2.x - bounds.minX));
    lineElem.setAttribute("y2", String(line.p2.y - bounds.minY));
    lineElem.setAttribute("stroke", "black");
    svg.appendChild(lineElem);
  }

  const svgString = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "lines.svg";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return true;
}
