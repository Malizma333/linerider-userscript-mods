// ==UserScript==

// @name         Line Rider Font Generator Mod
// @author       Tobias Bessler
// @description  Adds the ability to create font files
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none
// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-font-gen-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-font-gen-mod.user.js
// ==/UserScript==

const SELECT_TOOL = "SELECT_TOOL";
const EMPTY_SET = new Set();
const NEW_FONT = { "style": { "spacing": 5, "lineHeight": 20, "yOffset": {} } };

const setTool = (tool) => ({
  type: "SET_TOOL",
  payload: tool,
});

const setToolState = (toolId, state) => ({
  type: "SET_TOOL_STATE",
  payload: state,
  meta: { id: toolId },
});

const setSelectToolState = toolState => setToolState(SELECT_TOOL, toolState);

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: "UPDATE_LINES",
  payload: { linesToRemove, linesToAdd },
  meta: { name: name },
});

const addLines = (line) => updateLines(null, line, "ADD_LINES");

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES",
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES",
});

const getActiveTool = state => state.selectedTool;
const getToolState = (state, toolId) => state.toolState[toolId];
const getSelectToolState = state => getToolState(state, SELECT_TOOL);
const getSimulatorCommittedTrack = state => state.simulator.committedEngine;
const getTrackLinesLocked = state => state.trackLinesLocked;
const getSelectedLineType = state => (getTrackLinesLocked(state) ? 2 : state.selectedLineType);

class FontMod {
  constructor(store, initState) {
    this.store = store;
    this.state = initState;

    this.track = this.store.getState().simulator.committedEngine;
    this.selectedPoints = EMPTY_SET;
    this.lines = [];
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

  onUpdate(nextState = this.state) {
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
      if (this.state.active) {
        this.lines = [...getLinesFromPoints(this.selectedPoints)]
          .map(id => this.track.getLine(id))
          .filter(l => l);
      }
    }
  }
}

function main() {
  const {
    React,
    store,
  } = window;

  const create = React.createElement;

  class FontModComponent extends React.Component {
    constructor(props) {
      super(props);

      this.changed = false;

      this.state = {
        active: false,
        fontFile: null,
        charSpacing: 0,
        lineHeight: 0,
        char: "",
        charYOffset: 0,
      };

      this.fontMod = new FontMod(store, this.state);

      store.subscribe(() => {
        const selectToolActive = getActiveTool(store.getState()) === SELECT_TOOL;

        if (this.state.active && !selectToolActive) {
          this.setState({ active: false });
        }
      });
    }

    componentWillUpdate(nextProps, nextState) {
      this.fontMod.onUpdate(nextState);
    }

    onActivate() {
      if (this.state.active) {
        this.setState({ active: false });
        this.setState({ charSpacing: 0 });
        this.setState({ lineHeight: 0 });
        this.setState({ char: "" });
        this.setState({ charYOffset: 0 });

        store.dispatch(revertTrackChanges());
        this.changed = false;
      } else {
        store.dispatch(setTool(SELECT_TOOL));
        this.setState({ active: true });
        if (this.state.fontFile == null) {
          this.setState({ fontFile: NEW_FONT });
        }
      }
    }

    onFileDownload() {
      const fileName = "My-Font";
      const json = JSON.stringify(this.state.fontFile);
      const blob = new Blob([json], { type: "application/json" });
      const href = URL.createObjectURL(blob);
    }

    onLetterCapture() {
      if (this.state.char != "" && this.fontMod.lines.length > 0) {
        const nFontFile = this.state.fontFile;

        nFontFile.style.spacing = this.state.charSpacing;
        nFontFile.style.lineHeight = this.state.lineHeight;

        nFontFile.style.yOffset[this.state.char] = this.state.charYOffset;
        nFontFile[this.state.char] = this.fontMod.lines;

        this.setState({ fontFile: nFontFile });

        console.log(nFontFile);
      }
    }

    onPreviewFont() {
      if (this.changed) {
        store.dispatch(revertTrackChanges());
        this.changed = false;
      } else {
        let font = normalize(this.state.fontFile);
        let text = "";

        Object.entries(font).forEach((entry) => {
          const [key, value] = entry;

          if (key.length > 1) return;

          text += key;
        });

        if (this.state.active) {
          let previewLines = [];

          for (let { p1, p2 } of genLines(font, text)) {
            previewLines.push({
              x1: p1.x,
              y1: p1.y,
              x2: p2.x,
              y2: p2.y,
              type: 2,
            });
          }

          if (previewLines.length > 0) {
            store.dispatch(addLines(previewLines));
            this.changed = true;
          }
        }
      }
    }

    render() {
      return create(
        "div",
        null,
        this.state.active && create(
          "div",
          null,
          create(
            "div",
            null,
            "Spacing: ",
            create("input", {
              type: "number",
              min: -1000,
              max: 1000,
              step: 0.01,
              style: { width: "6em", textAlign: "right" },
              value: this.state.charSpacing,
              onChange: create => {
                -1000 <= create.target.value && create.target.value <= 1000
                  && this.setState({ charSpacing: create.target.valueAsNumber });
              },
            }),
          ),
          create(
            "div",
            null,
            "Line Height: ",
            create("input", {
              type: "number",
              min: -1000,
              max: 1000,
              step: 0.01,
              style: { width: "4.5em", textAlign: "right" },
              value: this.state.lineHeight,
              onChange: create => {
                -1000 <= create.target.value && create.target.value <= 1000
                  && this.setState({ lineHeight: create.target.valueAsNumber });
              },
            }),
          ),
          this.fontMod.lines.length > 0 && create(
            "div",
            null,
            "Character: ",
            create("input", {
              type: "text",
              style: { width: "1.5em", textAlign: "right" },
              maxLength: 1,
              value: this.state.char,
              onChange: create => {
                this.setState({ char: create.target.value });
                this.setState({ charYOffset: 0 });
              },
            }),
          ),
          this.fontMod.lines.length > 0 && this.state.char != ""
            && create(
              "div",
              null,
              `Y Offset (${this.state.char}): `,
              create("input", {
                type: "number",
                min: -1000,
                max: 1000,
                step: 0.01,
                style: { width: "4.5em", textAlign: "right" },
                value: this.state.charYOffset,
                onChange: create => {
                  -1000 <= create.target.value && create.target.value <= 1000
                    && this.setState({ charYOffset: create.target.valueAsNumber });
                },
              }),
            ),
          create(
            "div",
            null,
            create("button", {
              style: { float: "left" },
              onClick: () => this.onLetterCapture(),
            }, "Capture"),
            create("button", {
              style: { float: "left" },
              onClick: () => this.setState({ fontFile: NEW_FONT }),
            }, "Clear Font"),
          ),
          create(
            "div",
            null,
            create("a", {
              style: { float: "left" },
              href: `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(this.state.fontFile))}`,
              download: "My-Font.json",
            }, "Download Font"),
          ),
          create(
            "div",
            null,
            create("button", {
              style: { float: "left", backgroundColor: this.changed ? "lightblue" : null },
              onClick: this.onPreviewFont.bind(this),
            }, "Preview Font"),
          ),
        ),
        create("button", {
          style: {
            backgroundColor: this.state.active ? "lightblue" : null,
          },
          onClick: this.onActivate.bind(this),
        }, "Font Generator"),
      );
    }
  }

  window.registerCustomSetting(FontModComponent);
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

function setsEqual(a, b) {
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

function getLinesFromPoints(points) {
  return new Set([...points].map(point => point >> 1));
}

function* genLines(fontFile, text) {
  const { V2 } = window;
  const camPos = window.store.getState().camera.editorPosition;
  const fontStyle = fontFile.style;

  var offset = V2.from(camPos.x, camPos.y);
  var charOffset = V2.from(0, 0);
  var spacing = 0;

  for (const c of text) {
    if (c == "\n") {
      offset = V2.from(camPos.x, offset.y + fontStyle.lineHeight);
      spacing = 0;
      continue;
    }

    offset.x += spacing;

    // skip characters not in the font
    if (!fontFile.hasOwnProperty(c)) continue;

    charOffset = V2.from(0, -fontFile[c].charHeight);

    // check for custom y offsets of letters like p and q
    if (fontStyle.yOffset.hasOwnProperty(c)) {
      charOffset.y += fontStyle.yOffset[c];
    }

    spacing = fontFile[c].charWidth + fontStyle.spacing;

    for (const line of fontFile[c]) {
      yield {
        p1: V2.from(line.x1 + offset.x, line.y1 + offset.y + charOffset.y),
        p2: V2.from(line.x2 + offset.x, line.y2 + offset.y + charOffset.y),
      };
    }
  }
}

function normalize(fontFile) {
  const { V2 } = window;

  Object.entries(fontFile).forEach((entry) => {
    const [key, value] = entry;

    // continue on non-character keys
    if (key.length > 1) return;

    // finds local minimum of a letter
    const localMin = V2.from(value[0].x1, value[0].y1);
    const localMax = V2.from(value[0].x1, value[0].y1);

    for (const line of value) {
      if (localMin.x > line.x1) localMin.x = line.x1;
      if (localMin.x > line.x2) localMin.x = line.x2;
      if (localMin.y > line.y1) localMin.y = line.y1;
      if (localMin.y > line.y2) localMin.y = line.y2;

      if (localMax.x < line.x1) localMax.x = line.x1;
      if (localMax.x < line.x2) localMax.x = line.x2;
      if (localMax.y < line.y1) localMax.y = line.y1;
      if (localMax.y < line.y2) localMax.y = line.y2;
    }

    // adjusts each line based on local minimum
    for (var line of value) {
      line.x1 -= localMin.x;
      line.x2 -= localMin.x;
      line.y1 -= localMin.y;
      line.y2 -= localMin.y;
    }

    // store width and height properites of the letter
    fontFile[key].charWidth = localMax.x - localMin.x;
    fontFile[key].charHeight = localMax.y - localMin.y;
  });

  return fontFile;
}
