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
/*********************************************************************************************************************
 ******************************************** TODOS *******************************************************************
 **********************************************************************************************************************

 **
 * TODO -
 **

 **********************************************************************************************************************
 ******************************************** GUI content *********************+++*************************************
 **********************************************************************************************************************/


var freezeButtonImage = [];
var guiButtonImage = [];
var preferencesButtonImage = [];
var reloadButtonImage = [];
var resetButtonImage = [];
var unconstButtonImage = [];
var editingButtonImage = [];
var loadNewUiImage = [];

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 **/

function GUI() {

    preload(freezeButtonImage,
        'png/freeze.png', 'png/freezeOver.png', 'png/freezeSelect.png', 'png/freezeEmpty.png'
    );
    preload(guiButtonImage,
        'png/intOneOver.png', 'png/intOneSelect.png', 'png/intTwoOver.png', 'png/intTwoSelect.png', 'png/intEmpty.png'
    );
    preload(preferencesButtonImage,
        'png/pref.png', 'png/prefOver.png', 'png/prefSelect.png', 'png/prefEmpty.png'
    );
    preload(reloadButtonImage,
        'png/reloadOver.png', 'png/reload.png', 'png/reloadEmpty.png'
    );
    preload(resetButtonImage,
        'png/reset.png', 'png/resetOver.png', 'png/resetSelect.png', 'png/resetEmpty.png'
    );

    preload(unconstButtonImage,
        'png/unconst.png', 'png/unconstOver.png', 'png/unconstSelect.png', 'png/unconstEmpty.png'
    );

    preload(loadNewUiImage,
        'png/load.png', 'png/loadOver.png'
    );

    document.getElementById("guiButtonImage1").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode)     document.getElementById('guiButtonImage').src = guiButtonImage[0].src;
        // kickoff();
    });
    ec++;

    document.getElementById("guiButtonImage1").addEventListener("touchend", function () {
        if (globalStates.guiButtonState === false) {
            if (!globalStates.UIOffMode)      document.getElementById('guiButtonImage').src = guiButtonImage[1].src;
            globalStates.guiButtonState = true;
            datacraftingVisible();
        }
        else {
            if (!globalStates.UIOffMode)     document.getElementById('guiButtonImage').src = guiButtonImage[1].src;
        }

    });
    ec++;

    document.getElementById("guiButtonImage2").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode)     document.getElementById('guiButtonImage').src = guiButtonImage[2].src;
    });
    ec++;

    document.getElementById("guiButtonImage2").addEventListener("touchend", function () {
        if (globalStates.guiButtonState === true) {
            if (!globalStates.UIOffMode)     document.getElementById('guiButtonImage').src = guiButtonImage[3].src;
            globalStates.guiButtonState = false;
            datacraftingHide();
        }
        else {
            if (!globalStates.UIOffMode)    document.getElementById('guiButtonImage').src = guiButtonImage[3].src;
        }
    });
    ec++;

    document.getElementById("extendedTrackingSwitch").addEventListener("change", function () {
        if (document.getElementById("extendedTrackingSwitch").checked) {
            globalStates.extendedTracking = true;
            window.location.href = "of://extendedTrackingOn";
        } else {
            globalStates.extendedTracking = false;
            window.location.href = "of://extendedTrackingOff";
        }
    });
    ec++;

    document.getElementById("editingModeSwitch").addEventListener("change", function () {

        if (document.getElementById("editingModeSwitch").checked) {
            addEventHandlers();
            globalStates.editingMode = true;
            window.location.href = "of://developerOn";
            globalMatrix.matrixtouchOn = "";
        } else {
            removeEventHandlers();
            globalStates.editingMode = false;
            window.location.href = "of://developerOff";
        }
    });
    ec++;

    document.getElementById("turnOffUISwitch").addEventListener("change", function () {
        if (document.getElementById("turnOffUISwitch").checked) {
            globalStates.UIOffMode = true;
            timeForContentLoaded = 240000;
            window.location.href = "of://clearSkyOn";

        } else {
            globalStates.UIOffMode = false;
            timeForContentLoaded = 240;
            window.location.href = "of://clearSkyOff";

        }
    });
    ec++;

    document.getElementById("resetButton").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode)    document.getElementById('resetButton').src = resetButtonImage[1].src;

    });
    ec++;

    document.getElementById("resetButton").addEventListener("touchend", function () {

        if (!globalStates.UIOffMode)    document.getElementById('resetButton').src = resetButtonImage[0].src;
        //  window.location.href = "of://loadNewUI"+globalStates.newURLText;

        for (var key in objects) {
            if (!globalObjects.hasOwnProperty(key)) {
                continue;
            }

            var tempResetObject = objects[key];

            if (globalStates.guiButtonState) {
                tempResetObject.matrix = [];

                tempResetObject.x = 0;
                tempResetObject.y = 0;
                tempResetObject.scale = 1;

                sendResetContent(key, key);
            }

            for (var subKey in tempResetObject.nodes) {
                var tempResetValue = tempResetObject.nodes[subKey];

                if (!globalStates.guiButtonState) {

                    tempResetValue.matrix = [];

                    tempResetValue.x = randomIntInc(0, 200) - 100;
                    tempResetValue.y = randomIntInc(0, 200) - 100;
                    tempResetValue.scale = 1;

                    sendResetContent(key, subKey);
                }

            }

        }

    });
    ec++;

    /**
     * @desc
     * @param object
     * @param node
     **/

    function sendResetContent(object, node) {
// generate action for all links to be reloaded after upload

        var tempThisObject = {};
        if (object != node) {
            tempThisObject = objects[object].nodes[node];
        } else {
            tempThisObject = objects[object];
        }

        var content = {};
        content.x = tempThisObject.x;
        content.y = tempThisObject.y;
        content.scale = tempThisObject.scale;

        if (typeof tempThisObject.matrix === "object") {
            content.matrix = tempThisObject.matrix;
        }

        if (typeof content.x === "number" && typeof content.y === "number" && typeof content.scale === "number") {
            postData('http://' + objects[object].ip + ':' + httpPort + '/object/' + object + "/size/" + node, content);
        }

    }

    document.getElementById("unconstButton").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode) document.getElementById('unconstButton').src = unconstButtonImage[1].src;
    });
    ec++;

    document.getElementById("unconstButton").addEventListener("touchend", function () {
        if (globalStates.unconstrainedPositioning === true) {
            if (!globalStates.UIOffMode)    document.getElementById('unconstButton').src = unconstButtonImage[0].src;
            globalStates.unconstrainedPositioning = false;

        }
        else {
            if (!globalStates.UIOffMode)    document.getElementById('unconstButton').src = unconstButtonImage[2].src;
            globalStates.unconstrainedPositioning = true;

        }

    });
    ec++;

    document.getElementById("loadNewUI").addEventListener("touchstart", function () {
        if (globalStates.extendedTracking === true) {
            if (!globalStates.UIOffMode)    document.getElementById('loadNewUI').src = loadNewUiImage[3].src;
        }
        else {
            if (!globalStates.UIOffMode)    document.getElementById('loadNewUI').src = loadNewUiImage[1].src;
        }
    });
    ec++;

    document.getElementById("loadNewUI").addEventListener("touchend", function () {

        if (!globalStates.UIOffMode)    document.getElementById('loadNewUI').src = loadNewUiImage[0].src;
        window.location.href = "of://loadNewUI" + globalStates.newURLText;

    });
    ec++;

    document.getElementById("preferencesButton").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode)    document.getElementById('preferencesButton').src = preferencesButtonImage[1].src;
    });
    ec++;

    document.getElementById("preferencesButton").addEventListener("touchend", function () {
        if (globalStates.preferencesButtonState === true) {
            preferencesHide();
            overlayDiv.style.display = "none";

            if (globalStates.editingMode) {
                document.getElementById('resetButton').style.visibility = "visible";
                document.getElementById('unconstButton').style.visibility = "visible";
                document.getElementById('resetButtonDiv').style.display = "inline";
                document.getElementById('unconstButtonDiv').style.display = "inline";
            }

            if (globalStates.UIOffMode) {
                document.getElementById('preferencesButton').src = preferencesButtonImage[3].src;
                document.getElementById('feezeButton').src = freezeButtonImage[3].src;
                document.getElementById('reloadButton').src = reloadButtonImage[2].src;
                document.getElementById('guiButtonImage').src = guiButtonImage[4].src;
                document.getElementById('resetButton').src = resetButtonImage[3].src;
                document.getElementById('unconstButton').src = unconstButtonImage[3].src;
            }

        }
        else {

            document.getElementById('resetButton').style.visibility = "hidden";
            document.getElementById('unconstButton').style.visibility = "hidden";
            document.getElementById('resetButtonDiv').style.display = "none";
            document.getElementById('unconstButtonDiv').style.display = "none";

            addElementInPreferences();

            preferencesVisible();

            overlayDiv.style.display = "inline";

            if (globalStates.UIOffMode) {
                document.getElementById('preferencesButton').src = preferencesButtonImage[0].src;
                document.getElementById('feezeButton').src = freezeButtonImage[0].src;
                document.getElementById('reloadButton').src = reloadButtonImage[0].src;
                document.getElementById('guiButtonImage').src = guiButtonImage[1].src;
                document.getElementById('resetButton').src = resetButtonImage[0].src;
                document.getElementById('unconstButton').src = unconstButtonImage[0].src;
            }

        }

    });
    ec++;

    document.getElementById("feezeButton").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode) document.getElementById('feezeButton').src = freezeButtonImage[1].src;
    });
    ec++;
    document.getElementById("feezeButton").addEventListener("touchend", function () {
        if (globalStates.feezeButtonState === true) {
            if (!globalStates.UIOffMode)    document.getElementById('feezeButton').src = freezeButtonImage[0].src;
            globalStates.feezeButtonState = false;
            window.location.href = "of://unfreeze";
        }
        else {
            if (!globalStates.UIOffMode)    document.getElementById('feezeButton').src = freezeButtonImage[2].src;
            globalStates.feezeButtonState = true;
            window.location.href = "of://freeze";
        }

    });

    ec++;
    document.getElementById("reloadButton").addEventListener("touchstart", function () {
        if (!globalStates.UIOffMode)    document.getElementById('reloadButton').src = reloadButtonImage[0].src;
        window.location.href = "of://reload";
    });
    ec++;
    document.getElementById("reloadButton").addEventListener("touchend", function () {
        // location.reload(true);

        window.open("index.html?v=" + Math.floor((Math.random() * 100) + 1));
    });
    ec++;
    cout("GUI");
}

/**
 * @desc
 **/

function preferencesHide() {
    if (!globalStates.UIOffMode)    document.getElementById('preferencesButton').src = preferencesButtonImage[0].src;
    globalStates.preferencesButtonState = false;
    document.getElementById("preferences").style.visibility = "hidden"; //= "hidden";
    document.getElementById("preferences").style.dispaly = "none"; //= "hidden";
    cout("preferencesHide");
}

/**
 * @desc
 **/

function preferencesVisible() {
    if (!globalStates.UIOffMode)    document.getElementById('preferencesButton').src = preferencesButtonImage[2].src;
    globalStates.preferencesButtonState = true;
    document.getElementById("preferences").style.visibility = "visible"; //
    document.getElementById("preferences").style.display = "inline"; //= "hidden";
    cout("preferencesVisible");
}

/**********************************************************************************************************************
 ******************************************* datacrafting GUI  *******************************************************
 **********************************************************************************************************************/

function datacraftingVisible() {
    globalStates.datacraftingVisible = true;
    document.getElementById("datacrafting-container").style.display = 'inline';
    addDatacraftingEventListeners();
}

function datacraftingHide() {
    globalStates.datacraftingVisible = false;
    document.getElementById("datacrafting-container").style.display = 'none';
    removeDatacraftingEventListeners();
}

function addDatacraftingEventListeners() {
    logic1.grid.cells.forEach( function(cell) {
        if (cell.domElement) {
            cell.domElement.addEventListener("pointerdown", blockPointerDown);
            cell.domElement.addEventListener("pointerenter", blockPointerEnter);
            cell.domElement.addEventListener("pointerleave", blockPointerLeave);
            cell.domElement.addEventListener("pointerup", blockPointerUp);            
        }
    });
    var blocksContainer = document.getElementById('blocks');
    blocksContainer.addEventListener("pointerup", datacraftingContainerPointerUp);
    blocksContainer.addEventListener("pointerdown", datacraftingContainerPointerDown);
    blocksContainer.addEventListener("pointermove", datacraftingContainerPointerMove);
}

function removeDatacraftingEventListeners() {
    logic1.grid.cells.forEach( function(cell) {
        if (cell.domElement) {
            cell.domElement.removeEventListener("pointerdown", blockPointerDown);
            cell.domElement.removeEventListener("pointerenter", blockPointerEnter);
            cell.domElement.removeEventListener("pointerleave", blockPointerLeave);
            cell.domElement.removeEventListener("pointerup", blockPointerUp);
        }
    });
    var blocksContainer = document.getElementById('blocks');
    blocksContainer.removeEventListener("pointerup", datacraftingContainerPointerUp);
    blocksContainer.removeEventListener("pointerdown", datacraftingContainerPointerDown);
    blocksContainer.removeEventListener("pointermove", datacraftingContainerPointerMove);
}

// should only be called once to initialize a blank datacrafting interface and data model
function initializeDatacraftingGrid() {
    var container = document.getElementById('datacrafting-container');
    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    var blockWidth = 2 * (containerWidth / 11);
    var blockHeight = (containerHeight / 7);
    var marginWidth = (containerWidth / 11);
    var marginHeight = blockHeight;

    logic1 = new Logic();

    // grid = new Grid(gridSize, blockWidth, blockHeight, marginWidth, marginHeight); //130, 65, 65, 65);
    logic1.grid = new Grid(blockWidth, blockHeight, marginWidth, marginHeight); //130, 65, 65, 65);
    var datacraftingCanvas = document.getElementById("datacraftingCanvas");
    var dimensions = logic1.grid.getPixelDimensions();

    datacraftingCanvas.width = dimensions.width;
    datacraftingCanvas.style.width = dimensions.width;
    datacraftingCanvas.height = dimensions.height;
    datacraftingCanvas.style.height = dimensions.height;

    ///////////
    // debugging only... shouldn't have blocks by default
    logic1.grid.cells.forEach(function(cell) {
        if (cell.canHaveBlock()) {
            // cell.block = new Block(cell);
            var blockPos = convertGridPosToBlockPos(cell.location.col, cell.location.row);
            var block = createBlock(blockPos.x, blockPos.y, 1, "test");
            var blockKey = "block_" + blockPos.x + "_" + blockPos.y + "_" + getTimestamp();
            logic1.blocks[blockKey] = block;
        }
    });
    ///////////

    // initialize by adding a grid of images for the blocks
    // and associating them with the data model and assigning event handlers
    var blocksContainer = document.getElementById('blocks');
    blocksContainer.setAttribute("touch-action", "none");

    for (var rowNum = 0; rowNum < logic1.grid.size; rowNum+=2) {

        var rowDiv = document.createElement('div');
        rowDiv.setAttribute("class", "row");
        rowDiv.setAttribute("id", "row" + rowNum);
        blocksContainer.appendChild(rowDiv);

        for (var colNum = 0; colNum < logic1.grid.size; colNum+=2) {

            var blockImg = document.createElement('img');
            blockImg.setAttribute("class", "block");
            if (colNum === logic1.grid.size - 1) {
                blockImg.setAttribute("class", "blockRight");
            }
            blockImg.setAttribute("id", "block" + colNum);
            blockImg.setAttribute("src", blockImgMap["filled"][colNum/2]);
            blockImg.setAttribute("touch-action", "none");
            //var block = new Block(colNum, rowNum, true, blockImg);
            var thisCell = logic1.grid.getCell(colNum, rowNum);
            thisCell.domElement = blockImg;
            blockImg.cell = thisCell;

            rowDiv.appendChild(blockImg);
        }
    }
}


/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param array
 **/

function preload(array) {
    for (var i = 0; i < preload.arguments.length - 1; i++) {
        array[i] = new Image();
        array[i].src = preload.arguments[i + 1];
    }

    cout("preload");
}




