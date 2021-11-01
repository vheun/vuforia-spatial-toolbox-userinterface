createNameSpace("realityEditor.gui.ar.areaTargetScanner");

(function(exports) {

    let hasUserBeenNotified = false;
    let detectedServers = {};
    let detectedObjects = {};

    let foundAnyWorldObjects = false;
    let isScanning = false;

    let feedbackString = null;
    let feedbackInterval = null;
    let feedbackTick = 0;

    const MAX_SCAN_TIME = 120;
    let timeLeftSeconds = MAX_SCAN_TIME;

    let loadingDialog = null;

    let pendingAddedObjectName = null;

    let sessionObjectId = null;
    let targetUploadURL = null;

    let hasFirstSeenInstantWorld = false;

    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initService() {
        if (!realityEditor.device.environment.variables.supportsAreaTargetCapture) {
            console.log('This device doesn\'t support area target capture');
            return;
        }

        // wait until at least one server is detected
        // wait to see if any world objects are detected on that server
        // wait until camera device pose has been set / tracking is fully initialized

        // if no world objects are detected, show a notification "No spaces detected. Scan one to begin."
        // show "SCAN" button on bottom center of screen
        // OR -> show a modal with this info and the button to start. can dismiss and ignore completely.

        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            if (objectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // ignore local world
            }

            if (typeof detectedObjects[objectKey] !== 'undefined') {
                return;
            }
            detectedObjects[objectKey] = true;

            if (pendingAddedObjectName) {
                if (object.name === pendingAddedObjectName) {
                    pendingObjectAdded(objectKey, object.ip, realityEditor.network.getPort(object));
                }
            }

            // check if it's a world object
            if (object && (object.isWorldObject || object.type === 'world')) {
                foundAnyWorldObjects = true;
                console.log("world obj detected");
            } else {
                console.log("obj detected");
            }

            // wait 5 seconds after detecting an object to check the next step
            setTimeout(function() {
                showNotificationIfNeeded();
            }, 5000);
        });

        realityEditor.network.onNewServerDetected(function(serverIP) {
            console.log("--function-- onNewServerDetected");
            if (serverIP === '127.0.0.1' || serverIP === 'localhost') {
                return;
            }
            if (typeof detectedServers[serverIP] !== 'undefined') {
                return;
            }
            detectedServers[serverIP] = true;
        });

        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            if (!sessionObjectId) { return; }
            if (isScanning) { return; }
            if (hasFirstSeenInstantWorld) { return; }

            if (typeof visibleObjects[sessionObjectId] !== 'undefined') {
                hasFirstSeenInstantWorld = true;

                getStatusTextfield().innerHTML = 'Successfully localized within new scan!'
                getStatusTextfield().style.display = 'inline';

                setTimeout(function() {
                    getStatusTextfield().innerHTML = '';
                    getStatusTextfield().style.display = 'none';
                }, 3000);
            }
        });

        realityEditor.app.onAreaTargetGenerateProgress('realityEditor.gui.ar.areaTargetScanner.onAreaTargetGenerateProgress');
    }

    function showNotificationIfNeeded() {
        if (hasUserBeenNotified) {
            console.log("Already notified user. Ignore this time.");
            return;
        }

        if (foundAnyWorldObjects) {
            console.log("Found an existing world object... no need to scan a new one. Ignore this time.");
            return;
        }

        let cameraNode = realityEditor.sceneGraph.getCameraNode();
        let hasCameraBeenLocalized = (cameraNode && !realityEditor.gui.ar.utilities.isIdentityMatrix(cameraNode.localMatrix));
        if (!hasCameraBeenLocalized) {
            console.log("AR Tracking hasn't finished initializing yet... try again...");
            setTimeout(function() {
                showNotificationIfNeeded(); // repeat until ready
            }, 1000);
            return;
        }

        const headerText = 'No scans of this space detected. Make a scan?';
        const descriptionText = 'This will create a World Object on your edge server.'
        realityEditor.gui.modal.openClassicModal(headerText, descriptionText, 'Ignore', 'Begin Scan', function() {
            console.log('Ignore scan modal');
        }, function() {
            console.log('Begin scan');
            // startScanning();
            createPendingWorldObject();
        }, true);

        hasUserBeenNotified = true;
    }

    function startScanning() {
        if (isScanning) {
            console.log('already scanning.. ignore.');
            return;
        }
        isScanning = true;
        timeLeftSeconds = MAX_SCAN_TIME;

        realityEditor.app.areaTargetCaptureStart(sessionObjectId, 'realityEditor.gui.ar.areaTargetScanner.captureStatusHandler');

        // TODO: turn app into scanning mode, disabling any AR rendering and other UI

        // add a stop button to the screen that can be pressed to trigger stopScanning
        getRecordingIndicator().style.display = 'inline';
        getStopButton().style.display = 'inline';
        getTimerTextfield().style.display = 'inline';

        if (!feedbackInterval) {
            feedbackInterval = setInterval(printFeedback, 1000);
        }
    }

    /**
     * Lazy instantiation and getter of a red dot element to indicate that a recording is in process
     * @return {Element}
     */
    function getRecordingIndicator() {
        var div = document.querySelector('#scanRecordingIndicator');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanRecordingIndicator';
            div.style.position = 'absolute';
            div.style.left = '10px';
            div.style.top = '10px';
            div.style.width = '30px';
            div.style.height = '30px';
            div.style.backgroundColor = 'red';
            div.style.borderRadius = '15px';
            document.body.appendChild(div);
        }
        return div;
    }

    /**
     * Lazy instantiation and getter of the stop button to generate the area target from the scan
     * @return {Element}
     */
    function getStopButton() {
        var div = document.querySelector('#scanStopButton');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanStopButton';
            div.style.position = 'absolute';
            div.style.left = '40vw';
            div.style.bottom = '10vh';
            div.style.width = '20vw';
            div.style.height = '60px';
            div.style.lineHeight = '60px';
            div.style.backgroundColor = 'rgba(255,255,255,0.7)';
            div.style.color = 'rgb(0,0,0)';
            div.style.borderRadius = '15px';
            div.style.textAlign = 'center';
            div.style.fontSize = '20px';
            div.style.verticalAlign = 'middle';
            document.body.appendChild(div);

            div.innerHTML = 'Stop Scanning';

            div.addEventListener('pointerup', function() {
                stopScanning();
            });
        }
        return div;
    }

    /**
     * Lazy instantiation and getter of the stop button to generate the area target from the scan
     * @return {Element}
     */
    function getStatusTextfield() {
        var div = document.querySelector('#scanStatusTextfield');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanStatusTextfield';
            div.style.position = 'absolute';
            div.style.left = '15vw';
            div.style.top = '10vh';
            div.style.width = '70vw';
            div.style.height = '60px';
            div.style.lineHeight = '60px';
            div.style.backgroundColor = 'rgba(255,255,255,0.5)';
            div.style.color = 'rgb(0,0,0)';
            div.style.borderRadius = '15px';
            div.style.textAlign = 'center';
            div.style.verticalAlign = 'middle';
            document.body.appendChild(div);
        }
        return div;
    }

    /**
     * Lazy instantiation and getter of the stop button to generate the area target from the scan
     * @return {Element}
     */
    function getTimerTextfield() {
        var div = document.querySelector('#scanTimerTextfield');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanTimerTextfield';
            div.style.position = 'absolute';
            div.style.left = '40vw';
            div.style.bottom = 'calc(10vh - 30px)';
            div.style.width = '20vw';
            div.style.height = '30px';
            div.style.lineHeight = '30px';
            div.style.color = 'rgb(255,255,255)';
            div.style.borderRadius = '15px';
            div.style.textAlign = 'center';
            div.style.fontSize = '12px';
            div.style.verticalAlign = 'middle';
            document.body.appendChild(div);
        }
        return div;
    }

    function stopScanning() {
        if (!isScanning) {
            console.log('not scanning.. ignore.');
        }

        realityEditor.app.areaTargetCaptureStop('realityEditor.gui.ar.areaTargetScanner.captureSuccessOrError');

        getRecordingIndicator().style.display = 'none';
        getStopButton().style.display = 'none';
        getTimerTextfield().style.display = 'none';
        getStatusTextfield().style.display = 'none';
        isScanning = false;

        feedbackString = null;

        if (feedbackInterval) {
            clearInterval(feedbackInterval);
            feedbackInterval = null;
        }

        if (globalStates.debugSpeechConsole) {
            let console = document.getElementById('speechConsole');
            if (console) { console.innerHTML = ''; }
        }

        // show loading animation. hide when successOrError finishes.
        showLoadingDialog('Generating Dataset...', 'Please wait. Converting scan into AR target files.');
    }

    function createPendingWorldObject() {
        console.log('createPendingWorldObject()');

        // TODO: first create a new object and post it to the server
        let randomServerIP = Object.keys(detectedServers)[0]; // this is guaranteed to have at least one entry if we get here
        pendingAddedObjectName = "_WORLD_instantScan";
        addObject(pendingAddedObjectName, randomServerIP, 8080); // TODO: get port programmatically

        showLoadingDialog('Creating World Object...', 'Please wait. Generating object on server.');
        setTimeout(function() {
            realityEditor.app.sendUDPMessage({action: 'ping'}); // ping the servers to see if we get any new responses
            setTimeout(function() {
                realityEditor.app.sendUDPMessage({action: 'ping'}); // ping the servers to see if we get any new responses
                setTimeout(function() {
                    realityEditor.app.sendUDPMessage({action: 'ping'}); // ping the servers to see if we get any new responses
                }, 900);
            }, 600);
        }, 300);

        // wait for a response, wait til we have the objectID and know it exists
    }

    function pendingObjectAdded(objectKey, serverIp, serverPort) {
        // the object definitely exists...
        pendingAddedObjectName = null;

        setTimeout(function() {
            loadingDialog.dismiss();
            loadingDialog = null;
        }, 500);

        let objectName = realityEditor.getObject(objectKey).name;
        sessionObjectId = objectKey;
        targetUploadURL = realityEditor.network.getURL(serverIp, serverPort, '/content/' + objectName)

        startScanning();
    }

    function addObject(objectName, serverIp, serverPort) {
        var postUrl = realityEditor.network.getURL(serverIp, serverPort, '/')
        var params = new URLSearchParams({action: 'new', name: objectName, isWorld: true});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then((response) => {
            console.log('added new object');
            console.log(response);
        });
    }

    function captureStatusHandler(status, statusInfo) {
        console.log('capture status: ' + status);
        console.log('capture statusInfo: ' + statusInfo);
        console.log('---');

        if (status === 'PREPARING') {
            getStopButton().classList.add('captureButtonInactive');
        } else {
            getStopButton().classList.remove('captureButtonInactive');
        }

        feedbackString = status + '... (' + statusInfo + ')';

        if (globalStates.debugSpeechConsole) {
            let console = document.getElementById('speechConsole');
            if (!console) { return; }
            console.innerHTML =
                'Status: ' + status + '<br>' +
                'Info: ' + statusInfo;
        }
    }

    function printFeedback() {
        if (!isScanning || !feedbackString) { return; }

        let dots = '';
        for (let i = 0; i < feedbackTick; i++) {
            dots += '.';
        }
        getStatusTextfield().innerHTML = feedbackString + dots;
        getStatusTextfield().style.display = 'inline';

        feedbackTick += 1;
        feedbackTick = feedbackTick % 4;

        timeLeftSeconds -= 1;
        getTimerTextfield().innerHTML = timeLeftSeconds + 's';
        getTimerTextfield().style.display = 'inline';

        if (timeLeftSeconds <= 0) {
            stopScanning();
        }
    }

    function onAreaTargetGenerateProgress(percentGenerated) {
        // onAreaTargetGenerateProgress
        console.log('Generated: ' + percentGenerated);
    }

    function captureSuccessOrError(success, errorMessage) {
        console.log("_____");
        console.log("Capture Done. Success?: " + success);
        console.log("Error?: " + errorMessage);
        console.log("_____");

        loadingDialog.dismiss();
        loadingDialog = null;

        if (success) {
            realityEditor.app.areaTargetCaptureGenerate(targetUploadURL);

            setTimeout(function() {
                showLoadingDialog('Uploading Target Data...', 'Please wait. Uploading data to server.');

                setTimeout(function() {
                    loadingDialog.dismiss();
                    loadingDialog = null;
                    console.log("uploading target data timed out");

                    // objects aren't fully initialized until they have a target.jpg, so we upload a screenshot to be the "icon"
                    realityEditor.app.getScreenshot('S', 'realityEditor.gui.ar.areaTargetScanner.onScreenshotReceived');
                }, 1500);
            }, 1000);

            showMessage('Successful capture.', 2000);
        } else {
            showMessage('Error: ' + errorMessage, 2000);
        }
    }

    function onScreenshotReceived(base64String) {
        if (base64String === "") {
            console.log("got empty screenshot... try again later");
            setTimeout(function() {
                realityEditor.app.getScreenshot('S', 'realityEditor.gui.ar.areaTargetScanner.onScreenshotReceived');
            }, 3000);
            return;
        }
        var blob = realityEditor.device.utilities.b64toBlob(base64String, 'image/jpeg');
        console.log('converted screenshot to blob', blob);
        uploadScreenshot(blob);
    }

    function uploadScreenshot(blob) {
        if (!targetUploadURL || !blob) {
            return;
        }

        console.log('upload screenshot...');

        const formData = new FormData();
        formData.append('file', blob, 'screenshot-target.jpg');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', targetUploadURL, true);

        xhr.onload = function () {
            if (xhr.status === 200) {
                showMessage('Successfully uploaded icon to new world object', 2000);
            } else {
                showMessage('Error uploading icon to new world object', 2000);
            }
        };

        xhr.setRequestHeader('type', 'targetUpload');
        xhr.send(formData);
    }

    function showMessage(message, lifetime) {
        // create UI if needed
        // let notificationUI = document.getElementById('captureNotificationUI');
        // let notificationTextContainer = document.getElementById('captureNotificationStatusText');
        // if (!notificationUI) {
        let notificationUI = document.createElement('div');
        // notificationUI.id = 'notificationUI';
        notificationUI.classList.add('statusBar');
        if (realityEditor.device.environment.variables.layoutUIForPortrait) {
            notificationUI.classList.add('statusBarPortrait');
        }
        document.body.appendChild(notificationUI);

        let notificationTextContainer = document.createElement('div');
        // notificationTextContainer.id = 'trackingStatusText';
        notificationUI.classList.add('statusBarText');
        notificationUI.appendChild(notificationTextContainer);
        // }

        // show and populate with message
        notificationUI.classList.add('statusBar');
        notificationUI.classList.remove('statusBarHidden');
        notificationTextContainer.innerHTML = message;

        setTimeout(function() {
            // let errorNotificationUI = document.getElementById('errorNotificationUI');
            if (!notificationUI) {
                return;
            } // no need to hide it if it doesn't exist
            // notificationUI.classList.add('statusBarHidden');
            // notificationUI.classList.remove('statusBar');
            notificationUI.parentElement.removeChild(notificationUI);
        }, lifetime);

        // if (isLongMessage) {
        //     notificationUI.classList.add('statusTextLong');
        // } else {
        //     notificationUI.classList.remove('statusTextLong');
        // }
    }

    function showLoadingDialog(headerText, descriptionText) {
        if (loadingDialog) { // hide existing dialog before showing new one
            loadingDialog.dismiss();
            loadingDialog = null;
        }

        // // hide all AR elements and canvas lines
        // document.getElementById('GUI').classList.add('hiddenWhileLoading');
        // document.getElementById('canvas').classList.add('hiddenWhileLoading');

        loadingDialog = realityEditor.gui.modal.showSimpleNotification(
            headerText, descriptionText,function () {
                console.log('closed...');
            }, realityEditor.device.environment.variables.layoutUIForPortrait);

        // realityEditor.app.callbacks.onTrackingInitialized(function() {
        //     document.getElementById('GUI').classList.remove('hiddenWhileLoading');
        //     document.getElementById('canvas').classList.remove('hiddenWhileLoading');
        //
        //     notification.dismiss();
        // });
    }

    exports.initService = initService;
    exports.captureStatusHandler = captureStatusHandler;
    exports.onAreaTargetGenerateProgress = onAreaTargetGenerateProgress;
    exports.captureSuccessOrError = captureSuccessOrError;
    exports.onScreenshotReceived = onScreenshotReceived;

}(realityEditor.gui.ar.areaTargetScanner));
