createNameSpace("realityEditor.avatar.draw");

/**
 * @fileOverview realityEditor.avatar.draw
 * Contains a variety of helper functions for avatar/index.js to render all visuals related to avatars
 */

(function(exports) {
    const RENDER_DEVICE_CUBE = false; // turn on to show a cube at each of the avatar positions, in addition to the beams
    const SMOOTH_AVATAR_POSITIONS = false; // try to animate the positions of the avatars – doesn't work too well yet

    // main data structure that stores the various visual elements for each avatar objectKey (beam, pointer, textLabel)
    let avatarMeshes = {};

    // 2D UI for keeping track of the connection status
    let debugUI = null;
    let statusUI = null;
    let hasConnectionFeedbackBeenShown = false; // ensures we only show the "Connected!" UI one time

    // main rendering loop – trigger this at 60fps to render all the visual feedback for the avatars (e.g. laser pointers)
    function renderOtherAvatars(avatarTouchStates, avatarNames) {
        try {
            for (const [objectKey, avatarTouchState] of Object.entries(avatarTouchStates)) {
                renderAvatar(objectKey, avatarTouchState, avatarNames[objectKey]);
            }
        } catch (e) {
            console.warn('error rendering other avatars', e);
        }
    }

    let renderedNames = null;
    function renderAvatarIconList(connectedAvatars) {
        if (JSON.stringify(connectedAvatars) === renderedNames) {
            return;
        }

        console.log('updated  names: ', connectedAvatars);
        
        let iconContainer = document.getElementById('avatarIconContainer');
        if (!iconContainer) {
            iconContainer = document.createElement('div');
            iconContainer.id = 'avatarIconContainer';
            iconContainer.classList.add('avatarIconContainerScaleAdjustment')
            iconContainer.style.top = (realityEditor.device.environment.variables.screenTopOffset + 20) + 'px';
            document.body.appendChild(iconContainer)
        }
        
        while (iconContainer.hasChildNodes()) {
            iconContainer.removeChild(iconContainer.lastChild);
        }
        
        if (Object.keys(connectedAvatars).length < 2) {
            renderedNames = JSON.stringify(connectedAvatars); // TODO: show invite button instead?
            return;
        }

        let keys = Object.keys(connectedAvatars);
        let first = realityEditor.avatar.utils.getAvatarName(); // move yourself to the font of the list
        keys.sort(function(x,y){ return x.includes(first) ? -1 : y.includes(first) ? 1 : 0; });

        const ICON_WIDTH = 30;
        const ICON_GAP = 10;
        // if too many collaborators, show a "+N" at the end and limit how many icons
        const MAX_ICONS = realityEditor.device.environment.variables.maxAvatarIcons || 3;
        const ADDITIONAL_NAMES = 2; // will list out this many extra names with commas when hovering over the ellipsis

        keys.forEach((objectKey, index) => {
            let isEllipsis = index === (MAX_ICONS); // the next one after the last turns into an ellipsis
            if (index > MAX_ICONS) { return; } // after the ellipsis, we ignore the rest

            let info = connectedAvatars[objectKey];
            let initials = realityEditor.avatar.utils.getInitialsFromName(info.name) || '';
            if (isEllipsis) {
                initials = '+' + (keys.length - index);
            }

            let iconDiv = document.createElement('div');
            iconDiv.classList.add('avatarListIcon', 'avatarListIconVerticalAdjustment');
            iconDiv.style.left = ((ICON_WIDTH + ICON_GAP) * index) + 'px';
            iconContainer.appendChild(iconDiv);

            let iconImg = document.createElement('img');
            iconImg.classList.add('avatarListIconImage');
            iconDiv.appendChild(iconImg);

            let isMyIcon = objectKey.includes(realityEditor.avatar.utils.getAvatarName());
            if (initials) {
                iconImg.src = '../../../svg/avatar-initials-background-dark.svg';

                let iconInitials = document.createElement('div');
                iconInitials.classList.add('avatarListIconInitials');
                iconInitials.innerText = initials;
                iconDiv.appendChild(iconInitials);
                iconImg.title = isEllipsis ? 'Additional Avatars' : info.name;
            } else {
                if (isMyIcon) {
                    iconImg.src = '../../../svg/avatar-placeholder-icon.svg';
                } else {
                    iconImg.src = '../../../svg/avatar-placeholder-icon-dark.svg';
                }
            }

            let color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey));
            let lightColor = realityEditor.avatar.utils.getColorLighter(realityEditor.getObject(objectKey));
            if (color && lightColor) {
                if (isMyIcon) {
                    iconImg.style.border = '2px solid white';
                    iconImg.style.backgroundColor = color;
                } else if (!isEllipsis) {
                    iconImg.style.border = '2px solid ' + lightColor;
                    iconImg.style.backgroundColor = lightColor;
                } else {
                    iconImg.style.border = '2px solid black';
                    iconImg.style.backgroundColor = 'rgb(95, 95, 95)';
                }
                iconImg.style.borderRadius = '20px';
            }
            
            // show full name when hovering over the icon
            iconDiv.addEventListener('pointerover', () => {
                let tooltipName = info.name;
                if (isEllipsis) {
                    let remainingKeys = keys.slice(-1 * (keys.length - index));
                    let names = remainingKeys.map(key => connectedAvatars[key].name).filter(name => !!name);
                    names = names.slice(0, ADDITIONAL_NAMES); // limit number of comma-separated names
                    let additional = (keys.length - index) - names.length; // number of anonymous and beyond-additional
                    tooltipName = names.join(', ');
                    if (additional > 0) {
                        tooltipName += ' and ' + additional + ' more';
                    }
                }
                // let fullName = !isEllipsis ? info.name : ('and ' + (keys.length - index) + ' more');
                showIconName(iconDiv, tooltipName, isMyIcon, isEllipsis);
            });
            ['pointerout', 'pointercancel', 'pointerup'].forEach((eventName) => {
                iconDiv.addEventListener(eventName, hideIconName);
            });
        });
        
        let iconsWidth = keys.length * (ICON_WIDTH + ICON_GAP) - ICON_GAP; // e.g. [ICON] __GAP__ [ICON] __GAP__ [ICON]
        iconContainer.style.width = iconsWidth + 'px';

        renderedNames = JSON.stringify(connectedAvatars);
    }
    exports.renderAvatarIconList = renderAvatarIconList;
    
    // shows a tooltip that either says the name, or "You" or "Anonymous" if no name is provided
    function showIconName(element, name, isMyAvatar) {
        let container = document.getElementById('avatarListHoverName');
        if (!container) {
            container = document.createElement('div');
            container.id = 'avatarListHoverName';
            container.classList.add('avatarListIconVerticalAdjustment');
            element.parentElement.appendChild(container);
        }

        let nameDiv = document.getElementById('avatarListHoverNameText');
        if (!nameDiv) {
            nameDiv = document.createElement('div');
            nameDiv.id = 'avatarListHoverNameText';
            container.appendChild(nameDiv);
        }

        let tooltipArrow = document.getElementById('avatarListTooltipArrow');
        if (!tooltipArrow) {
            let tooltipArrow = document.createElement('img');
            tooltipArrow.id = 'avatarListTooltipArrow';
            tooltipArrow.src = '../../../svg/tooltip-arrow-up.svg';
            container.appendChild(tooltipArrow);
        }
        
        if (name) {
            nameDiv.innerText = isMyAvatar ? name + ' (you)' : name;
        } else {
            nameDiv.innerText = isMyAvatar ? 'You (Anonymous)' : 'Anonymous';
        }
        let width = Math.max(120, (nameDiv.innerText.length) * 12);
        nameDiv.style.width = width + 'px';
        container.style.width = width + 'px;'

        container.style.display = ''; //'inline-block';
        
        let iconRelativeLeft = element.getBoundingClientRect().left - element.parentElement.getBoundingClientRect().left;
        let iconHalfWidth = element.getBoundingClientRect().width / 2;
        container.style.left = (iconRelativeLeft + iconHalfWidth) + 'px';
    }
    
    function hideIconName() {
        let nameDiv = document.getElementById('avatarListHoverName');
        if (nameDiv) {
            nameDiv.style.display = 'none';
        }
    }

    // main rendering function for a single avatar – creates a beam, a sphere at the endpoint, and a text label if a name is provided
    function renderAvatar(objectKey, touchState, avatarName) {
        if (!touchState) { return; }

        // if that device isn't touching down, hide its laser beam and ignore the rest
        if (!touchState.isPointerDown) {
            if (avatarMeshes[objectKey]) {
                avatarMeshes[objectKey].pointer.visible = false;
                avatarMeshes[objectKey].beam.visible = false;
                avatarMeshes[objectKey].textLabel.style.display = 'none';
            }
            return;
        }

        const THREE = realityEditor.gui.threejsScene.THREE;
        const color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey)) || '#ffff00';

        // lazy-create the meshes and text label if they don't exist yet
        if (typeof avatarMeshes[objectKey] === 'undefined') {

            let pointerGroup = new THREE.Group();
            let pointerSphere = sphereMesh(color, objectKey + 'pointer', 50);
            pointerGroup.add(pointerSphere);

            let initials = null;
            if (avatarName) {
                initials = realityEditor.avatar.utils.getInitialsFromName(avatarName);
            }

            avatarMeshes[objectKey] = {
                pointer: pointerGroup,
                beam: cylinderMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), color),
                textLabel: createTextLabel(objectKey, initials)
            }
            if (RENDER_DEVICE_CUBE) { // debug option to show where the avatars are located
                avatarMeshes[objectKey].device = boxMesh(color, objectKey + 'device')
                avatarMeshes[objectKey].device.matrixAutoUpdate = false;
                realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].device);
            }
            avatarMeshes[objectKey].beam.name = objectKey + 'beam';
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].pointer);
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
        }

        // get the scene position of the avatar by multiplying the avatar matrix (which is relative to world) by the world origin matrix
        let thatAvatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let worldMatrixThree = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(worldMatrixThree, worldSceneNode.worldMatrix);
        let avatarObjectMatrixThree = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(avatarObjectMatrixThree, thatAvatarSceneNode.worldMatrix);
        avatarObjectMatrixThree.premultiply(worldMatrixThree);

        // then transform the final avatar position into groundplane coordinates since the threejsScene is relative to groundplane
        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let groundPlaneMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneMatrix, groundPlaneSceneNode.worldMatrix);
        avatarObjectMatrixThree.premultiply(groundPlaneMatrix.invert());

        // show all the meshes, etc, for this avatar
        avatarMeshes[objectKey].pointer.visible = true;
        let wasBeamVisible = avatarMeshes[objectKey].beam.visible; // animate differently if just made visible
        avatarMeshes[objectKey].beam.visible = true;
        if (RENDER_DEVICE_CUBE) {
            avatarMeshes[objectKey].device.visible = true;
            avatarMeshes[objectKey].device.matrixAutoUpdate = false
            avatarMeshes[objectKey].device.matrix.copy(avatarObjectMatrixThree);
        }

        if (!touchState.worldIntersectPoint) { return; }

        // worldIntersectPoint was converted to world coordinates. need to convert back to groundPlane coordinates in this system
        let groundPlaneRelativeToWorldToolbox = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
        let groundPlaneRelativeToWorldThree = new realityEditor.gui.threejsScene.THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneRelativeToWorldThree, groundPlaneRelativeToWorldToolbox);
        let convertedEndPosition = new THREE.Vector3(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
        convertedEndPosition.applyMatrix4(groundPlaneRelativeToWorldThree);
        // move the pointer sphere to the raycast intersect position
        avatarMeshes[objectKey].pointer.position.set(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

        // get the 2D screen coordinates of the pointer, and render a text bubble centered on it with the name of the sender
        let pointerWorldPosition = new THREE.Vector3();
        avatarMeshes[objectKey].pointer.getWorldPosition(pointerWorldPosition);
        let screenCoords = realityEditor.gui.threejsScene.getScreenXY(pointerWorldPosition);
        if (avatarName) {
            avatarMeshes[objectKey].textLabel.style.display = 'inline';
        }
        // scale the name textLabel based on distance from convertedEndPosition to camera
        let camPos = realityEditor.sceneGraph.getWorldPosition('CAMERA');
        let delta = {
            x: camPos.x - convertedEndPosition.x,
            y: camPos.y - convertedEndPosition.y,
            z: camPos.z - convertedEndPosition.z
        };
        let distanceToCamera = Math.max(0.001, Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z));
        let scale = Math.max(0.5, Math.min(2, 2000 / distanceToCamera)); // biggest when <1m, smallest when >4m
        avatarMeshes[objectKey].textLabel.style.transform = 'translateX(-50%) translateY(-50%) translateZ(3000px) scale(' + scale + ')';
        avatarMeshes[objectKey].textLabel.style.left = screenCoords.x + 'px'; // position it centered on the pointer sphere
        avatarMeshes[objectKey].textLabel.style.top = screenCoords.y + 'px';

        // the position of the avatar in space
        let startPosition = new THREE.Vector3(avatarObjectMatrixThree.elements[12], avatarObjectMatrixThree.elements[13], avatarObjectMatrixThree.elements[14]);
        // the position of the destination of the laser pointer (where that clicked on the environment)
        let endPosition = new THREE.Vector3(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

        if (SMOOTH_AVATAR_POSITIONS && wasBeamVisible) { // animate start position if already visible
            let currentStartPosition = [
                avatarMeshes[objectKey].beam.position.x,
                avatarMeshes[objectKey].beam.position.y,
                avatarMeshes[objectKey].beam.position.z
            ];
            let newStartPosition = [
                avatarObjectMatrixThree.elements[12],
                avatarObjectMatrixThree.elements[13],
                avatarObjectMatrixThree.elements[14]
            ];
            // animation option 1: move the cursor faster the further away it is from the new position, so it eases out
            // let animatedStartPosition = realityEditor.gui.ar.utilities.tweenMatrix(currentStartPosition, newStartPosition, 0.05);
            // animation option 2: move the cursor linearly at 30*[FPS] millimeters per second
            let animatedStartPosition = realityEditor.gui.ar.utilities.animationVectorLinear(currentStartPosition, newStartPosition, 30);
            startPosition = new THREE.Vector3(animatedStartPosition[0], animatedStartPosition[1], animatedStartPosition[2]);
        }

        // replace the old laser beam cylinder with a new one that goes from the avatar position to the beam destination
        avatarMeshes[objectKey].beam = updateCylinderMesh(avatarMeshes[objectKey].beam, startPosition, endPosition, color);
        avatarMeshes[objectKey].beam.name = objectKey + 'beam';
        realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
    }

    // helper to create a box mesh
    function boxMesh(color, name) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const geo = new THREE.BoxGeometry(100, 100, 100);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const box = new THREE.Mesh(geo, mat);
        box.name = name;
        return box;
    }

    // helper to create a sphere mesh
    function sphereMesh(color, name, radius) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const geo = new THREE.SphereGeometry((radius || 50), 8, 6, 0, 2 * Math.PI, 0, Math.PI);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.name = name;
        return sphere;
    }

    // helper to create a thin laser beam cylinder from start to end
    function cylinderMesh(startPoint, endPoint, color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        let length = 0;
        if (startPoint && endPoint) {
            let direction = new THREE.Vector3().subVectors(endPoint, startPoint);
            length = direction.length();
        }
        const material = getBeamMaterial(color);
        let geometry = new THREE.CylinderGeometry(6, 6, length, 6, 2, false);
        // shift it so one end rests on the origin
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, length / 2, 0));
        // rotate it the right way for lookAt to work
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
        let mesh = new THREE.Mesh(geometry, material);
        if (startPoint) {
            mesh.position.copy(startPoint);
        }
        if (endPoint) {
            mesh.lookAt(endPoint);
        }
        return mesh;
    }

    // TODO: make this return a material using a custom shader to fade out the opacity
    // ideally the opacity will be close to 1 where the beam hits the area target,
    // and fades out to 0 or 0.1 after a meter or two, so that it just indicates the direction without being too intense
    function getBeamMaterial(color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        return new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
    }

    // replace the existing cylinderMesh object with a new cylinderMesh with updated start and end points
    function updateCylinderMesh(obj, startPoint, endPoint, color) {
        obj.geometry.dispose();
        obj.material.dispose();

        realityEditor.gui.threejsScene.removeFromScene(obj);
        return cylinderMesh(startPoint, endPoint, color);
    }

    // adds a circular label with enough space for two initials, e.g. "BR" (but hides it if no initials provided)
    function createTextLabel(objectKey, initials) {
        let labelContainer = document.createElement('div');
        labelContainer.id = 'avatarBeamLabelContainer_' + objectKey;
        labelContainer.classList.add('avatarBeamLabel');
        document.body.appendChild(labelContainer);

        let label = document.createElement('div');
        label.id = 'avatarBeamLabel_' + objectKey;
        labelContainer.appendChild(label);

        if (initials) {
            label.innerText = initials;
            labelContainer.classList.remove('displayNone');
        } else {
            label.innerText = initials;
            labelContainer.classList.add('displayNone');
        }

        return labelContainer;
    }

    // update the laser beam text label with this name's initials
    function updateAvatarName(objectKey, name) {
        let matchingTextLabel = document.getElementById('avatarBeamLabel_' + objectKey);
        if (matchingTextLabel) {
            let initials = realityEditor.avatar.utils.getInitialsFromName(name);
            if (initials) {
                matchingTextLabel.innerText = initials;
                matchingTextLabel.parentElement.classList.remove('displayNone');
            } else {
                matchingTextLabel.innerText = '';
                matchingTextLabel.parentElement.classList.add('displayNone');
            }
        }
    }

    // when sending a beam, highlight your cursor
    function renderCursorOverlay(isVisible, screenX, screenY, color) {
        let overlay = document.getElementById('beamOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'beamOverlay';
            overlay.style.position = 'absolute';
            overlay.style.left = '-10px';
            overlay.style.top = '-10px';
            overlay.style.pointerEvents = 'none';
            overlay.style.width = '20px';
            overlay.style.height = '20px';
            overlay.style.borderRadius = '10px';
            overlay.style.backgroundColor = color;
            overlay.style.opacity = '0.5';
            document.body.appendChild(overlay);
        }
        overlay.style.transform = 'translate3d(' + screenX + 'px, ' + screenY + 'px, 1201px)';
        overlay.style.display = isVisible ? 'inline' : 'none';
    }

    // Shows an "Establishing Connection..." --> "Connected!" label in the top left
    function renderConnectionFeedback(isConnected) {
        if (!statusUI) {
            statusUI = document.createElement('div');
            statusUI.id = 'avatarStatus';
            statusUI.classList.add('topLeftInfoText');
            statusUI.style.opacity = '0.5';
            statusUI.style.left = '5px';
            statusUI.style.top = (realityEditor.device.environment.variables.screenTopOffset + 5) + 'px';
            document.body.appendChild(statusUI);
        }
        if (hasConnectionFeedbackBeenShown) { return; }
        if (isConnected) {
            hasConnectionFeedbackBeenShown = true;
            statusUI.innerText = '';
            setTimeout(() => {
                statusUI.innerText = 'Avatar Connected!';
                setTimeout(() => {
                    statusUI.innerText = '';
                    statusUI.style.display = 'none';
                }, 2000);
            }, 300);
        } else {
            statusUI.innerText = 'Establishing Avatar Connection...'
        }
    }

    // show some debug text fields in the top left corner of the screen to track data connections and transmission
    function renderConnectionDebugInfo(connectionStatus, debugConnectionStatus, myId, debugMode) {
        if (!debugMode) {
            if (debugUI) { debugUI.style.display = 'none'; }
            return;
        }

        if (!debugUI) {
            debugUI = document.createElement('div');
            debugUI.id = 'avatarConnectionStatus';
            debugUI.classList.add('topLeftInfoText');
            debugUI.style.top = realityEditor.device.environment.variables.screenTopOffset + 'px';
            document.body.appendChild(debugUI);
        }
        let sendText = debugConnectionStatus.didSendAnything && debugConnectionStatus.didRecentlySend ? 'TRUE' : debugConnectionStatus.didSendAnything ? 'true' : 'false';
        let receiveText = debugConnectionStatus.didReceiveAnything && debugConnectionStatus.didRecentlyReceive ? 'TRUE' : debugConnectionStatus.didReceiveAnything ? 'true' : 'false';

        debugUI.style.display = '';
        debugUI.innerHTML = 'Localized? (' + connectionStatus.isLocalized +').  ' +
            'Created? (' + connectionStatus.isMyAvatarCreated + ').' +
            '<br/>' +
            'Verified? (' + connectionStatus.isMyAvatarInitialized + ').  ' +
            'Occlusion? (' + connectionStatus.isWorldOcclusionObjectAdded + ').' +
            '<br/>' +
            'Subscribed? (' + debugConnectionStatus.subscribedToHowMany + ').  ' +
            '<br/>' +
            'Did Send? (' + sendText + ').  ' +
            'Did Receive? (' + receiveText + ')' +
            '<br/>' +
            'My ID: ' + (myId ? myId : 'null');
    }

    exports.renderOtherAvatars = renderOtherAvatars;
    exports.updateAvatarName = updateAvatarName;
    exports.renderCursorOverlay = renderCursorOverlay;
    exports.renderConnectionFeedback = renderConnectionFeedback;
    exports.renderConnectionDebugInfo = renderConnectionDebugInfo;

}(realityEditor.avatar.draw));
