// ==UserScript==

// @name         More Controls
// @namespace    https://www.linerider.com/
// @author       Malizma
// @description  Provides a menu for viewing and editing specific track data
// @version      1.0.1
// @icon         https://www.linerider.com/favicon.ico

// @match        https://www.linerider.com/*
// @match        https://*.official-linerider.com/*
// @match        http://localhost:*/*
// @match        https://*.surge.sh/*

// @downloadURL  https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-more-controls-mod.user.js
// @updateURL    https://github.com/Malizma333/linerider-userscript-mods/raw/master/mods/line-rider-more-controls-mod.user.js
// @homepageURL  https://github.com/Malizma333/linerider-userscript-mods
// @supportURL   https://github.com/Malizma333/linerider-userscript-mods/issues
// @grant        none

// ==/UserScript==

// jshint asi: true
// jshint esversion: 6

const getWindowFocused = state => state.views.Main;
const getPlayerRunning = state => state.player.running;

const getPlaybackCamProps = state => ({ zoom: getPlaybackCamZoom(state), ...(state.camera.playbackDimensions || state.camera.editorDimensions) })
const getPlaybackCamPos = state => state.camera.playbackFollower.isFixed() ? state.camera.playbackFixedPosition : state.camera.playbackFollower.getCamera(state.simulator.engine, getPlaybackCamProps(state), getPlayerIndex(state));
const getPlaybackCamZoom = state => window.getAutoZoom ? window.getAutoZoom(state.player.index) : state.camera.playbackZoom;
const getEditorCamPos = state => state.camera.editorPosition;
const getEditorCamZoom = state => state.camera.editorZoom;
const getStopAtEnd = state => state.player.stopAtEnd;
const getPlayerIndex = state => state.player.index;
const getPlayerMaxIndex = state => state.player.maxIndex;
const getOnionSkinBounds = state => [state.renderer.onionSkinFramesBefore, state.renderer.onionSkinFramesAfter];
const getPlayerFPS = state => state.player.settings.fps;
const getTrackTitle = state => state.trackData.label;
const getTrackCreator = state => state.trackData.creator;
const getTrackDesc = state => state.trackData.description;
const getAutosaveEnabled = state => state.autosaveEnabled;

const defaultPreferences = {
    containerTop: "10vh",
    containerLeft: "10vw",
    containerWidth: "20vw",
    containerHeight: "25vh"
};

const preferencesKey = "MORE_CONTROLS_MOD_WINDOW_PREFS"

function loadPrefs() {
    let storedPreferences = localStorage.getItem(preferencesKey);
    if (storedPreferences) {
        const nextPrefs = JSON.parse(storedPreferences);

        Object.keys(defaultPreferences)
            .filter(key => !Object.keys(nextPrefs).includes(key))
            .forEach(key => {
            nextPrefs[key] = defaultPreferences[key]
        });
        return nextPrefs;
    }

    return defaultPreferences;
}

function savePrefs(newPrefs) {
    localStorage.setItem(
        preferencesKey,
        JSON.stringify(newPrefs)
    );
}

function main () {
    window.V2 = window.V2 || window.store.getState().simulator.engine.engine.state.startPoint.constructor;

    const {
        React,
        ReactDOM,
        store
    } = window;

    const e = React.createElement;
    var playerRunning = getPlayerRunning(store.getState());
    var windowFocused = getWindowFocused(store.getState());

    const preferences = loadPrefs();
    savePrefs(preferences);

    const rootStyle = {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        textAlign: "left",
        transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
        flex: 1,
        width: "100%",
        overflow: "auto"
    };

    const containerStyle = {
        position: "fixed",
        minWidth: "15vw",
        maxWidth: "40vw",
        minHeight: "15vh",
        maxHeight: "45vh",
        border: "3px solid black",
        backgroundColor: "#ffffff",
        resize: "both",
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
    };

    const headerStyle = {
        cursor: "move",
        minHeight: '3ch',
        backgroundColor: "#aaaaaa",
        zIndex: "10",
        borderBottom: "3px solid black"
    };

    containerStyle.top = preferences.settingsTop;
    containerStyle.left = preferences.settingsLeft;
    containerStyle.width = preferences.settingsWidth;
    containerStyle.height = preferences.settingsHeight;

    store.subscribe(() => {
        playerRunning = getPlayerRunning(store.getState());
        windowFocused = getWindowFocused(store.getState());

        let shouldBeVisible = !playerRunning && windowFocused;

        modContainer.style.opacity = shouldBeVisible ? 1 : 0;
        modContainer.style.pointerEvents = shouldBeVisible ? null : "none";
    });

    const dragProps = {lastX: 0, lastY: 0}

    class MoreControlsModComponent extends React.Component {
        constructor() {
            super();

            this.state = {
                playbackCam: [0,0],
                editorCam: [0,0],
                stopEnd: false,
                index: 0,
                maxIndex: 0,
                onionSkin: [0,0],
                fps: 0,
                title: '',
                creator: '',
                desc: '',
                autosave: false
            };

            store.subscribe(() => this.matchState());
        }

        componentDidMount() {
            Object.assign(modContainer.style, containerStyle);
            window.addEventListener('resize', this.updateDimensions);
            this.matchState();
        }

        matchState() {
            const state = store.getState();
            this.setState({ playbackCam: [getPlaybackCamPos(state).x, getPlaybackCamPos(state).y] });
            this.setState({ editorCam: [getEditorCamPos(state).x, getEditorCamPos(state).y] });
            this.setState({ stopAtEnd: getStopAtEnd(state) });
            this.setState({ index: getPlayerIndex(state) });
            this.setState({ maxIndex: getPlayerMaxIndex(state) });
            this.setState({ onionSkin: getOnionSkinBounds(state) });
            this.setState({ fps: getPlayerFPS(state) });
            this.setState({ title: getTrackTitle(state) });
            this.setState({ creator: getTrackCreator(state) });
            this.setState({ desc: getTrackDesc(state) });
            this.setState({ autosave: getAutosaveEnabled(state) });
        }

        updateDimensions() {
            if(modContainer.offsetLeft < 0) {
                modContainer.style.left = `${0}vw`;
                preferences.settingsLeft = `${0}vw`;
            }

            if(modContainer.offsetLeft > window.innerWidth - modContainer.offsetWidth) {
                modContainer.style.left = `${100 * (window.innerWidth - modContainer.offsetWidth) / window.innerWidth}vw`;
                preferences.settingsLeft = `${100 * (window.innerWidth - modContainer.offsetWidth) / window.innerWidth}vw`;
            }

            if(modContainer.offsetTop < 0) {
                modContainer.style.top = `${0}vh`;
                preferences.settingsTop = `${0}vh`;
            }

            if(modContainer.offsetTop > window.innerHeight - modContainer.offsetHeight) {
                modContainer.style.top = `${100 * (window.innerHeight - modContainer.offsetHeight) / window.innerHeight}vh`;
                preferences.settingsTop = `${100 * (window.innerHeight - modContainer.offsetHeight) / window.innerHeight}vh`;
            }

            savePrefs(preferences);
        }

        onStartDrag(e) {
            e = e || window.event;
            e.preventDefault();

            dragProps.lastX = e.clientX;
            dragProps.lastY = e.clientY;

            document.onmousemove = this.onDrag;
            document.onmouseup = this.onCloseDrag;
        }

        onDrag(e) {
            e = e || window.event;
            e.preventDefault();

            const newX = dragProps.lastX - e.clientX;
            const newY = dragProps.lastY - e.clientY;
            dragProps.lastX = e.clientX;
            dragProps.lastY = e.clientY;

            const nextOffsetX = modContainer.offsetLeft - newX;
            const nextOffsetY = modContainer.offsetTop - newY;

            if(0 <= nextOffsetX && nextOffsetX <= window.innerWidth - modContainer.offsetWidth &&
               0 <= nextOffsetY && nextOffsetY <= window.innerHeight - modContainer.offsetHeight) {
                modContainer.style.left = `${100 * (modContainer.offsetLeft - newX) / window.innerWidth}vw`;
                modContainer.style.top = `${100 * (modContainer.offsetTop - newY) / window.innerHeight}vh`;
                preferences.settingsLeft = `${100 * (modContainer.offsetLeft - newX) / window.innerWidth}vw`;
                preferences.settingsTop = `${100 * (modContainer.offsetTop - newY) / window.innerHeight}vh`;
            }

            savePrefs(preferences);
        }

        onCloseDrag(e) {
            document.onmouseup = null;
            document.onmousemove = null;
        }

        onSetEditorCamX(parent, x) {
            const { editorCam } = parent.state;
            const camState = { position: { x, y: editorCam[1] }, zoom: getEditorCamZoom(store.getState()) };
            editorCam[0] = x;
            store.dispatch({ type: "SET_EDITOR_CAMERA", payload: camState });
            parent.setState({ editorCam });
        }

        onSetEditorCamY(parent, y) {
            const { editorCam } = parent.state;
            const camState = { position: { x: editorCam[0], y }, zoom: getEditorCamZoom(store.getState()) };
            editorCam[1] = y;
            store.dispatch({ type: "SET_EDITOR_CAMERA", payload: camState });
            parent.setState({ editorCam });
        }

        onToggleStopEnd(parent, stopAtEnd) {
            store.dispatch({ type: "SET_PLAYER_STOP_AT_END", payload: stopAtEnd });
            parent.setState({ stopAtEnd });
        }

        onSetIndex(parent, index) {
            if(index < 0) return;
            store.dispatch({ type: "SET_PLAYER_INDEX", payload: index });
            parent.setState({ index });
        }

        onSetMaxIndex(parent, maxIndex) {
            if(maxIndex < 0) return;
            store.dispatch({ type: "SET_PLAYER_MAX_INDEX", payload: maxIndex });
            parent.setState({ maxIndex });
        }

        onSetOnionSkinBefore(parent, framesBefore) {
            if(framesBefore < 0) return;
            const { onionSkin } = parent.state;
            onionSkin[0] = framesBefore;
            store.dispatch({ type: "SET_ONION_SKIN_FRAMES_BEFORE", payload: framesBefore });
            parent.setState({ onionSkin });
        }

        onSetOnionSkinAfter(parent, framesAfter) {
            if(framesAfter < 0) return;
            const { onionSkin } = parent.state;
            onionSkin[1] = framesAfter;
            store.dispatch({ type: "SET_ONION_SKIN_FRAMES_AFTER", payload: framesAfter });
            parent.setState({ onionSkin });
        }

        onSetFPS(parent, fps) {
            if(fps < 1) return;
            store.dispatch({ type: "SET_PLAYER_FPS", payload: fps });
            parent.setState({ fps });
        }

        onSetTrackTitle(parent, title) {
            const details = { title, creator: parent.state.creator, description: parent.state.desc };
            store.dispatch({ type: "trackData/SET_TRACK_DETAILS", payload: details });
            parent.setState({ title });
        }

        onSetTrackCreator(parent, creator) {
            const details = { title: parent.state.title, creator, description: parent.state.desc };
            store.dispatch({ type: "trackData/SET_TRACK_DETAILS", payload: details });
            parent.setState({ creator });
        }

        onSetTrackDesc(parent, desc) {
            const details = { title: parent.state.title, creator: parent.state.creator, description: desc };
            store.dispatch({ type: "trackData/SET_TRACK_DETAILS", payload: details });
            parent.setState({ desc });
        }

        onToggleAutosave(parent, autosave) {
            store.dispatch({ type: "SET_AUTOSAVE_ENABLED", payload: autosave });
            parent.setState({ autosave })
        }

        renderDouble(key, label, sublabels, editable, actions) {
            const props = [
                {
                    id: key + '0',
                    type: "number",
                    readOnly: !editable,
                    value: this.state[key][0],
                    onChange: e => (actions[0])(this, Number(e.target.value))
                }, {
                    id: key + '1',
                    type: "number",
                    readOnly: !editable,
                    value: this.state[key][1],
                    onChange: e => (actions[1])(this, Number(e.target.value))
                }
            ];

            const block = { marginLeft: ".5em", width: "3em" };

            return e(
                "div",
                null,
                e("label", { style: { width: "4em" } }, label),
                e("label", { style: block, for: key + '0' }, sublabels[0]),
                e("input", { style: block, ...props[0] }),
                e("label", { style: block, for: key + '1' }, sublabels[1]),
                e("input", { style: block, ...props[1] })
            );
        }

        renderSingle(key, label, editable, isNumber, action) {
            const props = {
                id: key,
                type: isNumber ? "number" : "text",
                readOnly: !editable,
                value: this.state[key],
                onChange: e => action(this, isNumber ? Number(e.target.value) : e.target.value)
            };

            return e(
                "div",
                null,
                e("label", { style: { width: "4em" }, for: key }, label),
                e("input", { style: { marginLeft: ".5em" }, ...props })
            );
        }

        renderCheckbox(key, label, action) {
            const props = {
                id: key,
                checked: this.state[key],
                onChange: e => action(this, e.target.checked)
            };

            return e(
                "div",
                null,
                e("label", { style: { width: "4em" }, for: key }, label),
                e("input", { style: { marginLeft: ".5em" }, type: "checkbox", ...props })
            );
        }


        render () {
            return e(
                "div",
                {style: {display: "flex", height: "100%", width: "100%", flexDirection: "column"}},
                e(
                    "div",
                    {style: headerStyle, onMouseDown: (e) => this.onStartDrag(e)}
                ),
                e(
                    "div",
                    { style: rootStyle },
                    e(
                        "div",
                        { style: { width: "100%" } },
                        this.renderDouble('playbackCam', 'Playback Camera', ['X', 'Y'], false),
                        this.renderDouble('editorCam', 'Editor Camera', ['X', 'Y'], true, [this.onSetEditorCamX, this.onSetEditorCamY]),
                        e("hr"),
                        this.renderCheckbox('stopAtEnd', 'Stop at End', this.onToggleStopEnd),
                        this.renderSingle('index', 'Index', true, true, this.onSetIndex),
                        this.renderSingle('maxIndex', 'Max Index', true, true, this.onSetMaxIndex),
                        this.renderDouble('onionSkin', 'Onion Skins', ['Before', 'After'], true, [this.onSetOnionSkinBefore, this.onSetOnionSkinAfter]),
                        this.renderSingle('fps', 'Player FPS', true, true, this.onSetFPS),
                        e("hr"),
                        this.renderSingle('title', 'Title', true, false, this.onSetTrackTitle),
                        this.renderSingle('creator', 'Creator', true, false, this.onSetTrackCreator),
                        this.renderSingle('desc', 'Description', true, false, this.onSetTrackDesc),
                        this.renderCheckbox('autosave', 'Autosave', this.onToggleAutosave)
                    )
                )
            );
        }
    }

    const modContainer = document.createElement("div");

    document.getElementById("content").appendChild(modContainer);

    ReactDOM.render(
        e(MoreControlsModComponent),
        modContainer
    );

    const resizeObserver = new ResizeObserver(() => {
        preferences.settingsWidth = `${100 * modContainer.offsetWidth / window.innerWidth}vw`;
        preferences.settingsHeight = `${100 * modContainer.offsetHeight / window.innerHeight}vh`;
        savePrefs(preferences);
    });

    resizeObserver.observe(modContainer);
}

if (window.store) {
    main();
} else {
    const prevInit = window.onAppReady;
    window.onAppReady = () => {
        if (prevInit) prevInit();
        main();
    };
}

