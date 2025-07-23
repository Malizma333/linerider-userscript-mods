/*
Userscript metadata block. Stores features of the userscript such as name, description, and version.

!Name - Name of userscript
Namespace - Namespace where userscript is defined, typically a URL
!Author - Creator of userscript
!Description - Short summary of userscript functionality
!Version - Userscript version that follows [semantic versioning](https://semver.org/)
Icon - Icon of userscript as it appears in the manager
?Match - Sites that should load this userscript
?Require - Libraries that this userscript should use
!Download URL - URL this userscript can be downloaded/updated from
!Homepage URL - URL this userscript originates from
!Support URL - URL that can be used to report userscript bugs
?Grant - Greasemonkey API functions this userscript can use

A "?" means this trait of the userscript data can be replaced or removed.
An "!" means this trait of the userscript data should be replaced.
*/

// ==UserScript==

// @name         Line Rider Example Mod
// @namespace    https://www.linerider.com/
// @author       Tobias Bessler
// @description  Linerider.com example mod
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/line-rider-example-mod-template.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/line-rider-example-mod-template.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

/* Actions */

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

/* Selectors */

const getSimulatorCommittedTrack = state => state.simulator.committedEngine;

const getEditorPosition = (state) => state.camera.editorPosition;

/**
 * @description
 * This is the class that stores all of the mod logic. It is responsible for reading changes in the
 * mod UI or other UI changes, and adjusting the state of the engine based on those UI changes.
 */
class ExampleMod {
  /**
   * @description
   * Initializes the state of the UI component, the state of the line rider engine, and engine
   * sub-states it needs to keep track of, as well as a helper value for whether the engine has been
   * changed by this mod.
   */
  constructor(store, initState) {
    // Initializing states to be tracked
    this.store = store;
    this.state = initState;
    this.track = getSimulatorCommittedTrack(store.getState());

    // Helper variable for tracking changes
    this.changed = false;

    // Called on incoming changes to the store
    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  /**
   * @description
   * Checks that the current mod has changes to make to the engine, and if so, it commits those
   * changes to the committed engine to be kept in change history.
   * @returns {bool} Whether changes were made
   */
  commit() {
    // Return if there aren't changes to be made
    if (!this.changed) return false;

    // Apply changes to the committed engine and revert them from the uncommitted engine
    this.store.dispatch(commitTrackChanges());
    this.store.dispatch(revertTrackChanges());
    this.changed = false;
    return true;
  }

  /**
   * @description
   * Looks at various conditions to see if the state of either the mod component or the engine has
   * changed, and if so applies the appropriate modifications to whatever the mod is generating. This
   * is where most of the logic will be for mod functionality.
   */
  onUpdate(nextState = this.state) {
    // Helper variable to check if the mod should update
    let shouldUpdate = false;

    // Sets the line preview mode to fast select
    if (!this.state.active && nextState.active) {
      window.previewLinesInFastSelect = true;
    }
    if (this.state.active && !nextState.active) {
      window.previewLinesInFastSelect = false;
    }

    // Checks whether the mod state itself has changed
    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    // Checks that the engine has changed, only if the mod is active
    if (this.state.active) {
      const track = getSimulatorCommittedTrack(this.store.getState());

      if (this.track !== track) {
        this.track = track;
        shouldUpdate = true;
      }
    }

    // Don't need to do anything if there aren't updates
    if (!shouldUpdate) return;

    // If changes have been made previously, discard them for the new changes incoming
    if (this.changed) {
      this.store.dispatch(revertTrackChanges());
      this.changed = false;
    }

    // If the mod isn't active, then no new changes are incoming and the previous changes have
    // already been discard, so the function is done
    if (!this.state.active) return;

    /* This is where the bulk of the mod logic lies, after condition checking is finished. */

    // Helper array to keep track of new lines to add
    const linesToAdd = [];

    // Pull new lines from a generator function that reads from the mod state values and push them
    // to the array of lines to add
    for (let { p1, p2 } of generateLines(this.state)) {
      linesToAdd.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        type: 2,
      });
    }

    // Add the new lines to the uncommitted engine if there's lines to be added
    if (linesToAdd.length > 0) {
      this.store.dispatch(addLines(linesToAdd));
      this.changed = true;
    }
  }
}

/**
 * @description
 * This function defines the mod's UI component to be rendered and registers it with the current mod
 * component loader. React is used to render the components and keep track of state changes.
 */
function main() {
  const {
    React,
    store,
  } = window;
  const c = React.createElement; // Shorthand

  /**
   * @description
   * This is the mod component itself. It renders the UI and keeps track of states that will be
   * changed by the user interacting with it.
   */
  class ExampleModComponent extends React.Component {
    constructor(props) {
      // Extend props to the base component definition
      super(props);

      // Keep track of state changes
      this.state = {
        active: false, // Important
        width: 0,
        xOff: 0,
        yOff: 0,
      };

      // Abstract the mod logic into a separately defined class
      this.modLogic = new ExampleMod(store, this.state);

      // Called on updates to the store
      store.subscribe(() => {
      });
    }

    /**
     * @description
     * Called when the state of the overall mod component changes and passes
     * those changes the the mod logic.
     */
    componentWillUpdate(nextProps, nextState) {
      this.modLogic.onUpdate(nextState);
    }

    /**
     * @description
     * Called when the mod is set to active or inactive, and applies changes to the state
     * in each case.
     */
    onActivate() {
      if (this.state.active) {
        // State is currently active
        this.setState({ active: false });
      } else {
        // State is currently inactive
        this.setState({ active: true });
      }
    }

    /**
     * @description
     * Called when the user wants to commit some changes to the engine and applies those changes
     * through the mod logic.
     */
    onCommit() {
      // Apply changes
      const committed = this.modLogic.commit();

      // Set inactive if changes were applied
      if (committed) {
        this.setState({ active: false });
      }
    }

    /**
     * @description
     * Template for rendering a slider component. This specific slider implementation creates a
     * slider along with a label and a number picker.
     * @param {string} key The name of the variable stored in this.state
     * @param {string} title Display name of the slider
     * @param {Object} props Functionality properties applied to each input element
     */
    renderSlider(key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloat(e.target.value) }),
      };

      return c(
        "div",
        null,
        title,
        c("input", { style: { width: "3em" }, type: "number", ...props }),
        c("input", { type: "range", ...props, onFocus: e => e.target.blur() }),
      );
    }

    /**
     * @description
     * This function renders the entire mod UI component within the mod loader container.
     */
    render() {
      return c(
        "div",
        null,
        this.state.active && c(
          "div",
          null,
          // Sliders to change the mod state
          this.renderSlider("width", "Width", { min: 0, max: 100, step: 1 }),
          this.renderSlider("xOff", "X Offset", { min: 0, max: 100, step: 1 }),
          this.renderSlider("yOff", "Y Offset", { min: 0, max: 100, step: 1 }),
          // Button to commit changes to the engine
          c("button", {
            style: { float: "left" },
            onClick: this.onCommit.bind(this),
          }, "Commit"),
        ),
        // Button to open and close the mod
        c("button", {
          style: { backgroundColor: this.state.active ? "lightblue" : null },
          onClick: this.onActivate.bind(this),
        }, "Example Mod"),
      );
    }
  }

  // Register the mod component with the active mod loader
  window.registerCustomSetting(ExampleModComponent);
}

// Waits for the mod loader to be registered, then registers this mod component
if (window.registerCustomSetting) {
  main();
} else {
  const prevCb = window.onCustomToolsApiReady;
  window.onCustomToolsApiReady = () => {
    if (prevCb) prevCb();
    main();
  };
}

/* This is where mod utility functions go */

/**
 * @description
 * Generator function that creates a square from a specified width and offset vector
 */
function* generateLines({ width = 0, xOff = 0, yOff = 0 } = {}) {
  // Uses the Vector2 window definition
  const { V2 } = window;

  // Retrieve camera position
  const camPos = getEditorPosition(window.store.getState());

  // Create points from state parameters
  const pointA = V2.from(xOff + camPos.x, yOff + camPos.y);
  const pointB = V2.from(xOff + camPos.x + width, yOff + camPos.y);
  const pointC = V2.from(xOff + camPos.x + width, yOff + camPos.y + width);
  const pointD = V2.from(xOff + camPos.x, yOff + camPos.y + width);

  // Yield each line connecting the points together
  yield { p1: pointA, p2: pointB };
  yield { p1: pointB, p2: pointC };
  yield { p1: pointC, p2: pointD };
  yield { p1: pointD, p2: pointA };
}
