// ==UserScript==

// @name         Hotkey Mod
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Allows changing the default hotkeys
// @version      1.1.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-hotkey-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-hotkey-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const DEFAULT_KEYBINDS = {
  "modifiers.select.singlePoint": {
    "name": "Select Single Point",
    "tooltip": "When selecting, only selects individual nodes",
    "tag": "Modifiers",
    "key": [ "alt" ]
  },
  "modifiers.select.transformState": {
    "name": "Select Transform State",
    "tooltip": "Transforms a selection to a different state",
    "tag": "Modifiers",
    "key": [ "alt" ]
  },
  "modifiers.angleLock": {
    "name": "Angle Lock",
    "tooltip": "Locks the angle when dragging a line node",
    "tag": "Modifiers",
    "key": [ "a" ]
  },
  "modifiers.angleSnap": {
    "name": "Angle Snap",
    "tooltip": "Snaps the angle of a line to 15°",
    "tag": "Modifiers",
    "key": [ "ctrl" ]
  },
  "modifiers.disablePointSnap": {
    "name": "Disable Point Snap",
    "tooltip": "Disables snapping line nodes to other nodes",
    "tag": "Modifiers",
    "key": [ "alt" ]
  },
  "modifiers.flipLine": {
    "name": "Flip Line",
    "tooltip": "Flips lines when drawing them",
    "tag": "Modifiers",
    "key": [ "shift" ]
  },
  "modifiers.forceZoom": {
    "name": "Force Zoom",
    "tooltip": "Forces zoom to override panning",
    "tag": "Modifiers",
    "key": [ "ctrl" ]
  },
  "modifiers.lockEditorCamera": {
    "name": "Lock Editor Camera",
    "tooltip": "Locks the camera in place when using timeline controls",
    "tag": "Modifiers",
    "key": [ "shift" ]
  },
  "modifiers.fastForward": {
    "name": "Fast Forward",
    "tooltip": "Fast forward the timeline",
    "tag": "Modifiers",
    "key": [ "." ]
  },
  "modifiers.rewind": {
    "name": "Rewind",
    "tooltip": "Rewind the timeline",
    "tag": "Modifiers",
    "key": [ "," ]
  },
  "modifiers.select.add": {
    "name": "Add to Selection",
    "tooltip": "Add lines to a selection",
    "tag": "Modifiers",
    "key": [ "shift" ]
  },
  "modifiers.select.subtract": {
    "name": "Subtract from Selection",
    "tooltip": "Remove lines from a selection",
    "tag": "Modifiers",
    "key": [ "ctrl" ]
  },
  "modifiers.select.fineNudge": {
    "name": "Select Fine Nudge",
    "tooltip": "Nudge a selection with precision",
    "tag": "Modifiers",
    "key": [ "shift" ]
  },
  "triggers.pencilTool": {
    "name": "Pencil Tool",
    "tooltip": "Switch active tool to pencil tool",
    "tag": "Tools",
    "key": [ "q" ]
  },
  "triggers.lineTool": {
    "name": "Line Tool",
    "tooltip": "Switch active tool to line tool",
    "tag": "Tools",
    "key": [ "w" ]
  },
  "triggers.eraserTool": {
    "name": "Eraser Tool",
    "tooltip": "Switch active tool to eraser tool",
    "tag": "Tools",
    "key": [ "e" ]
  },
  "triggers.selectTool": {
    "name": "Select Tool",
    "tooltip": "Switch active tool to select tool",
    "tag": "Tools",
    "key": [ "s" ]
  },
  "triggers.panTool": {
    "name": "Pan Tool",
    "tooltip": "Switch active tool to pan tool",
    "tag": "Tools",
    "key": [ "r" ]
  },
  "triggers.zoomTool": {
    "name": "Zoom Tool",
    "tooltip": "Switch active tool to zoom tool",
    "tag": "Tools",
    "key": [ "t" ]
  },
  "triggers.normalSwatch": {
    "name": "Blue Swatch",
    "tooltip": "Switch active line color to blue",
    "tag": "Tools",
    "key": [ "1" ]
  },
  "triggers.accelSwatch": {
    "name": "Red Swatch",
    "tooltip": "Switch active line color to red",
    "tag": "Tools",
    "key": [ "2" ]
  },
  "triggers.scenerySwatch": {
    "name": "Green Swatch",
    "tooltip": "Switch active line color to green",
    "tag": "Tools",
    "key": [ "3" ]
  },
  "triggers.save": {
    "name": "Save",
    "tooltip": "Save the current track",
    "tag": "Tools",
    "key": [ "ctrl", "s" ]
  },
  "triggers.open": {
    "name": "Load",
    "tooltip": "Load a new track",
    "tag": "Tools",
    "key": [ "ctrl", "o" ]
  },
  "triggers.nextFrame": {
    "name": "Next Frame",
    "tooltip": "Go to the next frame on the timeline",
    "tag": "Timeline",
    "key": [ "right" ]
  },
  "triggers.prevFrame": {
    "name": "Previous Frame",
    "tooltip": "Go to the previous frame on the timeline",
    "tag": "Timeline",
    "key": [ "left" ]
  },
  "triggers.play": {
    "name": "Play",
    "tooltip": "Play the track",
    "tag": "Timeline",
    "key": [ "y" ]
  },
  "triggers.playPause": {
    "name": "Play/Pause",
    "tooltip": "Play or pause the track",
    "tag": "Timeline",
    "key": [ "space" ]
  },
  "triggers.stop": {
    "name": "Stop",
    "tooltip": "Stop and restart the track",
    "tag": "Timeline",
    "key": [ "u" ]
  },
  "triggers.goToStart": {
    "name": "Go To Start",
    "tooltip": "Move the camera to the start",
    "tag": "Timeline",
    "key": [ "h" ]
  },
  "triggers.flag": {
    "name": "Flag",
    "tooltip": "Flag the current position on the timeline",
    "tag": "Timeline",
    "key": [ "i" ]
  },
  "triggers.removeLastLine": {
    "name": "Remove Last Line",
    "tooltip": "Remove the last placed line",
    "tag": "Selection",
    "key": [ "backspace" ]
  },
  "triggers.undo": {
    "name": "Undo",
    "tooltip": "Undo the last action",
    "tag": "Selection",
    "key": [ "ctrl", "z" ]
  },
  "triggers.redo": {
    "name": "Redo",
    "tooltip": "Redo the last undo action",
    "tag": "Selection",
    "key": [ "ctrl", "shift", "z" ]
  },
  "triggers.select.deselect": {
    "name": "Select Deselect",
    "tooltip": "Deselect the current selection",
    "tag": "Selection",
    "key": [ "escape" ]
  },
  "triggers.select.duplicate": {
    "name": "Select Duplicate",
    "tooltip": "Duplicate the current selection",
    "tag": "Selection",
    "key": [ "ctrl", "d" ]
  },
  "triggers.select.moveDown": {
    "name": "Select Move Down",
    "tooltip": "Nudge the current selection down",
    "tag": "Selection",
    "key": [ "s" ]
  },
  "triggers.select.moveLeft": {
    "name": "Select Move Left",
    "tooltip": "Nudge the current selection left",
    "tag": "Selection",
    "key": [ "a" ]
  },
  "triggers.select.moveRight": {
    "name": "Select Move Right",
    "tooltip": "Nudge the current selection right",
    "tag": "Selection",
    "key": [ "d" ]
  },
  "triggers.select.moveUp": {
    "name": "Select Move Up",
    "tooltip": "Nudge the current selection up",
    "tag": "Selection",
    "key": [ "w" ]
  },
  "triggers.select.reverseLine": {
    "name": "Select Reverse Line",
    "tooltip": "Reverse all lines in the current selection",
    "tag": "Selection",
    "key": [ "f" ]
  },
  "triggers.select.copy": {
    "name": "Copy",
    "tooltip": "Copy the current selection",
    "tag": "Selection",
    "key": [ "ctrl", "c" ]
  },
  "triggers.select.paste": {
    "name": "Paste",
    "tooltip": "Paste the current selection",
    "tag": "Selection",
    "key": [ "ctrl", "v" ]
  },
  "triggers.select.clipboard.copy": {
    "name": "Clipboard Copy",
    "tooltip": "Copy the current selection",
    "tag": "Selection",
    "key": [ "ctrl", "shift", "c" ]
  },
  "triggers.select.clipboard.paste": {
    "name": "Clipboard Paste",
    "tooltip": "Paste the current selection",
    "tag": "Selection",
    "key": [ "ctrl", "shift", "v" ]
  },
  "triggers.select.delete": {
    "name": "Delete",
    "tooltip": "Delete the current selection",
    "tag": "Selection",
    "key": [ "delete" ]
  }
};

const setCommandHotkeys = (commandHotkeys) => ({
  type: "SET_COMMAND_HOTKEYS",
  payload: commandHotkeys
});

function main () {
  const {
    React,
    store
  } = window;

  const create = React.createElement;

  const tooltipStyle = {
    backgroundColor: "#eeeeee",
    border: "1px solid black",
    borderRadius: "4px",
    fontSize: "12px",
    padding: "0 5px 0 5px",
    position: "absolute",
    pointerEvents: "none",
    textAlign: "center",
    width: "200px"
  };

  const toolMarkerStyle = {
    backgroundColor: "#dddddd",
    border: "1px solid black",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    height: "15px",
    minHeight: "15px",
    minWidth: "15px",
    textAlign: "center",
    marginRight: "5px",
    width: "15px"
  };

  const labelStyle = {
    marginRight: "10px",
    padding: "0 5px 0 5px",
    whiteSpace: "nowrap"
  };

  const tagColors = {
    "Modifiers": "#ffe7e3",
    "Tools": "#ffffe3",
    "Timeline": "#e3ffe6",
    "Selection": "#e3f4ff"
  };

  const IS_MAC = `${window.navigator.platform}`.toLowerCase().includes("mac");

  class HotkeyModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        keyCombination: "",
        activeTooltip: null,
        keybinds: JSON.parse(JSON.stringify(DEFAULT_KEYBINDS))
      };

      let keyPrefs = localStorage.getItem("KEYBINDS");

      if (keyPrefs) {
        this.setState({ keybinds: JSON.parse(keyPrefs) });
      }
    }

    componentDidMount () {
      if (IS_MAC) {
        this.setState({ keybinds: this.replaceCTRL() }, this.mapAllKeys());
      } else {
        this.mapAllKeys();
      }
    }

    componentWillUpdate (nextProps, nextState) {
      localStorage.setItem("KEYBINDS", JSON.stringify(nextState.keybinds));
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    onRestoreDefaults () {
      const confirm = window.confirm("Are you sure you want to restore all defaults?");
      if (confirm) {
        this.setState({
          keybinds: JSON.parse(JSON.stringify(DEFAULT_KEYBINDS))
        }, () => this.mapAllKeys());
        this.setState({ active: false });
      }
    }

    replaceCTRL () {
      const keybinds = this.state.keybinds;
      Object.keys(keybinds).map((e) => {
        const index = keybinds[e].key.indexOf("ctrl");
        if (index !== -1) {
          keybinds[e].key[index] = "cmd";
        }
      });
      return keybinds;
    }

    mapAllKeys () {
      Object.keys(this.state.keybinds).map((e) => {
        store.dispatch(setCommandHotkeys({
          [e]: this.state.keybinds[e].key.join("+").toLowerCase()
        }));
      });
    }

    renderKeyConfig (id, props) {
      const keybind = props.key.join(" + ").toUpperCase();

      return create("div", { style: { display: "flex" } },
        create("span", {
          style: toolMarkerStyle,
          onMouseEnter: (e) => this.handleMouseEnter(e, id),
          onMouseLeave: (e) => this.handleMouseLeave(e)
        }, "?"),
        this.state.activeTooltip === id && create("div", { style: { position: "relative" } },
          create("div", { style: tooltipStyle },
            create("span", null, `${props.tooltip}`)
          )),
        create("span", { style: {
          ...labelStyle,
          backgroundColor: props.tag ?
            tagColors[props.tag] : "#ffffff"
        } }, `${props.name}`),
        create("input", {
          style: { cursor: "pointer", fontSize: "14px", width: "100%" },
          type: "text",
          onKeyDown: (e) => this.handleKeyDown(e, id),
          onBlur: (e) => this.handleBlur(e, keybind),
          onFocus: (e) => this.handleFocus(e),
          placeholder: "Press ESC to cancel",
          defaultValue: keybind,
          readOnly: true
        }));
    }

    handleMouseEnter (e, tooltipId) {
      this.setState({ activeTooltip: tooltipId });
    }

    handleMouseLeave () {
      this.setState({ activeTooltip: null });
    }

    // TODO: Manage key conflicts
    handleKeyDown (e, keyID) {
      e.preventDefault();
      const key = e.key;

      if (key === "Enter") {
        e.target.blur();

        if (this.state.keyCombination === "") return;

        // const confirm = window.confirm('Conflict');
        // if (!confirm) return;

        e.target.value = this.state.keyCombination.join(" + ").toUpperCase();

        const keybinds = this.state.keybinds;
        keybinds[keyID].key = this.state.keyCombination;
        this.setState({ keybinds });

        store.dispatch(setCommandHotkeys({
          [keyID]: this.state.keyCombination.join("+").toLowerCase()
        }));

        return;
      } else if (key === "Escape") {
        e.target.blur();
        return;
      }

      const modifiers = [];

      if (e.ctrlKey) modifiers.push("Ctrl");
      if (e.shiftKey) modifiers.push("Shift");
      if (e.altKey) modifiers.push("Alt");
      if (e.metaKey) modifiers.push("Cmd");

      let keyCombination = [ ...modifiers ];

      if (key === "Control") {
        if (!modifiers.includes("Ctrl")) {
          keyCombination.push("Ctrl");
        }
      } else if (!modifiers.includes(key)) {
        if (key === " ") {
          keyCombination.push("Space");
        } else {
          keyCombination.push(key);
        }
      }

      this.setState({ keyCombination });
      e.target.value = keyCombination.join(" + ").toUpperCase();
    }

    handleFocus (e) {
      e.target.value = this.state.keyCombination;
    }

    handleBlur (e, keybind) {
      e.target.value = keybind;
      this.setState({ keyCombination: "" });
    }

    render () {
      return create("div", null,
        this.state.active && create("div", null,
          Object.keys(tagColors).map((id) => {
            return create("span", { style: {
              backgroundColor: tagColors[id],
              border: "1px solid black",
              marginRight: "10px"
            } }, id);
          }),
          create("div", { style: {
            maxHeight: "100px",
            overflowY: "auto",
            marginTop: "10px"
          } },
          Object.keys(this.state.keybinds).map((id) => {
            return this.renderKeyConfig(id, this.state.keybinds[id]);
          })
          )
        ),
        this.state.active && create("button", { style: { float: "left" }, onClick: () => this.onRestoreDefaults() },
          "Restore Defaults"
        ),
        create("button",
          {
            style: {
              backgroundColor: this.state.active ? "lightblue" : null
            },
            onClick: this.onActivate.bind(this)
          },
          "Hotkey Mod"
        )
      );
    }
  }

  window.registerCustomSetting(HotkeyModComponent);
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
