window.store.getState().camera.playbackFollower._frames.length = 0;
window.store.getState().simulator.engine.engine._computed._frames.length = 1;

getAutoZoom = createZoomer([ [ 0, 3 ] ]);

var keyOn = { a: false, d: false };

window.addEventListener("keydown", (e) => {
  if (e.key == "a") keyOn.a = true;
  if (e.key == "d") keyOn.d = true;
}, false);

window.addEventListener("keyup", (e) => {
  if (e.key == "a") keyOn.a = false;
  if (e.key == "d") keyOn.d = false;
}, false);

Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get () {
  const cFrames = store.getState().simulator.engine.engine._computed._frames;
  const cPoints = cFrames[cFrames.length-1].snapshot.entities[0].entities[0].points;

  let angle = Math.atan2(cPoints[1].pos.y - cPoints[2].pos.y, cPoints[1].pos.x - cPoints[2].pos.x);
  let gravity = { x: 0.175 * Math.cos(angle - Math.PI/2), y: 0.175 * Math.sin(angle - Math.PI/2) };

  if (keyOn.a) gravity.x += 0.1 * Math.cos(angle);
  if (keyOn.d) gravity.x -= 0.1 * Math.cos(angle);

  return gravity;
} });
