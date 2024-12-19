(function () {
  const hash = (l) => {
    return [`${l.x1},${l.y1},${l.x2},${l.y2}`,`${l.x2},${l.y2},${l.x1},${l.y1}`]
  }

  if (store.getState().camera.playbackDimensions == null) {
    throw new Error('Camera dimensions not defined!')
  }

  console.log("Starting...")
  const start = performance.now()

  const layers = store.getState().simulator.engine.engine.state.layers.buffer
  const {width, height} = store.getState().camera.playbackDimensions
  const track = store.getState().simulator.engine

  const lockedLayers = new Set()
  const preserveIds = new Set()
  const seenEndpoints = new Set()

  for(const layer of layers) {
    if(!layer.editable) {
      lockedLayers.add(layer.id)
    }
  }

  for(let index = 0; index < store.getState().player.maxIndex; index++) {
    const zoom = window.getAutoZoom ? window.getAutoZoom(index) : store.getState().camera.playbackZoom
    const camera = store.getState().camera.playbackFollower.getCamera(track, { zoom, width, height }, index)
    const boundingBox = {
      x: camera.x - 0.5 * width / zoom,
      y: camera.y - 0.5 * height / zoom,
      width: width / zoom,
      height: height / zoom,
    }
    for(const line of track.selectLinesInRect(boundingBox)) {
      preserveIds.add(line.id)
    }
  }

  const newTrack = {
    ...store.getState().trackData,
    layers,
    lines: [],
    duration: store.getState().player.maxIndex
  }

  for(const line of track.linesList.buffer) {
    if(line.type !== 2 || lockedLayers.has(line.layer || 0)) {
      newTrack.lines.push(line)
      continue
    }

    const [lineHash, flippedLineHash] = hash(line)

    if (preserveIds.has(line.id) && !seenEndpoints.has(lineHash)) {
      newTrack.lines.push(line)
      seenEndpoints.add(lineHash)
      seenEndpoints.add(flippedLineHash)
    }
  }

  const link = document.createElement('a');
  link.setAttribute('download', newTrack.label + '.track.json');
  link.href = window.URL.createObjectURL(new Blob([JSON.stringify(newTrack)], {type: 'application/json'}));
  document.body.appendChild(link);
  window.requestAnimationFrame(function () {
    link.dispatchEvent(new MouseEvent('click'));
    document.body.removeChild(link);
  });

  console.log(`Took ${Math.round(performance.now() - start) / 1000}s`)
})()