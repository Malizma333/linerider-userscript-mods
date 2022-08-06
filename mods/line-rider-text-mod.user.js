// ==UserScript==

// @name         Line Rider Text Mod
// @author       Malizma
// @description  Adds the ability to generate text
// @version      1.0

// @namespace    http://tampermonkey.net/
// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:8000/*
// @grant        none

// ==/UserScript==

const updateLines = (linesToRemove, linesToAdd, name) => ({
  type: 'UPDATE_LINES',
  payload: { linesToRemove, linesToAdd },
  meta: { name: name }
})

const addLines = (line) => updateLines(null, line, 'ADD_LINES')

const commitTrackChanges = () => ({
  type: 'COMMIT_TRACK_CHANGES'
})

const revertTrackChanges = () => ({
  type: 'REVERT_TRACK_CHANGES'
})

const getSimulatorCommittedTrack = state => state.simulator.committedEngine

class TextMod {
  constructor (store, initState) {
    this.store = store
    this.state = initState

    this.changed = false

    this.track = this.store.getState().simulator.committedEngine

    store.subscribeImmediate(() => {
      this.onUpdate()
    })
  }

  commit() {
    if (this.changed) {
      this.store.dispatch(commitTrackChanges())
      this.store.dispatch(revertTrackChanges())
      this.changed = false
      return true
    }
  }

  onUpdate (nextState = this.state) {
    let shouldUpdate = false

    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false
    }

    if (this.state !== nextState) {
      this.state = nextState
      shouldUpdate = true
    }

    if (this.state.active) {
      const track = getSimulatorCommittedTrack(this.store.getState())

      if (this.track !== track) {
        this.track = track
        shouldUpdate = true
      }
    }

    if (shouldUpdate) {

      if (this.changed) {
        this.store.dispatch(revertTrackChanges())
        this.changed = false
      }

      if (this.state.active) {
        let myLines = []

        for (let { p1, p2 } of genLines(this.state)) {
          myLines.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            type: 2
          })
        }

        if (myLines.length > 0) {
          this.store.dispatch(addLines(myLines))
          this.changed = true
        }
      }
    }
  }
}

function main () {
  const {
    React,
    store
  } = window

  const create = React.createElement

  class TextModComponent extends React.Component {
    constructor (props) {
      super(props)

      this.state = {
        active: false,
        text: "",
        fontFile: null,
        fontName: ""
      }

      this.textMod = new TextMod(store, this.state)
    }

    componentWillUpdate (nextProps, nextState) {
      this.textMod.onUpdate(nextState)
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false })
        this.setState({ text: "" })
      } else {
        this.setState({ active: true })
      }
    }

    onFileChange() {
       return new Promise((resolve) => {
           const file = event.target.files[0];
           const fileReader = new FileReader();
           fileReader.fileName = event.target.files[0].name;
           fileReader.onloadend = (e) => {
               try {
                   const result = fileReader.result;
                   const jsonR = JSON.parse(result.toString());
                   jsonR.fileName = e.target.fileName;
                   resolve(jsonR);
               } catch(e) {
                   console.log("Error when parsing: Unsupported JSON format");
                   console.log(e);
               }
           }
           fileReader.readAsText(file, "UTF-8");
       });
    }

    onCommit () {
      const committed = this.textMod.commit();
      if (committed) {
        this.setState({ active: false });
        this.setState({ text: "" });
      }
    }

    render () {
      return create('div', null,
        this.state.active && create('div', null,
          create('div', null,
                  'Font: ',
                  create('input', {type: 'file',
                  onChange: create => this.onFileChange().then(result => {
                      result = normalizeLines(result);
                      this.setState({ fontFile : result });
                      this.setState({ fontName : result.fileName });
                      console.log("Loaded " + result.fileName + " successfully");
                  }).catch(err => {console.log("Error when parsing: Invalid font file"); console.log(err);})
              })
          ),
          this.state.fontFile != null && create('div', null, 'Loaded: ' + this.state.fontName),
          this.state.fontFile != null && create('div', null,
                 "Text: ",
                 create('textArea', { style: { width: '88%' }, type: 'text',
                 value: this.state.text,
                 onChange: create => this.setState({ text: create.target.value })
              })
          ),
          create('button', { style: { float: 'left' }, onClick: () => this.onCommit() },
            'Commit'
          )
        ),
        create('button',
          {
            style: {
              backgroundColor: this.state.active ? 'lightblue' : null
            },
            onClick: this.onActivate.bind(this)
          },
          'Text Mod'
        )
      )
    }
  }

  window.registerCustomSetting(TextModComponent)
}

if (window.registerCustomSetting) {
  main()
} else {
  const prevCb = window.onCustomToolsApiReady
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb()
    main()
  }
}

//function to generate text based on given font
function* genLines ({ text = "", fontFile = null } = {}) {
  //check if the font file is valid
  if(fontFile != null) {
      const { V2 } = window
      const camPos = window.store.getState().camera.editorPosition;
      const fontStyle = fontFile.style;

      var offset = V2.from(camPos.x, camPos.y);
      var spacing = 0;

      for(const c of text) {
          if(c == '\n') {
              offset = V2.from(camPos.x, offset.y + fontStyle.lineHeight);
              spacing = 0;
              continue;
          }

          offset.x += spacing;

          //skip characters not in the font
          if(!fontFile.hasOwnProperty(c)) continue;

          //check for custom y offsets of letters like p and q
          if(fontStyle.yOffset.hasOwnProperty(c)) {
              offset.y += fontStyle.yOffset[c];
          }

          spacing = fontFile[c].charWidth + fontStyle.spacing;

          for(const line of fontFile[c]) {
              yield {
                  p1: V2.from(line.x1 + offset.x, line.y1 + offset.y - fontFile[c].charHeight),
                  p2: V2.from(line.x2 + offset.x, line.y2 + offset.y - fontFile[c].charHeight)
              }
          }
      }
  }
}

//function to normalize each letter in a font
function normalizeLines(fontFile) {
    const { V2 } = window

    Object.entries(fontFile).forEach((entry) => {
        const [key, value] = entry;

        //continue on non-character keys
        if(key.length > 1) return;

        //finds local minimum of a letter
        const localMin = V2.from(value[0].x1,value[0].y1);
        const localMax = V2.from(value[0].x1,value[0].y1);

        for(const line of value) {
            if(localMin.x > line.x1) localMin.x = line.x1;
            if(localMin.x > line.x2) localMin.x = line.x2;
            if(localMin.y > line.y1) localMin.y = line.y1;
            if(localMin.y > line.y2) localMin.y = line.y2;

            if(localMax.x < line.x1) localMax.x = line.x1;
            if(localMax.x < line.x2) localMax.x = line.x2;
            if(localMax.y < line.y1) localMax.y = line.y1;
            if(localMax.y < line.y2) localMax.y = line.y2;
        }

        //adjusts each line based on local minimum
        for(var line of value) {
            line.x1 -= localMin.x;
            line.x2 -= localMin.x;
            line.y1 -= localMin.y;
            line.y2 -= localMin.y;
        }

        //store width and height properites of the letter
        fontFile[key].charWidth = localMax.x - localMin.x;
        fontFile[key].charHeight = localMax.y - localMin.y;
    });

    return fontFile;
}
