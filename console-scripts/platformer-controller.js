(function() {
  let keyPressed = { a: false, d: false, r: false }
  let count = 0

  window.addEventListener("keydown", (e) => {
    for (const key of Object.keys(keyPressed)) {
      if (e.key == key) {
        keyPressed[key] = true
      }
    }
  }, false)

  window.addEventListener("keyup", (e) => {
    for (const key of Object.keys(keyPressed)) {
      if (e.key == key) {
        keyPressed[key] = false
      }
    }
  }, false)

  const accelForce = 0.0625

  Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get() {
    const cFrames = store.getState().simulator.engine.engine._computed._frames
    const rider = cFrames[cFrames.length-1].snapshot.entities[0].entities[0]
    const sledAngle = Math.atan2(
      rider.points[0].pos.y - rider.points[3].pos.y,
      rider.points[0].pos.x - rider.points[3].pos.x
    )

    let gravity = { x: 0, y: 0.175 }

    if (keyPressed.r) {
      keyPressed.r = false
      count += 1
      store.dispatch({ type: "STOP_PLAYER" })
      window.requestAnimationFrame(() => {
        store.getState().camera.playbackFollower._frames.length = 0
        const engineComputed = store.getState().simulator.engine.engine._computed
        engineComputed._frames = [engineComputed._getInitialFrame()]
        store.dispatch({ type: "START_PLAYER" })
      })
    }

    if (keyPressed.a != keyPressed.d) {
      if (keyPressed.a) {
        gravity.x += accelForce * Math.cos(sledAngle)
      }
      if (keyPressed.d) {
        gravity.x -= accelForce * Math.cos(sledAngle)
      }
    }

    return gravity
  }})
})()