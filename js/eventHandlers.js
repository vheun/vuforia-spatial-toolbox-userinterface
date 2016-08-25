/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *              ╦ ╦┬ ┬┌┐ ┬─┐┬┌┬┐  ╔═╗┌┐  ┬┌─┐┌─┐┌┬┐┌─┐
 *              ╠═╣└┬┘├┴┐├┬┘│ ││  ║ ║├┴┐ │├┤ │   │ └─┐
 *              ╩ ╩ ┴ └─┘┴└─┴─┴┘  ╚═╝└─┘└┘└─┘└─┘ ┴ └─┘
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param evt
 **/

function touchDown(evt) {
    if (!globalStates.editingMode) {
        if (!globalStates.guiButtonState) {
            if (!globalProgram.objectA) {
                globalProgram.objectA = this.objectId;
                globalProgram.nodeA = this.nodeId;
            }
        }
    } else {
        globalStates.editingModeObject = this.objectId;
        globalStates.editingModeLocation = this.nodeId;
        globalStates.editingModeHaveObject = true;
    }
    cout("touchDown");
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 **/

function falseTouchUp() {
    if (!globalStates.guiButtonState) {
        globalProgram.objectA = false;
        globalProgram.nodeA = false;
    }
    globalCanvas.hasContent = true;
    cout("falseTouchUp");
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 **/

function trueTouchUp() {
    if (!globalStates.guiButtonState) {
        if (globalProgram.objectA) {

            var thisTempObject = objects[globalProgram.objectA];
            var thisTempObjectLinks = thisTempObject.links;

            globalProgram.objectB = this.objectId;
            globalProgram.nodeB = this.nodeId;
            var thisOtherTempObject = objects[globalProgram.objectB];

            var okForNewLink = checkForNetworkLoop(globalProgram.objectA, globalProgram.nodeA, globalProgram.objectB, globalProgram.nodeB);

            //  window.location.href = "of://event_" + objects[globalProgram.objectA].visible;

            if (okForNewLink) {
                var thisKeyId = uuidTimeShort();

                thisTempObjectLinks[thisKeyId] = {
                    objectA: globalProgram.objectA,
                    objectB: globalProgram.objectB,
                    nodeA: globalProgram.nodeA,
                    nodeB: globalProgram.nodeB,
                    nameA: thisTempObject.name,
                    nameB: thisOtherTempObject.name
                };

                // push new connection to objectA
                uploadNewLink(thisTempObject.ip, globalProgram.objectA, thisKeyId, thisTempObjectLinks[thisKeyId]);
            }

            // set everything back to false
            globalProgram.objectA = false;
            globalProgram.nodeA = false;
            globalProgram.objectB = false;
            globalProgram.nodeB = false;
        }
    }
    globalCanvas.hasContent = true;

    cout("trueTouchUp");
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param evt
 **/

function canvasPointerDown(evt) {
    if (!globalStates.guiButtonState && !globalStates.editingMode) {
        if (!globalProgram.objectA) {
            globalStates.drawDotLine = true;
            globalStates.drawDotLineX = evt.clientX;
            globalStates.drawDotLineY = evt.clientY;

        }
    }

    cout("canvasPointerDown");
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param evt
 **/

function getPossition(evt) {

    globalStates.pointerPosition = [evt.clientX, evt.clientY];

    overlayDiv.style.left = evt.clientX - 60;
    overlayDiv.style.top = evt.clientY - 60;

    cout("getPossition");

}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param evt
 **/

function documentPointerUp(evt) {

    globalStates.pointerPosition = [-1, -1];

    globalStates.overlay = 0;

    if (!globalStates.guiButtonState) {
        falseTouchUp();
        if (!globalProgram.objectA && globalStates.drawDotLine) {
            deleteLines(globalStates.drawDotLineX, globalStates.drawDotLineY, evt.clientX, evt.clientY);
        }
        globalStates.drawDotLine = false;
    }
    globalCanvas.hasContent = true;

    overlayDiv.style.display = "none";

    cout("documentPointerUp");
};

/**
 * @desc
 * @param evt
 **/

function documentPointerDown(evt) {

    globalStates.pointerPosition = [evt.clientX, evt.clientY];

    // overlayImg.src = overlayImage[globalStates.overlay].src;

    overlayDiv.style.display = "inline";
    overlayDiv.style.left = evt.clientX - 60;
    overlayDiv.style.top = evt.clientY - 60;

    cout("documentPointerDown");
}

/**
 * @desc
 * @param evt
 **/

function MultiTouchStart(evt) {
    evt.preventDefault();
// generate action for all links to be reloaded after upload

    if (globalStates.editingMode && evt.targetTouches.length === 1) {
        globalStates.editingModeObject = this.objectId;
        globalStates.editingModeLocation = this.nodeId;
        globalStates.editingModeHaveObject = true;
    }
    globalMatrix.matrixtouchOn = this.nodeId;
    globalMatrix.copyStillFromMatrixSwitch = true;
    cout("MultiTouchStart");
}

/**
 * @desc
 * @param evt
 **/

function MultiTouchMove(evt) {
    evt.preventDefault();
// generate action for all links to be reloaded after upload

    // cout(globalStates.editingModeHaveObject + " " + globalStates.editingMode + " " + globalStates.editingModeHaveObject + " " + globalStates.editingMode);

    if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 1) {

        var touch = evt.touches[0];

        globalStates.editingModeObjectX = touch.pageX;
        globalStates.editingModeObjectY = touch.pageY;

        var tempThisObject = {};
        if (globalStates.editingModeObject !== globalStates.editingModeLocation) {
            tempThisObject = objects[globalStates.editingModeObject].nodes[globalStates.editingModeLocation];
        } else {
            tempThisObject = objects[globalStates.editingModeObject];
        }

       var matrixTouch = screenCoordinatesToMatrixXY(tempThisObject, [touch.pageX, touch.pageY]);

        if (matrixTouch) {
            tempThisObject.x = matrixTouch[0];
            tempThisObject.y = matrixTouch[1];
        }
    }

    if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 2) {
        scaleEvent(evt.touches[1]);
    }

    cout("MultiTouchMove");
}

/**
 * @desc
 * @param evt
 **/

function MultiTouchEnd(evt) {


    evt.preventDefault();
// generate action for all links to be reloaded after upload
    if (globalStates.editingModeHaveObject) {

        cout("start");
        // this is where it should be send to the object..

        var tempThisObject = {};
        if (globalStates.editingModeObject != globalStates.editingModeLocation) {
            tempThisObject = objects[globalStates.editingModeObject].nodes[globalStates.editingModeLocation];
        } else {
            tempThisObject = objects[globalStates.editingModeObject];
        }

        var content = {};
        content.x = tempThisObject.x;
        content.y = tempThisObject.y;
        content.scale = tempThisObject.scale;

        if (globalStates.unconstrainedPositioning === true) {
            tempThisObject.matrix = copyMatrix(multiplyMatrix(tempThisObject.begin, invertMatrix(tempThisObject.temp)));
            content.matrix = tempThisObject.matrix;

        }

        if (typeof content.x === "number" && typeof content.y === "number" && typeof content.scale === "number") {
            postData('http://' + objects[globalStates.editingModeObject].ip + ':' + httpPort + '/object/' + globalStates.editingModeObject + "/size/" + globalStates.editingModeLocation, content);
        }

        globalStates.editingModeHaveObject = false;
        globalCanvas.hasContent = true;
        globalMatrix.matrixtouchOn = "";
    }
    cout("MultiTouchEnd");
}

/**
 * @desc
 * @param evt
 **/

function MultiTouchCanvasStart(evt) {

    globalStates.overlay = 1;

    evt.preventDefault();
// generate action for all links to be reloaded after upload
    if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 1) {
        var touch = evt.touches[1];

        globalStates.editingScaleX = touch.pageX;
        globalStates.editingScaleY = touch.pageY;
        globalStates.editingScaledistance = Math.sqrt(Math.pow((globalStates.editingModeObjectX - globalStates.editingScaleX), 2) + Math.pow((globalStates.editingModeObjectY - globalStates.editingScaleY), 2));

        var tempThisObject = {};
        if (globalStates.editingModeObject != globalStates.editingModeLocation) {
            tempThisObject = objects[globalStates.editingModeObject].nodes[globalStates.editingModeLocation];
        } else {
            tempThisObject = objects[globalStates.editingModeObject];
        }
        globalStates.editingScaledistanceOld = tempThisObject.scale;
    }
    cout("MultiTouchCanvasStart");
}

/**
 * @desc
 * @param evt
 **/

function MultiTouchCanvasMove(evt) {
    evt.preventDefault();
// generate action for all links to be reloaded after upload
    if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 1) {
        var touch = evt.touches[1];

        //globalStates.editingModeObjectY
        //globalStates.editingScaleX
        scaleEvent(touch)

    }
    cout("MultiTouchCanvasMove");
}

/**
 * @desc
 * @param touch
 **/

function scaleEvent(touch) {
    var thisRadius = Math.sqrt(Math.pow((globalStates.editingModeObjectX - touch.pageX), 2) + Math.pow((globalStates.editingModeObjectY - touch.pageY), 2));
    var thisScale = (thisRadius - globalStates.editingScaledistance) / 300 + globalStates.editingScaledistanceOld;

    // cout(thisScale);

    var tempThisObject = {};
    if (globalStates.editingModeObject != globalStates.editingModeLocation) {
        tempThisObject = objects[globalStates.editingModeObject].nodes[globalStates.editingModeLocation];
    } else {
        tempThisObject = objects[globalStates.editingModeObject];
    }
    if (thisScale < 0.2)thisScale = 0.2;
    if (typeof thisScale === "number" && thisScale > 0) {
        tempThisObject.scale = thisScale;
    }
    globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);
    //drawRed(globalCanvas.context, [globalStates.editingModeObjectX,globalStates.editingModeObjectY],[touch.pageX,touch.pageY],globalStates.editingScaledistance);
    drawBlue(globalCanvas.context, [globalStates.editingModeObjectX, globalStates.editingModeObjectY], [touch.pageX, touch.pageY], globalStates.editingScaledistance);

    if (thisRadius < globalStates.editingScaledistance) {

        drawRed(globalCanvas.context, [globalStates.editingModeObjectX, globalStates.editingModeObjectY], [touch.pageX, touch.pageY], thisRadius);

    } else {
        drawGreen(globalCanvas.context, [globalStates.editingModeObjectX, globalStates.editingModeObjectY], [touch.pageX, touch.pageY], thisRadius);

    }
    cout("scaleEvent");
}

/**
 * @desc
 * @param url
 * @param body
 **/

function postData(url, body) {

    var request = new XMLHttpRequest();
    var params = JSON.stringify(body);
    request.open('POST', url, true);
    request.onreadystatechange = function () {
        if (request.readyState == 4) cout("It worked!");
    };
    request.setRequestHeader("Content-type", "application/json");
    //request.setRequestHeader("Content-length", params.length);
    // request.setRequestHeader("Connection", "close");
    request.send(params);
    cout("postData");
}

/**
 * @desc
 * @param url
 **/

function deleteData(url) {

    var request = new XMLHttpRequest();
    request.open('DELETE', url, true);
    request.onreadystatechange = function () {
        if (request.readyState == 4) cout("It deleted!");
    };
    request.setRequestHeader("Content-type", "application/json");
    //request.setRequestHeader("Content-length", params.length);
    // request.setRequestHeader("Connection", "close");
    request.send();
    cout("deleteData");
}

/**
 * @desc
 * @param ip
 * @param thisObjectKey
 * @param thisKey
 * @param content
 **/

function uploadNewLink(ip, thisObjectKey, thisKey, content) {
// generate action for all links to be reloaded after upload
    cout("sending Link");
    postData('http://' + ip + ':' + httpPort + '/object/' + thisObjectKey + "/link/" + thisKey, content);
    // postData('http://' +ip+ ':' + httpPort+"/", content);
    cout("uploadNewLink");

}

/**
 * @desc
 * @param ip
 * @param thisObjectKey
 * @param thisKey
 * @return
 **/

function deleteLinkFromObject(ip, thisObjectKey, thisKey) {
// generate action for all links to be reloaded after upload
    cout("I am deleting a link: " + ip);
    deleteData('http://' + ip + ':' + httpPort + '/object/' + thisObjectKey + "/link/" + thisKey);
    cout("deleteLinkFromObject");
}

/**
 * @desc
 **/

function addEventHandlers() {

    globalCanvas.canvas.addEventListener("touchstart", MultiTouchCanvasStart, false);
    ec++;
    globalCanvas.canvas.addEventListener("touchmove", MultiTouchCanvasMove, false);
    ec++;

    for (var thisKey in objects) {
        var generalObject2 = objects[thisKey];

        if (generalObject2.developer) {

            if (document.getElementById(thisKey)) {
                var thisObject3 = document.getElementById(thisKey);
                //  if (globalStates.guiButtonState) {
                thisObject3.style.visibility = "visible";

                var thisObject4 = document.getElementById("canvas" + thisKey);
                thisObject4.style.display = "inline";

                // }

                // thisObject3.className = "mainProgram";

                thisObject3.addEventListener("touchstart", MultiTouchStart, false);
                ec++;
                thisObject3.addEventListener("touchmove", MultiTouchMove, false);
                ec++;
                thisObject3.addEventListener("touchend", MultiTouchEnd, false);
                ec++;
                //}
            }

            for (var thisSubKey in generalObject2.nodes) {
                if (document.getElementById(thisSubKey)) {
                    var thisObject2 = document.getElementById(thisSubKey);

                    //thisObject2.className = "mainProgram";

                    var thisObject5 = document.getElementById("canvas" + thisSubKey);
                    thisObject5.style.display = "inline";

                    //if(thisObject.developer) {
                    thisObject2.addEventListener("touchstart", MultiTouchStart, false);
                    ec++;
                    thisObject2.addEventListener("touchmove", MultiTouchMove, false);
                    ec++;
                    thisObject2.addEventListener("touchend", MultiTouchEnd, false);
                    ec++;
                    //}
                }
            }
        }
    }

    cout("addEventHandlers");
}

/**
 * @desc
 **/

function removeEventHandlers() {

    globalCanvas.canvas.removeEventListener("touchstart", MultiTouchCanvasStart, false);
    ec--;
    globalCanvas.canvas.removeEventListener("touchmove", MultiTouchCanvasMove, false);
    ec--;
    for (var thisKey in objects) {
        var generalObject2 = objects[thisKey];
        if (generalObject2.developer) {
            if (document.getElementById(thisKey)) {
                var thisObject3 = document.getElementById(thisKey);
                thisObject3.style.visibility = "hidden";
                // this is a typo but maybe relevant?
                //  thisObject3.className = "mainEditing";

                document.getElementById("canvas" + thisKey).style.display = "none";

                thisObject3.removeEventListener("touchstart", MultiTouchStart, false);
                thisObject3.removeEventListener("touchmove", MultiTouchMove, false);
                thisObject3.removeEventListener("touchend", MultiTouchEnd, false);
                ec--;
                ec--;
                ec--;
                //  }
            }

            for (var thisSubKey in generalObject2.nodes) {
                if (document.getElementById(thisSubKey)) {
                    var thisObject2 = document.getElementById(thisSubKey);
                    //thisObject2.className = "mainEditing";
                    document.getElementById("canvas" + thisSubKey).style.display = "none";

                    //    if(thisObject.developer) {
                    thisObject2.removeEventListener("touchstart", MultiTouchStart, false);
                    thisObject2.removeEventListener("touchmove", MultiTouchMove, false);
                    thisObject2.removeEventListener("touchend", MultiTouchEnd, false);
                    ec--;
                    ec--;
                    ec--;
                    //  }
                }
            }

        }
    }

    cout("removeEventHandlers");
}