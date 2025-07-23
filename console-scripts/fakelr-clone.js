store.getState().camera.playbackFollower._frames.length = 0;
store.getState().simulator.engine.engine._computed._frames.length = 1;
store.dispatch({ type: "SET_PLAYER_STOP_AT_END", payload: false });
store.dispatch({ type: "SET_PLAYER_MAX_INDEX", payload: 0 });
store.dispatch({ type: "SET_PLAYBACK_DIMENSIONS", payload: { width: 1920, height: 1080 } });
store.dispatch({ type: "SET_VIEW_OPTION", payload: { key: "playbackPreview", value: true } });
store.dispatch({ type: "SET_INTERPOLATE", payload: false });

window.FakeLRClone = (function() {
  const ONE_DEGREE = 0.0174532925;

  const CONTROLS = {
    SPEED_UP: { KEY: "w", state: 0 },
    SPEED_DOWN: { KEY: "s", state: 0 },
    TURN_LEFT: { KEY: "a", state: 0 },
    TURN_RIGHT: { KEY: "d", state: 0 },
    ROTATE_LEFT: { KEY: "ArrowLeft", state: 0 },
    ROTATE_RIGHT: { KEY: "ArrowRight", state: 0 },
  };

  const MOVE_STATE = {
    speed: 10,
    previousRotation: 0,
    rotation: 0,
    turn: 0,
  };

  const MOVE_PARAMS = {
    DELTA_SPEED: 0.125,
    DELTA_ROTATE: -10 * ONE_DEGREE,
    DELTA_TURN: -10 * ONE_DEGREE,
  };

  const GRAVITY = {
    DEFAULT: { x: 0, y: 0.175 },
    ZERO: { x: 0, y: 0 },
    currentSubframe: -1,
    currentPointIndex: -1,
  };

  document.addEventListener("keydown", (event) => {
    switch (event.key) {
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
      default:
        break;
    }
  }, false);

  document.addEventListener("keyup", (event) => {
    switch (event.key) {
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
      default:
        break;
    }
  }, false);

  Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
    get() {
      try {
        GRAVITY.currentSubframe += 1;
        GRAVITY.currentPointIndex = GRAVITY.currentSubframe % 17;

        const FRAMES = store.getState().simulator.engine.engine._computed._frames;
        const RIDER_POINTS = FRAMES[FRAMES.length - 1].snapshot.entities[0].entities[0].points;
        const CURRENT_POINT = RIDER_POINTS[GRAVITY.currentPointIndex];

        if (CURRENT_POINT.type === "FlutterPoint") return GRAVITY.DEFAULT;

        if (GRAVITY.currentPointIndex === 0) {
          const HYPOTONUSE = Math.hypot(CURRENT_POINT.vel.x, CURRENT_POINT.vel.y);
          const NORMAL_VELOCITY = {
            x: CURRENT_POINT.vel.x / HYPOTONUSE,
            y: CURRENT_POINT.vel.y / HYPOTONUSE,
          };
          const VECTOR = {
            x1: CURRENT_POINT.pos.x + 2 * NORMAL_VELOCITY.x,
            y1: CURRENT_POINT.pos.y + 2 * NORMAL_VELOCITY.y,
            x2: CURRENT_POINT.pos.x - 2 * NORMAL_VELOCITY.x,
            y2: CURRENT_POINT.pos.y - 2 * NORMAL_VELOCITY.y,
          };
          window.store.dispatch({
            type: "UPDATE_LINES",
            payload: { linesToAdd: [{ ...VECTOR, type: 2 }], initialLoad: false },
            meta: { name: "ADD_LINE" },
          });

          MOVE_STATE.previousRotation = MOVE_STATE.rotation;
          if (CONTROLS.SPEED_UP.state === 1) MOVE_STATE.speed += MOVE_PARAMS.DELTA_SPEED;
          if (CONTROLS.SPEED_DOWN.state === 1) MOVE_STATE.speed -= 4 * MOVE_PARAMS.DELTA_SPEED;
          if (CONTROLS.ROTATE_LEFT.state === 1) MOVE_STATE.rotation += MOVE_PARAMS.DELTA_ROTATE;
          if (CONTROLS.ROTATE_RIGHT.state === 1) MOVE_STATE.rotation -= MOVE_PARAMS.DELTA_ROTATE;
          if (CONTROLS.TURN_LEFT.state === 1) MOVE_STATE.turn += MOVE_PARAMS.DELTA_TURN;
          if (CONTROLS.TURN_RIGHT.state === 1) MOVE_STATE.turn -= MOVE_PARAMS.DELTA_TURN;
        }

        const ROTATION_CHANGE = MOVE_STATE.rotation - MOVE_STATE.previousRotation;
        const CENTERED_POINT = {
          x: CURRENT_POINT.pos.x - RIDER_POINTS[0].pos.x,
          y: CURRENT_POINT.pos.y - RIDER_POINTS[0].pos.y,
        };
        const ROTATED_POINT = {
          x: CENTERED_POINT.x * Math.cos(ROTATION_CHANGE) - CENTERED_POINT.y * Math.sin(ROTATION_CHANGE),
          y: CENTERED_POINT.x * Math.sin(ROTATION_CHANGE) + CENTERED_POINT.y * Math.cos(ROTATION_CHANGE),
        };
        const TRANSFORMED_POINT = {
          x: ROTATED_POINT.x + RIDER_POINTS[0].pos.x,
          y: ROTATED_POINT.y + RIDER_POINTS[0].pos.y,
        };

        const NEW_VELOCITY = {
          x: MOVE_STATE.speed * Math.cos(MOVE_STATE.turn),
          y: MOVE_STATE.speed * Math.sin(MOVE_STATE.turn),
        };

        const NEW_GRAVITY = {
          x: NEW_VELOCITY.x - CURRENT_POINT.vel.x + TRANSFORMED_POINT.x - CURRENT_POINT.pos.x,
          y: NEW_VELOCITY.y - CURRENT_POINT.vel.y + TRANSFORMED_POINT.y - CURRENT_POINT.pos.y,
        };

        return NEW_GRAVITY;
      } catch (e) {
        console.error(e);
        return GRAVITY.ZERO;
      }
    },
  });

  let playerWasRunning = false;

  function subscribe(
    store = window.store,
    select = (state) => state,
    notify = () => {},
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

  subscribe(
    window.store,
    ({ player: { running } }) => running,
    (playing) => {
      if (!playing && playerWasRunning) {
        store.dispatch({ type: "COMMIT_TRACK_CHANGES" });
        store.dispatch({ type: "SET_PLAYER_STOP_AT_END", payload: true });
      }

      if (playing) {
        playerWasRunning = true;
      } else {
        playerWasRunning = false;
      }
    },
  );
})();
