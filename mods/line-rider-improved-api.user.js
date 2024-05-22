// ==UserScript==

// @name         Improved Mod API
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Container for linerider.com mods
// @version      1.4.2
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-improved-api.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-improved-api.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const setTool = (tool) => ({
  type: "SET_TOOL",
  payload: tool
});

const getActiveTool = state => state.selectedTool;
const getWindowFocused = state => state.views.Main;
const getPlayerRunning = state => state.player.running;

function main () {
  window.V2 = window.V2 || window.store.getState().simulator.engine.engine.state.startPoint.constructor;

  const {
    React,
    ReactDOM,
    store
  } = window;

  const e = React.createElement;
  var playerRunning = getPlayerRunning(store.getState());
  var windowFocused = getWindowFocused(store.getState());

  const rootStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    textAlign: "left",
    transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    width: "100%"
  };

  const boxStyle = {
    display: "flex",
    flexDirection: "column-reverse",
    padding: 8,
    width: "100%"
  };

  store.subscribe(() => {
    playerRunning = getPlayerRunning(store.getState());
    windowFocused = getWindowFocused(store.getState());

    let shouldBeVisible = !playerRunning && windowFocused;

    toolContainer.style.opacity = shouldBeVisible ? 1 : 0;
    toolContainer.style.pointerEvents = shouldBeVisible ? null : "none";

    settingsContainer.style.opacity = shouldBeVisible ? 1 : 0;
    settingsContainer.style.pointerEvents = shouldBeVisible ? null : "none";
  });

  class CustomToolsContainer extends React.Component {
    constructor () {
      super();

      this.state = {
        activeTool: getActiveTool(store.getState()),
        customTools: {}
      };

      store.subscribe(() => {
        const activeTool = getActiveTool(store.getState());
        if (this.state.activeTool !== activeTool) {
          let activeCustomTool = this.state.customTools[this.state.activeTool];
          if (activeCustomTool && activeCustomTool.onDetach) {
            activeCustomTool.onDetach();
          }
          this.setState({ activeTool });
        }
      });
    }

    componentDidMount () {
      let containerAssigned = false;
      window.registerCustomTool = (toolName, tool, component, onDetach) => {
        console.info("Registering custom tool", toolName);

        window.Tools[toolName] = tool;

        this.setState((prevState) => ({
          customTools: {
            ...prevState.customTools,
            [toolName]: { component, onDetach }
          }
        }));

        if (onDetach) {
          this.customToolsDestructors[toolName] = onDetach;
        }

        if (!containerAssigned) {
          containerAssigned = true;
          Object.assign(toolContainer.style, {
            position: "fixed",
            width : "200px",
            height: "16%",
            overflowY: "auto",
            overflowX: "hidden",
            top: "8px",
            right: "250px",
            border: "1px solid black",
            backgroundColor: "#ffffff",
            opacity: 0,
            pointerEvents: "none"
          });
        }
      };
    }

    render () {
      const activeCustomTool = this.state.customTools[this.state.activeTool];

      return e("div", { style: rootStyle },
        Object.keys(this.state.customTools).length > 0 && e("div", null,
          e("select", {
            style: { textAlign: "center", width : "200px" },
            maxMenuHeight : 100,
            value: this.state.activeTool,
            onChange: e => {
              store.dispatch(setTool(e.target.value));
            } },
          e("option", { value: "PENCIL_TOOL" }, "- Select Tool -"),
          ...Object.keys(this.state.customTools).map(toolName =>
            e("option", { value: toolName }, toolName)
          ))
        ),
        activeCustomTool && activeCustomTool.component && e("div", { style: boxStyle }, e(activeCustomTool.component))
      );
    }
  }

  const toolContainer = document.createElement("div");

  document.getElementById("content").appendChild(toolContainer);

  ReactDOM.render(
    e(CustomToolsContainer),
    toolContainer
  );

  class CustomSettingsContainer extends React.Component {
    constructor () {
      super();

      this.state = {
        activeSetting: null,
        customSettings: []
      };
    }

    componentDidMount () {
      let containerAssigned = false;

      window.registerCustomSetting = (component) => {
        console.info("Registering custom setting", component.name);
        this.setState((prevState) => ({
          customSettings: [ ...prevState.customSettings, component ]
        }));

        if (!containerAssigned) {
          containerAssigned = true;
          Object.assign(settingsContainer.style, {
            position: "fixed",
            width : "200px",
            height: "150px",
            overflowY: "auto",
            overflowX: "hidden",
            bottom: "15%",
            right: "8px",
            border: "1px solid black",
            backgroundColor: "#ffffff",
            opacity: 0,
            pointerEvents: "none"
          });
        }
      };

      if (typeof window.onCustomToolsApiReady === "function") {
        window.onCustomToolsApiReady();
      }
    }

    createDisplayName (className) {
      if (className.length == 0) return "Unnamed Mod";

      let finalName = [ className[0].toUpperCase() ];

      for (let i = 1; i < className.length; i++) {
        let character = className[i];

        if (character == character.toUpperCase()) {
          finalName.push("");
        }

        finalName[finalName.length - 1] += character;
      }

      finalName = finalName.filter(e => e.toUpperCase() !== "COMPONENT");

      return finalName.join(" ");
    }

    render () {
      const activeSetting = this.state.customSettings[this.state.activeSetting];

      this.state.customSettings.sort(function (modA, modB) {
        var modAName = modA.name.toUpperCase();
        var modBName = modB.name.toUpperCase();
        if (modAName == "SETTINGS") return -1;
        if (modBName == "SETTINGS") return 1;
        return (modAName < modBName) ? -1 : (modAName > modBName) ? 1 : 0;
      });

      return e("div", { style: rootStyle },
        this.state.customSettings.length > 1 && e("div", { style: { width: "100%" } },
          e("select", {
            style: { textAlign: "center", width: "100%" },
            value: this.state.activeSetting,
            onChange: e => this.setState({ activeSetting : e.target.value }) },
          e("option", { value: null }, "- Select Mod -"),
          this.state.customSettings.map((option, index) => (
            e("option", { value: index }, this.createDisplayName(option.name))
          ))
          )
        ),
        activeSetting && e("div", { style: boxStyle }, e(activeSetting))
      );
    }
  }

  const settingsContainer = document.createElement("div");

  document.getElementById("content").appendChild(settingsContainer);

  ReactDOM.render(
    e(CustomSettingsContainer),
    settingsContainer
  );

  class Settings extends React.Component {
    constructor (props) {
      super(props);

      let windowPreferences = localStorage.getItem("windowPreferences");

      if (windowPreferences) {
        this.state = JSON.parse(windowPreferences);
      } else {
        this.state = {
          divWidth: 200,
          divHeight: 150,
        };
      }
    }

    onApply () {
      localStorage.setItem("WINDOW_PREFERENCES", JSON.stringify(this.state));
      Object.assign(settingsContainer.style, {
        width: this.state.divWidth + "px",
        height: this.state.divHeight + "px"
      });
    }

    render () {
      return e("div", null,
        e('button', {onClick: () => this.onApply()}, 'Apply'),
        e("div", {style: {marginBottom: '5px'}},
          "Window Width ",
          e("input", { style: { width: "3.3em" }, type: "number",
            min: 200, max: 300, step: 1,
            value: this.state.divWidth,
            onChange: e => {
              let w = parseFloat(e.target.value);
              if (200 <= w && w <= 300) {
                this.setState({ divWidth: w });
              }
            }
          })
        ),
        e("div", {style: {marginBottom: '5px'}},
          "Window Height ",
          e("input", { style: { width: "3.3em" }, type: "number",
            min: 150, max: 250, step: 1,
            value: this.state.divHeight,
            onChange: e => {
              let h = parseFloat(e.target.value);
              if (150 <= h && h <= 250) {
                this.setState({ divHeight: h });
              }
            }
          }))
       )
    }
  }

  window.registerCustomSetting(Settings);

  let windowPreferences = localStorage.getItem("WINDOW_PREFERENCES");

  if (windowPreferences) {
    let parsedPreferences = JSON.parse(windowPreferences);
    Object.assign(settingsContainer.style, {
      width: parsedPreferences.divWidth + "px",
      height: parsedPreferences.divHeight + "px"
    });
  }
}

if (window.store) {
  main();
} else {
  window.onAppReady = main;
}
