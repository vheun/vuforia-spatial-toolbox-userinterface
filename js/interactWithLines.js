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
 * @param x21 position x 1
 * @param y21 position y 1
 * @param x22 position x 2
 * @param y22 position y 2
 **/

function deleteLines(x21, y21, x22, y22) {
    // window.location.href = "of://gotsome";
    for (var keysome in objects) {
        if (!objects.hasOwnProperty(keysome)) {
            continue;
        }

        var thisObject = objects[keysome];
        for (var subKeysome in thisObject.links) {
            if (!thisObject.links.hasOwnProperty(subKeysome)) {
                continue;
            }
            var l = thisObject.links[subKeysome];
            var oA = thisObject;
            var oB = objects[l.objectB];
            var bA;
                if(l.logicA !== false){
                    bA = oA.logic[l.nodeA];
                } else {
                    bA = oA.nodes[l.nodeA];
                }

            var bB;

            if(l.logicB !== false){
                bB = oB.logic[l.nodeB];
            } else {
                bB = oB.nodes[l.nodeB];
            }

            if (bA === undefined || bB === undefined || oA === undefined || oB === undefined) {
                continue; //should not be undefined
            }
            if (checkLineCross(bA.screenX, bA.screenY, bB.screenX, bB.screenY, x21, y21, x22, y22, globalCanvas.canvas.width, globalCanvas.canvas.height)) {
                delete thisObject.links[subKeysome];
                cout("iam executing link deletion");
                //todo this is a work around to not crash the server. only temporarly for testing
                if(l.logicA === false && l.logicB === false)
                deleteLinkFromObject(thisObject.ip, keysome, subKeysome);
            }
        }
    }

}
/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param thisObject is a reference to an Hybrid Object
 * @param context is a reference to a html5 canvas object
 **/

function drawAllLines(thisObject, context) {
    for (var subKey in thisObject.links) {
        if (!thisObject.links.hasOwnProperty(subKey)) {
            continue;
        }
        var l = thisObject.links[subKey];
        var oA = thisObject;

        if (isNaN(l.ballAnimationCount))
            l.ballAnimationCount = 0;

        if (!objects.hasOwnProperty(l.objectB)) {
            continue;
        }
        var oB = objects[l.objectB];
        if(l.logicA !== false) {
            if (!oA.logic.hasOwnProperty(l.nodeA)) {
                continue;
            }
        } else {
            if (!oA.nodes.hasOwnProperty(l.nodeA)) {
                continue;
            }
        }

        if(l.logicB !== false) {
            if (!oB.logic.hasOwnProperty(l.nodeB)) {
                continue;
            }
        } else {
            if (!oB.nodes.hasOwnProperty(l.nodeB)) {
                continue;
            }
        }

        var bA;
        if(l.logicA !== false){
            bA = oA.logic[l.nodeA];
        } else {
            bA = oA.nodes[l.nodeA];
        }

        var bB;

        if(l.logicB !== false){
            bB = oB.logic[l.nodeB];
        } else {
            bB = oB.nodes[l.nodeB];
        }

        if (bA === undefined || bB === undefined || oA === undefined || oB === undefined) {
            continue; //should not be undefined
        }

        if (!oB.objectVisible) {
            bB.screenX = bA.screenX;
            bB.screenY = -10;
            bB.screenZ = bA.screenZ;
        }

        if (!oA.objectVisible) {
            bA.screenX = bB.screenX;
            bA.screenY = -10;
            bA.screenZ = bB.screenZ;
        }

        // linearize a non linear zBuffer
        var bAScreenZ =   bA.screenLinearZ;
        var bBScreenZ = bB.screenLinearZ;

        var logicA;
            if (l.logicA == null || l.logicA === false) {
                logicA = 4;
            } else {
                logicA = l.logicA;
            }

        var logicB;
        if (l.logicB == null || l.logicB === false) {
            logicB = 4;
        } else {
            logicB = l.logicB;
        }

        drawLine(context, [bA.screenX, bA.screenY], [bB.screenX, bB.screenY], bAScreenZ, bBScreenZ, l, timeCorrection,logicA,logicB);
    }
   // context.fill();
    globalCanvas.hasContent = true;
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 **/

function drawInteractionLines() {

    // this function here needs to be more precise

    if (globalProgram.objectA) {

        var oA = objects[globalProgram.objectA];


        var tempStart;
        if(globalProgram.logicA !== false)
            tempStart = oA.logic[globalProgram.nodeA];
        else
            tempStart = oA.nodes[globalProgram.nodeA];

        // this is for making sure that the line is drawn out of the screen... Don't know why this got lost somewhere down the road.
        // linearize a non linear zBuffer

        // map the linearized zBuffer to the final ball size
        if (!oA.objectVisible) {
            tempStart.screenX = globalStates.pointerPosition[0];
            tempStart.screenY = -10;
            tempStart.screenZ = 6;
        } else {
            if(tempStart.screenLinearZ)
            tempStart.screenZ = tempStart.screenLinearZ;
        }

        var logicA;
        if (globalProgram.logicA == null || globalProgram.logicA === false) {
            logicA = 4;
        } else {
            logicA = globalProgram.logicA;
        }

        drawLine(globalCanvas.context, [tempStart.screenX, tempStart.screenY], [globalStates.pointerPosition[0], globalStates.pointerPosition[1]], tempStart.screenZ, tempStart.screenZ, globalStates, timeCorrection, logicA, globalProgram.logicSelector);
    }

    if (globalStates.drawDotLine) {
        drawDotLine(globalCanvas.context, [globalStates.drawDotLineX, globalStates.drawDotLineY], [globalStates.pointerPosition[0], globalStates.pointerPosition[1]], 1, 1);
    }

    globalCanvas.hasContent = true;
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param context is html5 canvas object
 * @param lineStartPoint is an array of two numbers indicating the start for a line
 * @param lineEndPoint is an array of two numbers indicating the end for a line
 * @param lineStartWeight is a number indicating the weight of a line at start
 * @param lineEndWeight is a number indicating the weight of a line at end
 * @param linkObject that contains ballAnimationCount
 * @param timeCorrector is a number that is regulating the animation speed according to the frameRate
 * @param startColor beinning color
 * @param endColor end color
 * @return
 **/

function drawLine(context, lineStartPoint, lineEndPoint, lineStartWeight, lineEndWeight, linkObject, timeCorrector, startColor, endColor) {
    var angle = Math.atan2((lineStartPoint[1] - lineEndPoint[1]), (lineStartPoint[0] - lineEndPoint[0]));
    var possitionDelta = 0;
    var length1 = lineEndPoint[0] - lineStartPoint[0];
    var length2 = lineEndPoint[1] - lineStartPoint[1];
    var lineVectorLength = Math.sqrt(length1 * length1 + length2 * length2);
    var keepColor = lineVectorLength / 6;
    var spacer = 2.3;
    var ratio = 0;
    var mathPI = 2*Math.PI;
    var newColor = [255,255,255];
    var colors = [[0,255,255], // Blue
                  [0,255,0],   // Green
                  [255,255,0], // Yellow
                  [255,0,124],
                  [255,255,255]];// Red

    if (linkObject.ballAnimationCount >= lineStartWeight * spacer)  linkObject.ballAnimationCount = 0;

    while (possitionDelta + linkObject.ballAnimationCount < lineVectorLength) {
        var ballPossition = possitionDelta + linkObject.ballAnimationCount;

        ratio = map(ballPossition, 0, lineVectorLength, 0, 1);
        for (var i = 0; i < 3; i++) {
            newColor[i] = (Math.floor(parseInt(colors[startColor][i], 10) + (colors[endColor][i] - colors[startColor][i]) * ratio));
        }

        var ballSize = map(ballPossition, 0, lineVectorLength, lineStartWeight, lineEndWeight);

        var x__ = lineStartPoint[0] - Math.cos(angle) * ballPossition;
        var y__ = lineStartPoint[1] - Math.sin(angle) * ballPossition;
        possitionDelta += ballSize * spacer;
        context.beginPath();
        context.fillStyle = "rgb("+newColor+")";
        context.arc(x__, y__, ballSize, 0, mathPI);
        context.fill();
    }
    linkObject.ballAnimationCount += (lineStartWeight * timeCorrector.delta)+1;
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

 function drawDatacraftingLine(context, linkObject, lineStartWeight, startColor, endColor, timeCorrector ) {
    var mathPI = 2*Math.PI;
    var spacer = 2.3;

    var pointData = linkObject.route.pointData;

    var blueToRed = (startColor.h === 180) && (endColor.h === 333);
    var redToBlue = (startColor.h === 333) && (endColor.h === 180);

    var percentIncrement = (lineStartWeight * spacer)/pointData.totalLength;

    if (linkObject.ballAnimationCount >= percentIncrement) {
        linkObject.ballAnimationCount = 0;
    }

    var hue = startColor;
    var transitionColorRight = (endColor.h - startColor.h > 180 || blueToRed);
    var transitionColorLeft = (endColor.h - startColor.h < -180 || redToBlue);
    var color;

    for (var i = 0; i < 1.0; i += percentIncrement) {
        var percentage = i + linkObject.ballAnimationCount;
        var position = linkObject.route.getXYPositionAtPercentage(percentage);
        if (position !== null) {
            if (transitionColorRight) {
                // looks better to go down rather than up
                hue = ((1.0 - percentage) * startColor.h + percentage * (endColor.h - 360)) % 360;
            } else if (transitionColorLeft) {
                // looks better to go up rather than down
                hue = ((1.0 - percentage) * startColor.h + percentage * (endColor.h + 360)) % 360;
            } else {
                hue = (1.0 - percentage) * startColor.h + percentage * endColor.h;
            }
            context.beginPath();
            context.fillStyle = 'hsl(' + hue + ', 100%, 60%)';
            context.arc(position.screenX, position.screenY, lineStartWeight, 0, mathPI);
            context.fill();
        }
    }

    var numFramesForAnimationLoop = 30;
    linkObject.ballAnimationCount += percentIncrement/numFramesForAnimationLoop;
}

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param b1
 * @param b2
 **/

function drawDotLine(context, lineStartPoint, lineEndPoint, b1, b2) {
    context.beginPath();
    context.moveTo(lineStartPoint[0], lineStartPoint[1]);
    context.lineTo(lineEndPoint[0], lineEndPoint[1]);
    context.setLineDash([7]);
    context.lineWidth = 2;
    context.strokeStyle = "#ff019f";//"#00fdff";
    context.stroke();
    context.closePath();
}

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

function drawGreen(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#7bff08";
    context.lineWidth = 2;
    context.setLineDash([7]);
    context.stroke();
    context.closePath();

}

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

function drawRed(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#ff036a";
    context.lineWidth = 2;
    context.setLineDash([7]);
    context.stroke();
    context.closePath();
}

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

function drawBlue(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#01fffd";
    context.lineWidth = 2;
    context.setLineDash([7]);
    context.stroke();
    context.closePath();
}

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

function drawYellow(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#FFFF00";
    context.lineWidth = 2;
    context.setLineDash([7]);
    context.stroke();
    context.closePath();
}

