(function() {
  let keyPressed = { a: false, d: false, w: false, s: false };

  window.addEventListener("keydown", (e) => {
    for (const key of Object.keys(keyPressed)) {
      if (e.key == key) {
        keyPressed[key] = true;
      }
    }
  }, false);

  window.addEventListener("keyup", (e) => {
    for (const key of Object.keys(keyPressed)) {
      if (e.key == key) {
        keyPressed[key] = false;
      }
    }
  }, false);

  store.getState().camera.playbackFollower._frames.length = 0;
  store.getState().simulator.engine.engine._computed._frames.length = 1;

  const speed = 3;

  Object.defineProperty(window.$ENGINE_PARAMS, "gravity", {
    get() {
      const cFrames = store.getState().simulator.engine.engine._computed._frames;
      const cRider = cFrames[cFrames.length - 1].snapshot.entities[0].entities[0];
      const cPoints = cRider.points;

      if (cFrames.length == 1) {
        return { x: -0.4, y: 0 };
      }

      let gravity = { x: 0, y: 0 };

      if (keyPressed.a == keyPressed.d) {
        if (cPoints[0].vel.x == 0) {
          gravity.x = 0;
        } else {
          gravity.x = -cPoints[0].vel.x;
        }
      } else {
        if (cPoints[0].vel.x == 0) {
          if (keyPressed.a) {
            gravity.x = -speed;
          } else {
            gravity.x = speed;
          }
        } else {
          gravity.x = 0;
        }
      }

      if (keyPressed.w == keyPressed.s) {
        if (cPoints[0].vel.y == 0) {
          gravity.y = 0;
        } else {
          gravity.y = -cPoints[0].vel.y;
        }
      } else {
        if (cPoints[0].vel.y == 0) {
          if (keyPressed.w) {
            gravity.y = -speed;
          } else {
            gravity.y = speed;
          }
        } else {
          gravity.y = 0;
        }
      }

      return gravity;
    },
  });
})();
