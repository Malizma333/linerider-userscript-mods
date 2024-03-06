// ==UserScript==

// @name         _
// @namespace    https://www.linerider.com/
// @author       _
// @description  _
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  _
// @updateURL    _
// @homepageURL  _
// @supportURL   _
// @grant        none

// ==/UserScript==

/* global Actions, Selectors */

class EmptyMod {
  constructor (store, initState) {
    this.store = store;
    this.state = initState;

    /* Substate Variables */

    this.changed = false;

    store.subscribeImmediate(() => {
      this.onUpdate();
    });
  }

  commit () {
    if (!this.changed) return false;

    this.store.dispatch(Actions.commitTrackChanges());
    this.store.dispatch(Actions.revertTrackChanges());
    this.changed = false;
    return true;
  }

  onUpdate (nextState = this.state) {
    let shouldUpdate = false;

    if (this.state !== nextState) {
      this.state = nextState;
      shouldUpdate = true;
    }

    if (this.state.active) {
      /* Check State Changes */
    }

    if (!shouldUpdate) return;

    if (this.changed) {
      this.store.dispatch(Actions.revertTrackChanges());
      this.changed = false;
    }

    if (!this.state.active) return;

    /* Apply Changes */

    this.changed = true;
  }
}

function main () {
  const {
    React,
    store
  } = window;
  const c = React.createElement;

  class EmptyModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false
        /* State Props */
      };

      this.modLogic = new EmptyMod(store, this.state);

      store.subscribe(() => {

      });
    }

    componentWillUpdate (nextProps, nextState) {
      this.modLogic.onUpdate(nextState);
    }

    onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        this.setState({ active: true });
      }
    }

    onCommit () {
      const committed = this.modLogic.commit();

      if (committed) {
        this.setState({ active: false });
      }
    }

    render () {
      return c("div", null,
        this.state.active && c("div", null,
          /* Mod UI */
          c("button",
            {
              style: { float: "left" },
              onClick: this.onCommit.bind(this)
            },
            "Commit"
          )
        ),
        c("button",
          {
            style: { backgroundColor: this.state.active ? "lightblue" : null },
            onClick: this.onActivate.bind(this)
          },
          "Empty Mod"
        )
      );
    }
  }

  window.registerCustomSetting(EmptyModComponent);
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

/* Utility Functions */
