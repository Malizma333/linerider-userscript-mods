// ==UserScript==

// @name         Car Mode
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Mod to add UI to car mode and edit settings
// @version      1.0.0
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-car-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-car-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

const CarMod = (function() {
  let init = false;
  let USER_PARAMS = {
    // Preferences
    ENABLED: false,
    CAR_COLOR: "#ff0000", // Color of the car
    TRAIL_ENABLED: true, // Whether the trail is enabled
    // Zoom
    INIT_ZOOM: 3.5,
    MIN_ZOOM: 0,
    MAX_ZOOM: 5,
    ZOOM_CHANGE: 0.1,
    // Moving
    INIT_SPEED: 0,
    MIN_SPEED: 0,
    MAX_SPEED: 25,
    ACCELERATION: 0.125,
    DECELERATION: 0.5,
    // Turning
    INIT_DIRECTION: 0,
    DIRECTION_CHANGE: 10,
    // Drift
    INIT_ROTATION: 0,
    MIN_ROTATION: -20,
    MAX_ROTATION: 20,
    ROTATION_CHANGE: 10,
    // Keybindings
    SPEED_UP_KEY: 'w',
    SPEED_DOWN_KEY: 's',
    TURN_LEFT_KEY: 'a',
    TURN_RIGHT_KEY: 'd',
    ROTATE_LEFT_KEY: 'ArrowLeft',
    ROTATE_RIGHT_KEY: 'ArrowRight',
    ZOOM_IN_KEY: 'ArrowUp',
    ZOOM_OUT_KEY: 'ArrowDown',
    // Keyframes
    KEYFRAMES_ENABLED: false,
    KEYFRAME_ARRAY: [
      [0, {'w': 1}],
      [40, {}],
      [80, {'a': 1}],
      [120, {}]
    ]
  }

  const ONE_DEGREE = 0.0174532925;
  const ORIGIN_INDEX = 6;

  const CONTROLS = {
    SPEED_UP: {KEY: USER_PARAMS.SPEED_UP_KEY, state: 0},
    SPEED_DOWN: {KEY: USER_PARAMS.SPEED_DOWN_KEY, state: 0},
    TURN_LEFT: {KEY: USER_PARAMS.TURN_LEFT_KEY, state: 0},
    TURN_RIGHT: {KEY: USER_PARAMS.TURN_RIGHT_KEY, state: 0},
    ROTATE_LEFT: {KEY: USER_PARAMS.ROTATE_LEFT_KEY, state: 0},
    ROTATE_RIGHT: {KEY: USER_PARAMS.ROTATE_RIGHT_KEY, state: 0},
    ZOOM_IN: {KEY: USER_PARAMS.ZOOM_IN_KEY, state: 0},
    ZOOM_OUT: {KEY: USER_PARAMS.ZOOM_OUT_KEY, state: 0}
  };

  const MOVE_STATE = {
    zoom: USER_PARAMS.INIT_ZOOM,
    speed: USER_PARAMS.INIT_SPEED,
    base_rotation: USER_PARAMS.INIT_ROTATION * ONE_DEGREE,
    turn: USER_PARAMS.INIT_DIRECTION * ONE_DEGREE,
    previousRotation: 0,
    offset_rotation: 0
  };

  const GRAVITY_PROPS = {
    DEFAULT: {x:0, y:0.175},
    ZERO: {x:0, y:0},
    currentPointIndex: -1,
    currentKeyframeIndex: -1,
    playerWasRunning: false
  }

  function subscribe(
    store = window.store,
    select = (state) => state,
    notify = () => {}
  ) {
    let state;

    function subscription() {
      const update = select(store.getState());
      if (update !== state) {
        state = update;
        notify(state);
      }
    }

    const unsubscribe = store.subscribe(subscription);
    subscription();
    return unsubscribe;
  }

  function reset() {
    window.store.dispatch({ type: "SET_PLAYER_STOP_AT_END", payload: false });
    window.store.dispatch({ type: "SET_PLAYER_MAX_INDEX", payload: 0 });
    window.store.getState().simulator.engine.engine._computed._frames.length = 1;
    CONTROLS.SPEED_UP.state = 0;
    CONTROLS.SPEED_DOWN.state = 0;
    CONTROLS.TURN_LEFT.state = 0;
    CONTROLS.TURN_RIGHT.state = 0;
    CONTROLS.ROTATE_LEFT.state = 0;
    CONTROLS.ROTATE_RIGHT.state = 0;
    CONTROLS.ZOOM_IN.state = 0;
    CONTROLS.ZOOM_OUT.state = 0;
    MOVE_STATE.zoom = USER_PARAMS.INIT_ZOOM;
    MOVE_STATE.speed = USER_PARAMS.INIT_SPEED;
    MOVE_STATE.base_rotation = USER_PARAMS.INIT_ROTATION * ONE_DEGREE;
    MOVE_STATE.turn = USER_PARAMS.INIT_DIRECTION * ONE_DEGREE;
    MOVE_STATE.previousRotation = 0;
    MOVE_STATE.offset_rotation = 0;
    GRAVITY_PROPS.currentPointIndex = -1;
    GRAVITY_PROPS.currentKeyframeIndex = -1;
    setCustomRiders([`
      .flag{opacity:0;}.skin{opacity:0;}.hair{opacity:0;}.fill{opacity:0;}#eye{opacity:0;}#string{opacity:0;}
      .hat{opacity:0}.arm{opacity:0;}.leg{opacity:0;}.sled{opacity:0;}.scarfEven{opacity:0;}.scarfOdd{opacity:0;}
      .torso{fill:${USER_PARAMS.CAR_COLOR};stroke-width:0;transform:translate(3.2px,0px)scale(0.6,1.7);rx:1.5}
      .scarf1{opacity:1;rx:0.3;fill:cyan;transform:translate(-0.75px,0.5px);}
      .scarf2{opacity:1;fill:black;transform:translate(-0.75px,0.5px)scale(1,0.1);}
      .scarf3{opacity:1;fill:black;transform:translate(-0.75px,0.2px)scale(1,0.1);}
      .scarf4{opacity:1;fill:black;transform:translate(-0.75px,-0.1px)scale(1,0.1);}
      .scarf5{opacity:1;rx:0.3;fill:cyan;transform:translate(-0.75px,-1px)scale(1,0.8);}
      #scarf1{opacity:1;rx:1;fill:black;width:1px;transform:translate(3px,-17.5px);}
      #scarf2{opacity:1;rx:1;fill:black;width:1px;transform:translate(2px,-27.5px);}
      #scarf3{opacity:1;rx:1;fill:black;width:1px;transform:translate(3px,-27.5px);}
      #scarf4{opacity:1;rx:1;fill:black;width:1px;transform:translate(2px,-27.5px);}
      #scarf5{opacity:0;}
    `]);
  }

  function disable(store) {
    USER_PARAMS.ENABLED = false;
    store.dispatch({ type: "SET_PLAYER_STOP_AT_END", payload: false });
    store.dispatch({ type: "SET_PLAYER_MAX_INDEX", payload: 0 });
    store.getState().simulator.engine.engine._computed._frames.length = 1;
    setCustomRiders(setCustomRiders.default);
    Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get() { return GRAVITY_PROPS.DEFAULT; }});
  }

  function enable(store) {
    USER_PARAMS.ENABLED = true;

    reset();

    Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get() { try {
      GRAVITY_PROPS.currentPointIndex = (GRAVITY_PROPS.currentPointIndex + 1) % 17;

      const FRAMES = store.getState().simulator.engine.engine._computed._frames;
      const RIDER_POINTS = FRAMES[FRAMES.length-1].snapshot.entities[0].entities[0].points;
      const CURRENT_POINT = RIDER_POINTS[GRAVITY_PROPS.currentPointIndex];

      if(USER_PARAMS.KEYFRAMES_ENABLED) {
        if(GRAVITY_PROPS.currentKeyframeIndex + 1 < USER_PARAMS.KEYFRAME_ARRAY.length &&
          FRAMES.length >= USER_PARAMS.KEYFRAME_ARRAY[GRAVITY_PROPS.currentKeyframeIndex + 1][0]) {
          GRAVITY_PROPS.currentKeyframeIndex++;
        }
        const CURRENT_KEYFRAME = USER_PARAMS.KEYFRAME_ARRAY[GRAVITY_PROPS.currentKeyframeIndex][1];
        CONTROLS.SPEED_UP.state = CURRENT_KEYFRAME[CONTROLS.SPEED_UP.KEY] ? 1 : 0;
        CONTROLS.SPEED_DOWN.state = CURRENT_KEYFRAME[CONTROLS.SPEED_DOWN.KEY] ? 1 : 0;
        CONTROLS.TURN_LEFT.state = CURRENT_KEYFRAME[CONTROLS.TURN_LEFT.KEY] ? 1 : 0;
        CONTROLS.TURN_RIGHT.state = CURRENT_KEYFRAME[CONTROLS.TURN_RIGHT.KEY] ? 1 : 0;
        CONTROLS.ROTATE_LEFT.state = CURRENT_KEYFRAME[CONTROLS.ROTATE_LEFT.KEY] ? 1 : 0;
        CONTROLS.ROTATE_RIGHT.state = CURRENT_KEYFRAME[CONTROLS.ROTATE_RIGHT.KEY] ? 1 : 0;
        CONTROLS.ZOOM_IN.state = CURRENT_KEYFRAME[CONTROLS.ZOOM_IN.KEY] ? 1 : 0;
        CONTROLS.ZOOM_OUT.state = CURRENT_KEYFRAME[CONTROLS.ZOOM_OUT.KEY] ? 1 : 0;
      }

      if(CURRENT_POINT.type === 'FlutterPoint') return GRAVITY_PROPS.DEFAULT;

      if(GRAVITY_PROPS.currentPointIndex === 0) {
        const HYPOTONUSE = Math.hypot(CURRENT_POINT.vel.x, CURRENT_POINT.vel.y);
        const PERP_ANGLE = Math.atan2(CURRENT_POINT.vel.y, CURRENT_POINT.vel.x) + Math.PI / 2;
        const NORMAL_VELOCITY = {
          x: CURRENT_POINT.vel.x / HYPOTONUSE,
          y: CURRENT_POINT.vel.y / HYPOTONUSE
        }
        const TRAIL_A = {
          x1: CURRENT_POINT.pos.x - 7 * Math.cos(PERP_ANGLE) + 2 * NORMAL_VELOCITY.x,
          y1: CURRENT_POINT.pos.y - 7 * Math.sin(PERP_ANGLE) + 2 * NORMAL_VELOCITY.y,
          x2: CURRENT_POINT.pos.x - 7 * Math.cos(PERP_ANGLE),
          y2: CURRENT_POINT.pos.y - 7 * Math.sin(PERP_ANGLE)
        }
        const TRAIL_B = {
          x1: CURRENT_POINT.pos.x - 3.25 * Math.cos(PERP_ANGLE) + 2 * NORMAL_VELOCITY.x,
          y1: CURRENT_POINT.pos.y - 3.25 * Math.sin(PERP_ANGLE) + 2 * NORMAL_VELOCITY.y,
          x2: CURRENT_POINT.pos.x - 3.25 * Math.cos(PERP_ANGLE),
          y2: CURRENT_POINT.pos.y - 3.25 * Math.sin(PERP_ANGLE)
        }

        if(USER_PARAMS.TRAIL_ENABLED) {
          store.dispatch({
            type: "UPDATE_LINES",
            payload: { linesToAdd: [{...TRAIL_A, type: 2}, {...TRAIL_B, type: 2}], initialLoad: false },
            meta: { name: "ADD_LINES" }
          });
        }

        MOVE_STATE.previousRotation = MOVE_STATE.base_rotation + MOVE_STATE.offset_rotation;

        if(CONTROLS.SPEED_UP.state === 1) {
          MOVE_STATE.speed = Math.min(
            USER_PARAMS.MAX_SPEED, MOVE_STATE.speed + USER_PARAMS.ACCELERATION
          );
        }
        if(CONTROLS.SPEED_DOWN.state === 1) {
          MOVE_STATE.speed = Math.max(
            USER_PARAMS.MIN_SPEED, MOVE_STATE.speed - USER_PARAMS.DECELERATION
          );
        }
        if(CONTROLS.TURN_RIGHT.state === 1) {
          MOVE_STATE.base_rotation += USER_PARAMS.ROTATION_CHANGE * ONE_DEGREE;
          MOVE_STATE.turn += USER_PARAMS.DIRECTION_CHANGE * ONE_DEGREE;
        }
        if(CONTROLS.TURN_LEFT.state === 1) {
          MOVE_STATE.base_rotation -= USER_PARAMS.ROTATION_CHANGE * ONE_DEGREE;
          MOVE_STATE.turn -= USER_PARAMS.DIRECTION_CHANGE * ONE_DEGREE;
        }
        if(CONTROLS.ROTATE_RIGHT.state === 1) {
          MOVE_STATE.offset_rotation = Math.min(
            USER_PARAMS.MAX_ROTATION * ONE_DEGREE, MOVE_STATE.offset_rotation + USER_PARAMS.ROTATION_CHANGE * ONE_DEGREE
          );
        }
        if(CONTROLS.ROTATE_LEFT.state === 1) {
          MOVE_STATE.offset_rotation = Math.max(
            USER_PARAMS.MIN_ROTATION * ONE_DEGREE, MOVE_STATE.offset_rotation - USER_PARAMS.ROTATION_CHANGE * ONE_DEGREE
          );
        }
        if(CONTROLS.ZOOM_IN.state === 1) {
          MOVE_STATE.zoom = Math.min(
            USER_PARAMS.MAX_ZOOM, MOVE_STATE.zoom + USER_PARAMS.ZOOM_CHANGE
          );
        }
        if(CONTROLS.ZOOM_OUT.state === 1) {
          MOVE_STATE.zoom = Math.max(
            USER_PARAMS.MIN_ZOOM, MOVE_STATE.zoom - USER_PARAMS.ZOOM_CHANGE
          );
        }
      }

      store.dispatch({type: "SET_PLAYBACK_ZOOM", payload: Math.pow(2, MOVE_STATE.zoom)});

      const ROTATION_CHANGE = MOVE_STATE.base_rotation + MOVE_STATE.offset_rotation - MOVE_STATE.previousRotation;
      const CENTERED_POINT = {
        x: CURRENT_POINT.pos.x - RIDER_POINTS[ORIGIN_INDEX].pos.x,
        y: CURRENT_POINT.pos.y - RIDER_POINTS[ORIGIN_INDEX].pos.y
      };
      const ROTATED_POINT = {
        x: CENTERED_POINT.x * Math.cos(ROTATION_CHANGE) - CENTERED_POINT.y * Math.sin(ROTATION_CHANGE),
        y: CENTERED_POINT.x * Math.sin(ROTATION_CHANGE) + CENTERED_POINT.y * Math.cos(ROTATION_CHANGE)
      };
      const TRANSFORMED_POINT = {
        x: ROTATED_POINT.x + RIDER_POINTS[ORIGIN_INDEX].pos.x,
        y: ROTATED_POINT.y + RIDER_POINTS[ORIGIN_INDEX].pos.y
      };

      const NEW_VELOCITY = {
        x: MOVE_STATE.speed * Math.cos(MOVE_STATE.turn),
        y: MOVE_STATE.speed * Math.sin(MOVE_STATE.turn)
      };

      const NEW_GRAVITY = {
        x: NEW_VELOCITY.x - CURRENT_POINT.vel.x + TRANSFORMED_POINT.x - CURRENT_POINT.pos.x,
        y: NEW_VELOCITY.y - CURRENT_POINT.vel.y + TRANSFORMED_POINT.y - CURRENT_POINT.pos.y
      };

      return NEW_GRAVITY;
    } catch(e) { console.error(JSON.stringify(e)); return GRAVITY_PROPS.ZERO; } }});

    if(init) return;
    init = true;

    const unsubscribeFromPlayer = subscribe(
      store,
      ({ player: { running } }) => running,
      (playing) => {
        if(!USER_PARAMS.ENABLED) return;

        if(!playing && GRAVITY_PROPS.playerWasRunning) {
          store.dispatch({type: "COMMIT_TRACK_CHANGES"});
          store.dispatch({ type: "SET_PLAYER_STOP_AT_END", payload: true });
        }

        if(playing) {
          GRAVITY_PROPS.playerWasRunning = true;
        } else {
          GRAVITY_PROPS.playerWasRunning = false;
        }
      }
    );

    document.addEventListener('keydown', (event) => {
      switch(event.key) {
        case CONTROLS.SPEED_UP.KEY:
          CONTROLS.SPEED_UP.state = 1;
          break;
        case CONTROLS.SPEED_DOWN.KEY:
          CONTROLS.SPEED_DOWN.state = 1;
          break;
        case CONTROLS.TURN_LEFT.KEY:
          CONTROLS.TURN_LEFT.state = 1;
          break;
        case CONTROLS.TURN_RIGHT.KEY:
          CONTROLS.TURN_RIGHT.state = 1;
          break;
        case CONTROLS.ROTATE_LEFT.KEY:
          CONTROLS.ROTATE_LEFT.state = 1;
          break;
        case CONTROLS.ROTATE_RIGHT.KEY:
          CONTROLS.ROTATE_RIGHT.state = 1;
          break;
        case CONTROLS.ZOOM_IN.KEY:
          CONTROLS.ZOOM_IN.state = 1;
          break;
        case CONTROLS.ZOOM_OUT.KEY:
          CONTROLS.ZOOM_OUT.state = 1;
          break;
        default:
          break;
      }
    }, false);

    document.addEventListener('keyup', (event) => {
      switch(event.key) {
        case CONTROLS.SPEED_UP.KEY:
          CONTROLS.SPEED_UP.state = 0;
          break;
        case CONTROLS.SPEED_DOWN.KEY:
          CONTROLS.SPEED_DOWN.state = 0;
          break;
        case CONTROLS.TURN_LEFT.KEY:
          CONTROLS.TURN_LEFT.state = 0;
          break;
        case CONTROLS.TURN_RIGHT.KEY:
          CONTROLS.TURN_RIGHT.state = 0;
          break;
        case CONTROLS.ROTATE_LEFT.KEY:
          CONTROLS.ROTATE_LEFT.state = 0;
          break;
        case CONTROLS.ROTATE_RIGHT.KEY:
          CONTROLS.ROTATE_RIGHT.state = 0;
          break;
        case CONTROLS.ZOOM_IN.KEY:
          CONTROLS.ZOOM_IN.state = 0;
          break;
        case CONTROLS.ZOOM_OUT.KEY:
          CONTROLS.ZOOM_OUT.state = 0;
          break;
        default:
          break;
      }
    }, false);
  }

  function update(state) {
    USER_PARAMS = {...USER_PARAMS, ...state}
  }

  return { reset, enable, disable, update }
})();

function main () {
  const {
    React,
    store
  } = window;
  const c = React.createElement;

  class CarModComponent extends React.Component {
    constructor (props) {
      super(props);

      this.state = {
        ENABLED: false,
        TRAIL_ENABLED: true,
        CAR_COLOR: "#ff0000",
        INIT_ZOOM: 3.5,
        MIN_ZOOM: 0,
        MAX_ZOOM: 5,
        ZOOM_CHANGE: 0.1,
        INIT_SPEED: 0,
        MIN_SPEED: 0,
        MAX_SPEED: 25,
        ACCELERATION: 0.125,
        DECELERATION: 0.5,
        INIT_DIRECTION: 0,
        DIRECTION_CHANGE: 10,
        INIT_ROTATION: 0,
        MIN_ROTATION: -20,
        MAX_ROTATION: 20,
        ROTATION_CHANGE: 10,
      };
    }

    renderColorPicker (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: e.target.value })
      };
      return c("div", null,
        title,
        c("input", { type: "color", ...props })
      );
    }

    renderCheckbox (key, title, props) {
      props = {
        ...props,
        checked: this.state[key],
        onChange: e => this.setState({ [key]: e.target.checked })
      };
      return c("div", null,
        title,
        c("input", { type: "checkbox", ...props })
      );
    }

    renderSlider (key, title, props) {
      props = {
        ...props,
        value: this.state[key],
        onChange: e => this.setState({ [key]: parseFloat(e.target.value) })
      };

      return c("div", null,
        title,
        c("input", { style: { width: "4em" }, type: "number", ...props }),
        c("input", { type: "range", ...props, onFocus: e => e.target.blur() })
      );
    }

    onEnable () {
      if (this.state.ENABLED) {
        this.setState({ ENABLED: false });
        CarMod.disable(window.store);
      } else {
        this.setState({ ENABLED: true });
        CarMod.enable(window.store);
        CarMod.update(this.state);
      }
    }

    componentWillUpdate (nextProps, nextState) {
      CarMod.update(nextState);
    }

    render () {
      return c("div", null,
        this.state.ENABLED && c("div", null,
          this.renderColorPicker("CAR_COLOR", "Car Color"),
          this.renderCheckbox("TRAIL_ENABLED", "Trail Enabled"),
          this.renderSlider("INIT_ZOOM", "Initial Zoom: ", { min: this.state.MIN_ZOOM, max: this.state.MAX_ZOOM, step: this.state.ZOOM_CHANGE }),
          this.renderSlider("MIN_ZOOM", "Min Zoom: ", { min: -100, max: this.state.MAX_ZOOM, step: this.state.ZOOM_CHANGE }),
          this.renderSlider("MAX_ZOOM", "Max Zoom: ", { min: this.state.MIN_ZOOM, max: 100, step: this.state.ZOOM_CHANGE }),
          this.renderSlider("ZOOM_CHANGE", "Zoom Change: ", { min: -1, max: 1, step: 0.01 }),
          this.renderSlider("INIT_SPEED", "Initial Speed: ", { min: this.state.MIN_SPEED, max: this.state.MAX_SPEED, step: 0.01 }),
          this.renderSlider("MIN_SPEED", "Min Speed: ", { min: -100, max: this.state.MAX_SPEED, step: 0.01 }),
          this.renderSlider("MAX_SPEED", "Max Speed: ", { min: this.state.MIN_SPEED, max: 100, step: 0.01 }),
          this.renderSlider("ACCELERATION", "Acceleration: ", { min: this.state.MIN_SPEED, max: this.state.MAX_SPEED, step: 0.01 }),
          this.renderSlider("DECELERATION", "Deceleration: ", { min: this.state.MIN_SPEED, max: this.state.MAX_SPEED, step: 0.01 }),
          this.renderSlider("INIT_DIRECTION", "Initial Direction: ", { min: -180, max: 180, step: 0.1 }),
          this.renderSlider("DIRECTION_CHANGE", "Direction Change: ", { min: -180, max: 180, step: 0.1 }),
          this.renderSlider("INIT_ROTATION", "Initial Rotation: ", { min: this.state.MIN_ROTATION, max: this.state.MAX_ROTATION, step: this.state.ROTATION_CHANGE }),
          this.renderSlider("MIN_ROTATION", "Min Rotation: ", { min: -180, max: this.state.MAX_ZOOM, step: 0.1 }),
          this.renderSlider("MAX_ROTATION", "Max Rotation: ", { min: this.state.MIN_ZOOM, max: 180, step: 0.1 }),
          this.renderSlider("ROTATION_CHANGE", "Rotation Change: ", { min: -180, max: 180, step: 0.1 }),
          c("button",
            {
              onClick: CarMod.reset
            },
            "Reset"
          )
        ),
        c("button",
          {
            onClick: this.onEnable.bind(this)
          },
          this.state.ENABLED ? "Disable" : "Enable"
        )
      );
    }
  }

  window.registerCustomSetting(CarModComponent);
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
