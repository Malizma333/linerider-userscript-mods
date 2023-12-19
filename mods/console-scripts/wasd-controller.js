window.store.getState().camera.playbackFollower._frames.length = 0;
window.store.getState().simulator.engine.engine._computed._frames.length = 1;

getAutoZoom = createZoomer([ [ 0, 3 ] ]);

var keyOn = { a: false, d: false, w: false, s: false, e: false };
var subiteration = 0;

window.addEventListener("keydown", (e) => {
  if (e.key == "a") keyOn.a = true;
  if (e.key == "d") keyOn.d = true;
  if (e.key == "w") keyOn.w = true;
  if (e.key == "s") keyOn.s = true;
  if (e.key == "e") keyOn.e = true;
}, false);

window.addEventListener("keyup", (e) => {
  if (e.key == "a") keyOn.a = false;
  if (e.key == "d") keyOn.d = false;
  if (e.key == "w") keyOn.w = false;
  if (e.key == "s") keyOn.s = false;
}, false);

Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get () {
  let cFrames = window.store.getState().simulator.engine.engine._computed._frames;
  let cRider = cFrames[cFrames.length-1].snapshot.entities[0].entities[0];
  let cPoints = cRider.points;

  subiteration++;
  if (subiteration > 16) subiteration = 0;

  if (subiteration === 5 && keyOn.e && cRider.riderState == "MOUNTED") {
    return { x:0, y:5 };
  }

  if (cFrames.length == 1) {
    return { x:-0.4, y:0 };
  }

  let gravity = { x:0, y:0 };

  if (keyOn.a == keyOn.d) {
    if (cPoints[0].vel.x == 0) {
      gravity.x = 0;
    } else {
      gravity.x = -cPoints[0].vel.x;
    }
  } else {
    if (cPoints[0].vel.x == 0) {
      if (keyOn.a) {
        gravity.x = -1;
      } else {
        gravity.x = 1;
      }
    } else {
      gravity.x = 0;
    }
  }

  if (keyOn.w == keyOn.s) {
    if (cPoints[0].vel.y == 0) {
      gravity.y = 0;
    } else {
      gravity.y = -cPoints[0].vel.y;
    }
  } else {
    if (cPoints[0].vel.y == 0) {
      if (keyOn.w) {
        gravity.y = -1;
      } else {
        gravity.y = 1;
      }
    } else {
      gravity.y = 0;
    }
  }

  return gravity;
} });
