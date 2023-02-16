createNameSpace("realityEditor.spatialCursor");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {

    const SNAP_CURSOR_TO_TOOLS = true;
    const DEFAULT_SPATIAL_CURSOR_ON = true;

    let isCursorEnabled = DEFAULT_SPATIAL_CURSOR_ON;
    let isUpdateLoopRunning = false;
    let occlusionDownloadInterval = null;
    let cachedOcclusionObject = null;
    let cachedWorldObject = null;
    
    let worldIntersectPoint = {};
    let opacityFactor = 1;
    let scaleFactor = 0;
    let indicator1;
    let indicator2;
    let overlapped = false;

    let clock = new THREE.Clock();
    let uniforms = {
        'EPSILON': {value: Number.EPSILON},
        'time': {value: 0},
        'opacityFactor': {value: opacityFactor},
    };
    
    // offset the spatial cursor with the worldIntersectPoint to avoid clipping plane issues
    const topCursorOffset = 15;
    const bottomCursorOffset = 1;
    const indicatorAxis = new THREE.Vector3(0, 0, 1);
    // const normalCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: realityEditor.spatialCursor.shader.vertexShader.vertexShaderCode,
    //     fragmentShader: realityEditor.spatialCursor.shader.normalCursorFragmentShader.normalCursorFragmentShaderCode,
    //     uniforms: uniforms,
    //     transparent: true,
    //     side: THREE.DoubleSide,
    // });
    const vertexShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    varying vec2 vUv;
    //uniform EPSILON;
    
    void main() {
        ${THREE.ShaderChunk.logdepthbuf_vertex}
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `;
    const normalFragmentShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    varying vec2 vUv;
    uniform float opacityFactor;
    
    void main(void) {
        ${THREE.ShaderChunk.logdepthbuf_fragment}
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 origin = vec2(0.0);
        float color = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        float alpha = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        gl_FragColor = vec4(color, color, color, alpha * opacityFactor);
    }
    `;
    const colorFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    
    void main(void) {
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 translate = vec2(-0.5, 0);
        position += translate;
    
        float r = abs(sin(position.x * position.y + time / 2.0));
        float g = abs(sin(position.x * position.y + time / 4.0));
        float b = abs(sin(position.x * position.y + time / 6.0));
    
        gl_FragColor = vec4(r, g, b, 1.0);
    }
    `;
    const normalCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: normalFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const colorCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: colorFragmentShader,
        uniforms: uniforms,
        transparent: true,
        // todo: depthTest not showing any difference turned off / on
        depthTest: false,
        side: THREE.DoubleSide,
    });


    let color = 'rgb(0, 255, 255)', colorLighter = 'rgb(255, 255, 255)';
    let finalColor = [{
        color: new THREE.Color(color),
        colorLighter: new THREE.Color(colorLighter)
    }];
    let uniforms2 = {
        'EPSILON': {value: Number.EPSILON},
        'avatarColor': {value: finalColor},
        'opacityFactor': {value: opacityFactor},
    };
    const testCursorFragmentShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    varying vec2 vUv;
    uniform float opacityFactor;
    
    // set up color uniforms
    struct AvatarColor {
        vec3 color;
        vec3 colorLighter;
    };
    uniform AvatarColor avatarColor[1];
    
    void main(void) {
        ${THREE.ShaderChunk.logdepthbuf_fragment}
        vec3 color = avatarColor[0].color;
        gl_FragColor = vec4(color, 0.5 * opacityFactor);
    }
    `;
    const testCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: testCursorFragmentShader,
        uniforms: uniforms2,
        transparent: true,
        // blending: THREE.CustomBlending,
        // blendEquation: THREE.AddEquation,
        // blendSrc: THREE.SrcColorFactor,
        // blendDst: THREE.OneMinusSrcAlphaFactor,
        side: THREE.DoubleSide,
    });
    // const testCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: vertexShader,
    //     fragmentShader: testCursorFragmentShader,
    //     uniforms: uniforms2,
    //     transparent: true,
    //     blending: THREE.AdditiveBlending,
    //     side: THREE.DoubleSide,
    // });

    const clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const remap01 = (x, low, high) => {
        return clamp((x - low) / (high - low), 0, 1);
    }

    const remap = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
    }

    async function getMyAvatarColor() {
        let myAvatarColor = await realityEditor.avatar.getMyAvatarColor();
        color = `${myAvatarColor.color}`;
        colorLighter = `${myAvatarColor.colorLighter}`;
        finalColor[0] = {
            color: new THREE.Color(color),
            colorLighter: new THREE.Color(colorLighter)
        };
    }

    function onLoadOcclusionObject(callback) {
        occlusionDownloadInterval = setInterval(() => {
            if (!cachedWorldObject) {
                cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
            }
            if (!cachedWorldObject) {
                return;
            }
            if (cachedWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
                cachedWorldObject = null; // don't accept the local world object
            }
            if (cachedWorldObject && !cachedOcclusionObject) {
                cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(cachedWorldObject.objectId);
                if (cachedOcclusionObject) {
                    // trigger the callback and clear the interval
                    callback(cachedWorldObject, cachedOcclusionObject);
                    clearInterval(occlusionDownloadInterval);
                    occlusionDownloadInterval = null;
                }
            }
        }, 1000);
    }

    async function initService() {
        onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;
        });
        
        addSpatialCursor();
        addTestSpatialCursor();
        toggleDisplaySpatialCursor(DEFAULT_SPATIAL_CURSOR_ON);
        updateCursorDirection();

        registerKeyboardFlyMode();

        await getMyAvatarColor();
        uniforms2['avatarColor'].value = finalColor;

        // begin update loop
        // update();

        const ADD_SEARCH_TOOL_WITH_CURSOR = false;

        if (ADD_SEARCH_TOOL_WITH_CURSOR) {
            document.addEventListener('pointerdown', (e) => {
                if (!indicator2 || !indicator2.visible) return;
                if (realityEditor.device.isMouseEventCameraControl(e)) return;
                if (!realityEditor.device.utilities.isEventHittingBackground(e)) return; // if clicking on a button, etc, don't trigger this

                // raycast against the spatial cursor
                let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, [indicator2]);
                if (intersects.length > 0) {
                    addToolAtScreenCenter('searchDigitalThread');
                }
            });
        }
    }

    // publicly accessible function to add a tool at the spatial cursor position (or floating in front of you)
    function addToolAtScreenCenter(toolName) {
        let touchPosition = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // parameters for createFrame function. all can be undefined except name, x, y, noUserInteraction
        let startPositionOffset, width, height, nodesList, x, y, noUserInteraction, objectKeyToAddTo;
        x = touchPosition.x;
        y = touchPosition.y;
        noUserInteraction = true;

        // automatically adds the tool at the spatial cursor, if the cursor is active
        let addedElement = realityEditor.gui.pocket.createFrame(toolName, startPositionOffset, width, height, nodesList, x, y, noUserInteraction, objectKeyToAddTo);

        // todo: ask Ben: now I cannot drag tools from the pocket during normal / fly mode
        if (getOrientedCursorRelativeToWorldObject()) {
            realityEditor.device.resetEditingState(); // make sure we don't drag the tool after adding
        } else {
            // if cursor isn't active, default move the tool to be floating .4m in front of the camera
            realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, 400);
        }

        // make sure tool is created and uploaded before we send the position, otherwise it won't save
        setTimeout(function() {
            realityEditor.network.postVehiclePosition(addedElement);
        }, 1000);
    }

    let screenX, screenY;
    let lastScreenX, lastScreenY;
    let isFlying = false;
    function registerKeyboardFlyMode() {
        realityEditor.device.keyboardEvents.registerCallback('enterFlyMode', function (params) {
            isFlying = params.isFlying;
            let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
            lastScreenX = mousePosition.x;
            lastScreenY = mousePosition.y;
            screenX = window.innerWidth / 2;
            screenY = window.innerHeight / 2;
        });

        realityEditor.device.keyboardEvents.registerCallback('enterNormalMode', function (params) {
            isFlying = params.isFlying;
            screenX = lastScreenX;
            screenY = lastScreenY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isFlying) {
                screenX = e.pageX;
                screenY = e.pageY;
            }
        });
    }

    function update() {
        window.requestAnimationFrame(update);
        if (!isCursorEnabled) {
            isUpdateLoopRunning = false;
            return; // need to call update() again when isCursorEnabled gets toggled on again
        }
        isUpdateLoopRunning = true;

        try {
            // for iPhone usage, keep spatial cursor at the center of the screen
            if (!realityEditor.device.environment.isDesktop()) {
                screenX = window.innerWidth / 2;
                screenY = window.innerHeight / 2;
            }
            worldIntersectPoint = getRaycastCoordinates(screenX, screenY);
            updateScaleFactor();
            updateOpacityFactor();
            updateSpatialCursor();
            updateTestSpatialCursor();
            tweenCursorDirection();
            uniforms['time'].value = clock.getElapsedTime() * 10;

            if (SNAP_CURSOR_TO_TOOLS) {
                trySnappingCursorToTools(screenX, screenY);
            }
        } catch (e) {
            console.warn('error in spatialCursor', e);
        }
    }

    function trySnappingCursorToTools(screenX, screenY) {
        // todo Steve: when viewing the tool from different angles, the tool changes direction to face user, but
        // todo Steve: the spatial cursor snaps doesn't change direction, should fix it, that would also affect the
        // todo Steve: getToolDirection() function inside spatial search in remote operator
        // constantly check if the screen center overlaps any iframes
        let overlappingDivs = realityEditor.device.utilities.getAllDivsUnderCoordinate(screenX, screenY);
        overlapped = overlappingDivs.some(element => {
            return element.tagName === 'IFRAME' && typeof element.dataset.objectKey !== 'undefined';
        });
        if (overlapped) {
            let overlappingIframe = overlappingDivs.find(element => element.tagName === 'IFRAME');
            let tool = realityEditor.getFrame(overlappingIframe.dataset.objectKey, overlappingIframe.dataset.frameKey);
            if (tool.fullScreen) {
                overlapped = false;
            } else {
                let position = realityEditor.gui.threejsScene.getToolPosition(overlappingIframe.dataset.frameKey);
                indicator1.position.set(position.x, position.y, position.z);
                indicator1.quaternion.setFromUnitVectors(indicatorAxis, realityEditor.gui.threejsScene.getToolDirection(overlappingIframe.dataset.frameKey));
            }
        }
    }

    const geometryLength = 50;
    
    function addSpatialCursor() {
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator1 = new THREE.Mesh(geometry, normalCursorMaterial);
        realityEditor.gui.threejsScene.addToScene(indicator1);
    }
    
    function addTestSpatialCursor() {
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator2 = new THREE.Mesh(geometry, testCursorMaterial);
        realityEditor.gui.threejsScene.addToScene(indicator2);
    }
    
    let scaleAccelerationFactor = 0.002, scaleAcceleration = scaleAccelerationFactor, scaleSpeed = 0;
    function updateScaleFactor() {
        if (Object.keys(worldIntersectPoint).length === 0) {
            // if doesn't intersect any point in world
            if (scaleFactor === 0) return;
            if (scaleAcceleration === scaleAccelerationFactor) {
                // if previously, intersects with some point in world
                scaleAcceleration = -scaleAccelerationFactor;
                scaleSpeed = 0;
            }
            scaleSpeed += scaleAcceleration;
            scaleFactor += scaleSpeed;
            scaleFactor = clamp(scaleFactor, 0, 1);
            indicator1.scale.set(scaleFactor, scaleFactor, scaleFactor);
        } else {
            // if intersects with some point in world
            if (scaleFactor === 1) return;
            if (scaleAcceleration === -scaleAccelerationFactor) {
                // if previously, doesn't intersect with some point in world
                scaleAcceleration = scaleAccelerationFactor;
                scaleSpeed = 0;
            }
            scaleSpeed += scaleAcceleration;
            scaleFactor += scaleSpeed;
            scaleFactor = clamp(scaleFactor, 0, 1);
            indicator1.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    }
    
    let fadeOutDistance = 500, maxOpacityDistance = 1000;
    let opacityLow = 0.1, opacityHigh = 1;
    function updateOpacityFactor() {
        if (typeof worldIntersectPoint.distance !== 'undefined') {
            opacityFactor = remap(worldIntersectPoint.distance, fadeOutDistance, maxOpacityDistance, opacityLow, opacityHigh);
        }
    }
    
    let cursorDirections = [];
    let clock2 = new THREE.Clock(false);
    let updateInterval = 200;
    function updateCursorDirection() {
        setInterval(() => {
            if (Object.keys(worldIntersectPoint).length === 0) return;
            if (cursorDirections.length < 2) {
                cursorDirections.push(worldIntersectPoint.normalVector.clone());
                return;
            }
            cursorDirections.push(worldIntersectPoint.normalVector.clone());
            cursorDirections.shift();
            clock2.start();
        }, updateInterval);
    }
    
    function tweenCursorDirection() {
        if (typeof worldIntersectPoint.point === 'undefined') return;
        // if cursorDirections[] has 1 entry, set indicator quaternion to that direction
        if (cursorDirections.length === 1) {
            indicator1.quaternion.setFromUnitVectors(indicatorAxis, cursorDirections[0]);
            return;
        }
        // if cursorDirections[] has 2 entries, interpolate between the two quaternions in the cursorDirections[] array every frame
        if (cursorDirections.length === 2) {
            let oldQuaternion = new THREE.Quaternion().setFromUnitVectors(indicatorAxis, cursorDirections[0]);
            let desQuaternion = new THREE.Quaternion().setFromUnitVectors(indicatorAxis, cursorDirections[1]);
            let percentage = clock2.getElapsedTime() * 1000 / updateInterval;
            indicator1.quaternion.slerpQuaternions(oldQuaternion, desQuaternion, percentage);
            indicator2.quaternion.slerpQuaternions(oldQuaternion, desQuaternion, percentage);
        }
    }
    
    let curQuaternion, destQuaternion = null;
    function updateSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator1.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(topCursorOffset);
            indicator1.position.add(offset);
        }
        indicator1.material = overlapped ? colorCursorMaterial : normalCursorMaterial;
        indicator1.material.uniforms.opacityFactor.value = opacityFactor;
    }

    function updateTestSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator2.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(bottomCursorOffset);
            indicator2.position.add(offset);
        }
        indicator2.material.uniforms.opacityFactor.value = opacityFactor;
    }

    function toggleDisplaySpatialCursor(newValue) {
        isCursorEnabled = newValue;
        indicator1.visible = newValue;
        indicator2.visible = newValue;

        if (isCursorEnabled && !isUpdateLoopRunning) {
            update(); // restart the update loop
        }
    }

    function getRaycastCoordinates(screenX, screenY) {

        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }
        // if (realityEditor.gui.threejsScene.getGroundPlaneCollider()) {
        //     objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider());
        // }
        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
                let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
                inverseGroundPlaneMatrix.invert();
                raycastIntersects[0].point.applyMatrix4(inverseGroundPlaneMatrix);
                let trInvGroundPlaneMat = inverseGroundPlaneMatrix.clone().transpose();
                // check if the camera & normalVector face the same direction. If so, invert the normalVector to face towards the camera
                let normalVector = raycastIntersects[0].face.normal.clone().applyMatrix4(trInvGroundPlaneMat).normalize();
                let cameraDirection = new THREE.Vector3();
                realityEditor.gui.threejsScene.getInternals().camera.getWorldDirection(cameraDirection);
                if (cameraDirection.dot(normalVector) > 0) {
                    normalVector.negate();
                }
                worldIntersectPoint = {
                    point: raycastIntersects[0].point,
                    normalVector: normalVector,
                    distance: raycastIntersects[0].distance,
                }
                return worldIntersectPoint; // these are relative to the world object
            }
        }
        worldIntersectPoint = {};
        return worldIntersectPoint;
    }

    function getCursorRelativeToWorldObject() {
        if (!cachedWorldObject || !cachedOcclusionObject) { return null; }

        let cursorMatrix = indicator1.matrixWorld.clone(); // in ROOT coordinates
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        return realityEditor.sceneGraph.convertToNewCoordSystem(cursorMatrix, realityEditor.sceneGraph.getSceneNodeById('ROOT'), worldSceneNode);
    }

    // we need to apply multiple transformations to rotate the spatial cursor so that its local up vector is
    // best aligned with the global up, it faces towards the camera rather than away, and if it's on a
    // horizontal surface, it rotates so that its local up vector is in line with the camera forward vector
    function getOrientedCursorRelativeToWorldObject() {
        if (!indicator1.visible) { return null; }

        let spatialCursorMatrix = getCursorRelativeToWorldObject();
        if (spatialCursorMatrix) {
            const utils = realityEditor.gui.ar.utilities;
            let rotatedMatrix = utils.copyMatrix(spatialCursorMatrix.elements);
            let forwardVector = utils.getForwardVector(rotatedMatrix);
            // TODO: may need to convert this relative to world object, but for now global up and world up are aligned anyways
            let globalUpVector = [0, -1, 0];

            // crossing forward vector with desired up vector yields new right vector
            // then cross new right with forward to get orthogonal local up vector (similar to camera lookAt math)

            let newRightVector = utils.normalize(utils.crossProduct(forwardVector, globalUpVector));
            // handle co-linear case by reverting to original axis
            if (isNaN(newRightVector[0])) { newRightVector = utils.getRightVector(rotatedMatrix); }

            let newUpVector = utils.normalize(utils.crossProduct(newRightVector, forwardVector));
            if (isNaN(newUpVector[0])) { newUpVector = utils.getUpVector(rotatedMatrix); }

            let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
            let cameraRelativeToWorldObject = realityEditor.sceneGraph.convertToNewCoordSystem(utils.newIdentityMatrix(), realityEditor.sceneGraph.getCameraNode(), worldSceneNode);

            // compute dot product of camera forward and new tool forward to see whether it's facing towards or away from you
            let cameraForward = utils.normalize(utils.getForwardVector(cameraRelativeToWorldObject));

            // check if it is upright enough to be considered on a horizontal surface – 0.9 seems to work well
            if (Math.abs(utils.dotProduct(forwardVector, globalUpVector)) > 0.9) {
                // math works out same as above, except the camera forward is the desired "up vector" in this case
                newRightVector = utils.normalize(utils.crossProduct(forwardVector, cameraForward));
                if (isNaN(newRightVector[0])) { newRightVector = utils.getRightVector(rotatedMatrix); }

                newUpVector = utils.normalize(utils.crossProduct(newRightVector, forwardVector));
                if (isNaN(newUpVector[0])) { newUpVector = utils.getUpVector(rotatedMatrix); }
            }

            // if normals are inverted and tool ends up facing away from camera instead of towards it, flip it left-right again
            let dotProduct = utils.dotProduct(cameraForward, forwardVector);

            // assign the new right and up vectors to the tool matrix, keeping its forward the same
            rotatedMatrix[0] = newRightVector[0] * Math.sign(dotProduct);
            rotatedMatrix[1] = newRightVector[1] * Math.sign(dotProduct);
            rotatedMatrix[2] = newRightVector[2] * Math.sign(dotProduct);
            rotatedMatrix[4] = newUpVector[0];
            rotatedMatrix[5] = newUpVector[1];
            rotatedMatrix[6] = newUpVector[2];

            return rotatedMatrix;
        }

        return null;
    }

    exports.initService = initService;
    exports.getOrientedCursorRelativeToWorldObject = getOrientedCursorRelativeToWorldObject;
    exports.toggleDisplaySpatialCursor = toggleDisplaySpatialCursor;
    exports.isSpatialCursorEnabled = () => { return isCursorEnabled; }
    exports.addToolAtScreenCenter = addToolAtScreenCenter;
    exports.getWorldIntersectPoint = () => { return worldIntersectPoint; };
}(realityEditor.spatialCursor));
