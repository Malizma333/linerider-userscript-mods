(function() {
  const thrustMag = 0.125
  const maxSpeed = 10
  const maxSpeedScaled = maxSpeed * maxSpeed * 100
  let keyPressed = { a: false, d: false, r: false }

  store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 })
  window.requestAnimationFrame(() => {
    store.getState().camera.playbackFollower._frames.length = 0
    store.getState().simulator.engine.engine._computed._frames.length = 1
  })

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

  function getSpeedSquared(rider, prevRider) {
    let x = 0, y = 0

    rider.filter(p => p.type === 'CollisionPoint').forEach(p => {
      x += p.pos.x
      y += p.pos.y
    })

    prevRider.filter(p => p.type === 'CollisionPoint').forEach(p => {
      x -= p.pos.x
      y -= p.pos.y
    })

    return [x * x + y * y, Math.atan2(-y, x)]
  }

  Object.defineProperty(window.$ENGINE_PARAMS, "gravity", { get() {
    const cFrames = store.getState().simulator.engine.engine._computed._frames
    const curIndex = Math.max(1, Math.min(cFrames.length, Math.floor(store.getState().player.index)))
    const rider = cFrames[curIndex - 1].snapshot.entities[0].entities[0]

    let gravity = { x: 0, y: 0 }

    if (keyPressed.r) {
      keyPressed.r = false
      store.dispatch({ type: "SET_PLAYER_INDEX", payload: 0 })
      window.requestAnimationFrame(() => {
        store.getState().camera.playbackFollower._frames.length = 0
        store.getState().simulator.engine.engine._computed._frames.length = 1
      })
    }

    if (keyPressed.a !== keyPressed.d) {
      const prevRider = cFrames[Math.max(0, curIndex - 2)].snapshot.entities[0].entities[0]
      const [speedMag, speedAngle] = getSpeedSquared(rider.points, prevRider.points)
      const dx = rider.points[3].pos.x - rider.points[0].pos.x
      const dy = rider.points[0].pos.y - rider.points[3].pos.y
      const thrustAngle = Math.atan2(dy, dx) + (keyPressed.a ? Math.PI : 0)
      const percentLeft = Math.max(0, 1 - speedMag / maxSpeedScaled)
      const angleDiff = Math.abs(thrustAngle - speedAngle)
      const angleDiffMod = angleDiff > Math.PI * 2 ? angleDiff - Math.PI * 2 : angleDiff
      const shouldScale = angleDiffMod < Math.PI / 2
      gravity.x += thrustMag * (shouldScale ? percentLeft : 1) * Math.cos(thrustAngle)
      gravity.y -= thrustMag * (shouldScale ? percentLeft : 1) * Math.sin(thrustAngle)
    }

    return gravity
  }})
})()