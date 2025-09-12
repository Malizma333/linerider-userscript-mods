// ==UserScript==

// @name         Scenery Width Number Picker
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Scenery slider component
// @version      0.2.2
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-scenery-width-fix.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-scenery-width-fix.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const getWindowFocused = state => state.views.Main;
const getPlayerRunning = state => state.player.running;
const getSceneryWidth = state => state.selectedSceneryWidth;
const MIN_WIDTH = 0.01;
const MAX_WIDTH = 362;

function main() {
  const {
    React,
    ReactDOM,
    store,
  } = window;

  const e = React.createElement;
  const sceneryWidthContainer = document.createElement("div");
  const sceneryWidthContainerStyle = {
    position: "fixed",
    opacity: 0,
    pointerEvents: "none",
    transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    top: "25px",
    left: "65vw",
  };

  class SceneryWidthModComponent extends React.Component {
    constructor() {
      super();

      this.state = {
        sceneryWidth: 1,
        textWidth: "1",
      };

      store.subscribe(() => this.setState({ sceneryWidth: getSceneryWidth(store.getState()) }));
    }

    componentDidMount() {
      Object.assign(sceneryWidthContainer.style, sceneryWidthContainerStyle);
    }

    onChooseWidth(sceneryWidth) {
      if (isNaN(sceneryWidth)) {
        sceneryWidth = 1;
      }
      if (sceneryWidth < MIN_WIDTH) {
        sceneryWidth = MIN_WIDTH;
      }
      if (sceneryWidth > MAX_WIDTH) {
        sceneryWidth = MAX_WIDTH;
      }
      store.dispatch({ type: "SELECT_SCENERY_WIDTH", payload: sceneryWidth });
      this.setState({ sceneryWidth, textWidth: sceneryWidth.toString() });
    }

    render() {
      return e(
        "div",
        null,
        e("input", {
          style: { width: "4em" },
          type: "number",
          min: MIN_WIDTH,
          max: MAX_WIDTH,
          value: this.state.textWidth,
          onChange: e => this.setState({ textWidth: e.target.value }),
          onBlur: e => this.onChooseWidth(parseFloat(e.target.value)),
        }),
        e("input", {
          style: { width: "7em" },
          type: "range",
          min: Math.log10(MIN_WIDTH)-0.1,
          max: Math.log10(MAX_WIDTH)+0.1,
          step: 0.1,
          value: Math.log10(this.state.sceneryWidth),
          onChange: e => this.onChooseWidth(Math.pow(10, parseFloat(e.target.value))),
        }),
      );
    }
  }

  document.getElementById("content").appendChild(sceneryWidthContainer);

  ReactDOM.render(
    e(SceneryWidthModComponent),
    sceneryWidthContainer,
  );

  store.subscribe(() => {
    let playerRunning = getPlayerRunning(store.getState());
    let windowFocused = getWindowFocused(store.getState());
    const active = !playerRunning && windowFocused;
    sceneryWidthContainer.style.opacity = active ? 1 : 0;
    sceneryWidthContainer.style.pointerEvents = active ? null : "none";
  });
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
