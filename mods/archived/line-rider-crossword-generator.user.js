// ==UserScript==

// @name         Crossword Generator
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  A mod that lets you generate crosswords in line rider
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*

// @downloadURL  _
// @updateURL    _
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

/* Actions */

const commitTrackChanges = () => ({
  type: "COMMIT_TRACK_CHANGES"
});

const revertTrackChanges = () => ({
  type: "REVERT_TRACK_CHANGES"
});

const updateLines = (linesToRemove, linesToAdd, name) => ({
type: "UPDATE_LINES",
payload: { linesToRemove, linesToAdd },
meta: { name: name }
});

const addLines = (lines) => updateLines(null, lines, "ADD_LINES");

const addLayer = () => ({ type: "ADD_LAYER" });

const renameLayer = (id, name) => ({
type: "RENAME_LAYER",
payload: { id, name }
});

const setLayerEditable = (id, editable) => ({
type: "SET_LAYER_EDITABLE",
payload: { id, editable }
});

const getEditorPos = state => state.camera.editorPosition;

class CrosswordModHelper {
  constructor (store) {
      this.store = store;
  }

  generate (words) {
      const {matrix, cluesH, cluesV, clueMarkersH, clueMarkersV} = generatePuzzle(words);

      const linesToDraw = [];
      linesToDraw.push(...drawBoard(matrix, clueMarkersH, clueMarkersV));
      linesToDraw.push(...drawText('Horizontal:\n' + cluesH.join('\n'), {x: -1000, y: -500}, 14));
      linesToDraw.push(...drawText('Vertical:\n' + cluesV.join('\n'), {x: 1000, y: -500}, 14));

      this.store.dispatch(addLayer());
      this.store.dispatch(renameLayer(1, '#aaaaaa'));
      this.store.dispatch(addLines(linesToDraw));
      this.store.dispatch(commitTrackChanges());
      this.store.dispatch(revertTrackChanges());
      this.store.dispatch(setLayerEditable(1, false));
  }
}

function main () {
  const {
      React,
      store
  } = window;
  const c = React.createElement;

  class CrosswordModComponent extends React.Component {
      constructor (props) {
          super(props);

          this.state = {
              active: false,
              generating: false,
              words: []
          };

          this.maxWords = 5;

          this.mod = new CrosswordModHelper(store);
      }

      onActivate () {
          if (this.state.active) {
              this.setState({ active: false });
          } else {
              this.setState({ active: true });
          }
      }

      onGenerate () {
          if(this.state.words.length === 0) return;
          this.setState({ generating: true });
          this.mod.generate(this.state.words);
          this.setState({ generating: false });
      }

      onNewWord () {
          const { words } = this.state;
          words.push(['','']);
          this.setState({ words });
      }

      onRemoveWord (i) {
          const { words } = this.state;
          words.splice(i,1);
          this.setState({ words });
      }

      renderWordEntry (word, i) {
          return c(
              "div",
              { style: { display: 'flex', flexDirection: 'row' } },
              c("button", { style: {height: '4ex'}, onClick: () => this.onRemoveWord(i) }, "x"),
              c(
                  "input",
                  {
                      style: { width: '6em', height: '4ex' },
                      value: word[0],
                      onChange: (e) => {
                          if(!isAlpha(e.target.value)) return;
                          const { words } = this.state;
                          words[i] = [e.target.value, word[1]];
                          this.setState({ words });
                      }
                  },
              ),
              c(
                  "textArea",
                  {
                      style: { minWidth: '20%', width: '100%' },
                      value: word[1],
                      onChange: (e) => {
                          const { words } = this.state;
                          words[i] = [word[0], e.target.value];
                          this.setState({ words });
                      }
                  },
              )
          );
      }

      render () {
          return c(
              "div",
              null,
              this.state.active && c(
                  "div",
                  null,
                  c(
                      "div",
                      null,
                      this.state.words.map((word, i) => this.renderWordEntry(word, i)),
                      this.state.words.length < this.maxWords &&
                      c("button", { onClick: this.onNewWord.bind(this) }, "+")
                  ),
                  this.state.generating ? c(
                      "div",
                      null,
                      "Working..."
                  ) : c(
                      "button",
                      {
                          style: { float: "left" },
                          onClick: this.onGenerate.bind(this)
                      },
                      "Generate"
                  )
              ),
              c(
                  "button",
                  {
                      style: { backgroundColor: this.state.active ? "lightblue" : null },
                      onClick: this.onActivate.bind(this)
                  },
                  "Crossword Mod"
              )
          );
      }
  }

  window.registerCustomSetting(CrosswordModComponent);
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

function isAlpha(str) {
  if(!str) return true;
  for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      if (!(code > 64 && code < 91) &&
          !(code > 96 && code < 123)) {
          return false;
      }
  }
  return true;
};

function drawText(word, position, size) {
  const origin = getEditorPos(window.store.getState());
  return [];
}

function drawBoard(puzzle, cluesH, cluesV) {
  const origin = getEditorPos(window.store.getState());
  return [];
}

function generatePuzzle(words) {
  let M = 0;

  for(const word of words) {
      M += word[0].length;
  }

  const grid = [...Array(M)].map(e => Array(M).fill(''));
  const candidates = [(0,0)];

  while(words.length > 0) {
      const currentWord = words.shift();
  }

  const output = {matrix: grid, cluesH: [], cluesV: [], clueMarkersH: [], clueMarkersV: []};

  console.log(JSON.stringify(output));

  return output;
}
