// ==UserScript==

// @name         Bookmark Mod
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Allows you to make bookmarks that act similar to flags but there's multiple
// @version      1.1.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-bookmark-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-bookmark-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const DEFAULT_STATE = [[0,0,0,'']];

function main () {
  const {
    React,
    store
  } = window;
  const c = React.createElement;

  class BookmarkModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        active: false,
        timestamps: JSON.parse(JSON.stringify(DEFAULT_STATE))
      };
    }

    async onRegisterTimestamps() {
      try {
        const timestamps = JSON.parse(window.localStorage.getItem('BOOKMARK_MOD_TIMESTAMPS'));
        if(timestamps && timestamps.length) {
          this.setState({ timestamps });
        } else {
          this.setState({ timestamps: JSON.parse(JSON.stringify(DEFAULT_STATE)) })
        }
      } catch(e) {
        this.setState({ timestamps: JSON.parse(JSON.stringify(DEFAULT_STATE)) })
      }
    }

    async onActivate () {
      if (this.state.active) {
        this.setState({ active: false });
      } else {
        await this.onRegisterTimestamps();
        this.setState({ active: true });
      }
    }

    componentWillUpdate(nextProps, nextState) {
      if(!nextState.timestamps) return;
      window.localStorage.setItem('BOOKMARK_MOD_TIMESTAMPS', JSON.stringify(nextState.timestamps));
    }

    renderNumberPicker (index, key, constraints) {
      const props = {
        type: "text",
        inputmode: "numeric",
        value: this.state.timestamps[index][key],
        onChange: e => {
          const timestamps = this.state.timestamps;
          timestamps[index][key] = Math.max(constraints.min, Math.min(constraints.max, parseInt(e.target.value)));
          this.setState({ timestamps });
        }
      };

      return c("div", null,
        c("input", { style: { width: "2em" }, ...props })
      );
    }

    renderTimeStamp (index) {
      return c('div', null,
        c("input", {
          type: 'text',
          value: this.state.timestamps[index][3],
          onChange: (e) => {
            const timestamps = this.state.timestamps;
            timestamps[index][3] = e.target.value;
            this.setState({ timestamps })
          }
        }),
        c('div', {style: {display: 'flex', flexDirection: 'row'}},
        c("button", {
        onClick: () => {
          const targetTimestamp = this.state.timestamps[index];
          const targetFrame = targetTimestamp[0] * 2400 + targetTimestamp[1] * 40 + targetTimestamp[2];
          store.dispatch({ type: "SET_PLAYER_INDEX", payload: targetFrame });
        }}, ">"),
        this.renderNumberPicker(index, 0, { min: 0, max: 59 }), ':',
        this.renderNumberPicker(index, 1, { min: 0, max: 59 }), ':',
        this.renderNumberPicker(index, 2, { min: 0, max: 39 }),
        c("button", {
        onClick: () => {
          if(!window.confirm("Remove bookmark?")) return;
          const timestamps = this.state.timestamps;
          timestamps.splice(index, 1);
          this.setState({ timestamps });
        }}, "-")
       )
      )
    }

    render () {
      return c("div", null,
        this.state.active && c("div", null,
          this.state.timestamps.map((timestamp, index) => {
            return c('div', {key: index}, this.renderTimeStamp(index))
          }),
          c("button", {
            onClick: () => {
              const timestamps = this.state.timestamps;
              const currentTime = store.getState().player.index;
              const currentTimestamp = [
                Math.floor(currentTime / 2400),
                Math.floor((currentTime % 2400) / 40),
                Math.floor(currentTime % 40)
              ]
              timestamps.push(currentTimestamp)
              this.setState({ timestamps })
            }}, "+"),
           c("button", {
            onClick: () => {
              if(!window.confirm("Remove all bookmarks?")) return;
              this.setState({ timestamps: [] })
            }}, "X")
        ),
        c("button",
          {
            style: { backgroundColor: this.state.active ? "lightblue" : null },
            onClick: this.onActivate.bind(this)
          },
          "Bookmark Mod"
        )
      );
    }
  }

  window.registerCustomSetting(BookmarkModComponent);
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
