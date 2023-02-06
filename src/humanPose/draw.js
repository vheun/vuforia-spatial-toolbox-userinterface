import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONNECTIONS, JOINT_PUBLIC_DATA_KEYS, getJointNodeInfo, getColor} from './utils.js';
import {annotateHumanPoseRenderer} from './rebaScore.js';
import {SpaghettiMeshPath} from './spaghetti.js';

let poseRenderers = {};
let poseBaseColors = {};
let humanPoseAnalyzer;

const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions
const RENDER_CONFIDENCE_COLOR = true;

/**
 * Renders 3D skeleton
 */
export class HumanPoseRenderer {
    /**
     * @param {string} id - Unique identifier of human pose being rendered
     */
    constructor(id) {
        this.id = id;
        this.spheres = {};
        this.container = new THREE.Group();
        this.bones = {};
        this.overallRebaScore = 1;
        this.createSpheres();
    }

    /**
     * Creates all THREE.Meshes representing the spheres/joint balls of the
     * pose
     */
    createSpheres() {
        const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);
        const mat = new THREE.MeshLambertMaterial();

        this.baseColor = new THREE.Color(0, 0.5, 1);
        this.redColor = new THREE.Color(1, 0, 0);
        this.yellowColor = new THREE.Color(1, 1, 0);
        this.greenColor = new THREE.Color(0, 1, 0);

        this.spheresMesh = new THREE.InstancedMesh(
            geo,
            mat,
            Object.values(JOINTS).length,
        );
        this.spheresMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        for (const [i, jointId] of Object.values(JOINTS).entries()) {
            this.spheres[jointId] = i;
            this.spheresMesh.setColorAt(i, this.baseColor);
        }
        this.container.add(this.spheresMesh);

        const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
        this.bonesMesh = new THREE.InstancedMesh(
            geoCyl,
            mat,
            Object.keys(JOINT_CONNECTIONS).length,
        );
        this.container.add(this.bonesMesh);

        for (const [i, boneName] of Object.keys(JOINT_CONNECTIONS).entries()) {
            this.bones[boneName] = i;
            this.bonesMesh.setColorAt(i, this.baseColor);
        }

        this.spheresMesh.material = new THREE.MeshBasicMaterial();
        this.bonesMesh.material = new THREE.MeshBasicMaterial();
    }
    
    /**
    * @param {THREE.Color} new color
    */
    setBaseColor(color) {
        this.baseColor = color;
    }

    /**
     * @param {string} jointId - from utils.JOINTS
     * @param {THREE.Vector3} position
     */
    setJointPosition(jointId, position) {
        const index = this.spheres[jointId];
        this.spheresMesh.setMatrixAt(
            index,
            new THREE.Matrix4().makeTranslation(
                position.x,
                position.y,
                position.z,
            ),
        );
    }

    /**
     * @return {THREE.Vector3}
     */
    getJointPosition(jointId) {
        const index = this.spheres[jointId];
        const mat = new THREE.Matrix4();
        this.spheresMesh.getMatrixAt(index, mat);
        return new THREE.Vector3().setFromMatrixPosition(mat);
    }

    /**
     * @param {Array<String>} jointIds
     * @return {{x: number, y: number, z: number}} Average position of all
     *         joints listed in jointIds
     */
    averageJointPositions(jointIds) {
        let avg = {x: 0, y: 0, z: 0};
        for (let jointId of jointIds) {
            let jointPos = this.getJointPosition(jointId);
            avg.x += jointPos.x;
            avg.y += jointPos.y;
            avg.z += jointPos.z;
        }
        avg.x /= jointIds.length;
        avg.y /= jointIds.length;
        avg.z /= jointIds.length;
        return avg;
    }

    /**
     * Updates bone (stick between joints) positions based on this.spheres'
     * positions. 
     */
    updateBonePositions() {

        for (let boneName of Object.keys(JOINT_CONNECTIONS)) {
            const boneIndex = this.bones[boneName];
            let jointA = this.getJointPosition(JOINT_CONNECTIONS[boneName][0]);
            let jointB = this.getJointPosition(JOINT_CONNECTIONS[boneName][1]);

            let pos = new THREE.Vector3(
                (jointA.x + jointB.x) / 2,
                (jointA.y + jointB.y) / 2,
                (jointA.z + jointB.z) / 2,
            );

            let diff = new THREE.Vector3(jointB.x - jointA.x, jointB.y - jointA.y,
                jointB.z - jointA.z);
            let scale = new THREE.Vector3(1, diff.length() / SCALE, 1);
            diff.normalize();

            let rot = new THREE.Quaternion();
            rot.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
                                   diff);

            // bone.lookAt(this.container.localToWorld(localTarget));
            // bone.rotateX(Math.PI / 2);
            let mat = new THREE.Matrix4();
            mat.compose(pos, rot, scale);

            this.bonesMesh.setMatrixAt(boneIndex, mat);
            this.bonesMesh.setColorAt(boneIndex, this.baseColor);
        }

        if (!RENDER_CONFIDENCE_COLOR) {
            annotateHumanPoseRenderer(this);
        }

        this.spheresMesh.instanceMatrix.needsUpdate = true;
        this.spheresMesh.instanceColor.needsUpdate = true;
        this.bonesMesh.instanceMatrix.needsUpdate = true;
        this.bonesMesh.instanceColor.needsUpdate = true;
    }


    setOverallRebaScore(score) {
        this.overallRebaScore = score;
    }

    /**
     * Annotates bone using material based on boneColor
     * @param {string} boneName
     * @param {number} boneColor
     */
    setBoneRebaColor(boneName, boneColor) {
        if (typeof this.bones[boneName] === 'undefined') {
            return;
        }

        const boneIndex = this.bones[boneName];
        const joint = JOINT_CONNECTIONS[boneName][1];
        const jointIndex = this.spheres[joint];

        if (boneColor === 0) {
            this.bonesMesh.setColorAt(boneIndex, this.greenColor);
            this.spheresMesh.setColorAt(jointIndex, this.greenColor);
        } else if (boneColor === 1) {
            this.bonesMesh.setColorAt(boneIndex, this.yellowColor);
            this.spheresMesh.setColorAt(jointIndex, this.yellowColor);
        } else if (boneColor === 2) {
            this.bonesMesh.setColorAt(boneIndex, this.redColor);
            this.spheresMesh.setColorAt(jointIndex, this.redColor);
        }
    }
    /**
     * @param {number} confidence in range [0,1]
     */
    setJointConfidenceColor(jointId, confidence) {
        if (typeof this.spheres[jointId] === 'undefined') {
            return;
        }
        const jointIndex = this.spheres[jointId];

        let baseColorHSL = {};
        this.baseColor.getHSL(baseColorHSL);

        baseColorHSL.l = baseColorHSL.l * confidence;

        let color = new THREE.Color();
        color.setHSL(baseColorHSL.h, baseColorHSL.s, baseColorHSL.l);

        this.spheresMesh.setColorAt(jointIndex, color);
    }

    addToScene(container) {
        if (container) {
            container.add(this.container);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }
    }

    /**
     * Removes from container and disposes resources
     */
    removeFromScene(container) {
        if (container) {
            container.remove(this.container);
        } else {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
        }
        this.bonesMesh.dispose();
        this.spheresMesh.dispose();
    }
}

export class HumanPoseAnalyzer {
    /**
     * @param {THREE.Object3D} historyMeshContainer - THREE container for
     *                         history line meshes
     * @param {THREE.Object3D} historyCloneContainer - THREE container for
     *                         history clone meshes
     */
    constructor(historyMeshContainer, historyCloneContainer) {
        this.historyMeshContainer = historyMeshContainer;
        this.historyCloneContainer = historyCloneContainer;
        this.recordingClones = true;
        this.cloneMaterialIndex = 0;
        this.historyMeshesAll = {};
        this.clonesAll = [];
        this.lastDisplayedCloneIndex = 0;

        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.lastAnimationUpdate = Date.now();

        this.update = this.update.bind(this);

        this.baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x0077ff,
            transparent: true,
            opacity: 0.5,
        });
        this.redMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.5,
        });
        this.yellowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.5,
        });
        this.greenMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
        });

        window.requestAnimationFrame(this.update);
    }

    update() {
        let minTimestamp = -1;
        let maxTimestamp = -1;
        for (let spaghettiMesh of Object.values(this.historyMeshesAll)) {
            let comparer = spaghettiMesh.comparer;
            let points = spaghettiMesh.currentPoints;
            if (comparer.firstPointIndex === null) {
                continue;
            }
            let firstTimestamp = points[comparer.firstPointIndex].timestamp;
            let secondTimestamp = firstTimestamp + 1;
            if (comparer.secondPointIndex) {
                secondTimestamp = points[comparer.secondPointIndex].timestamp;
            }
            if (minTimestamp < 0) {
                minTimestamp = firstTimestamp;
            }
            minTimestamp = Math.min(minTimestamp, firstTimestamp, secondTimestamp);
            maxTimestamp = Math.max(maxTimestamp, firstTimestamp, secondTimestamp);
        }

        this.setAnimation(minTimestamp, maxTimestamp);
        this.updateAnimation();

        window.requestAnimationFrame(this.update);
    }

    poseRendererUpdated(poseRenderer, timestamp) {
        if (this.recordingClones) {
            const obj = this.clone(poseRenderer);
            this.clonesAll.push({
                timestamp,
                poseObject: obj,
            })
            obj.visible = false;
            this.historyCloneContainer.add(obj);
        }

        let newPoint = poseRenderer.getJointPosition(JOINTS.NOSE).clone();
        newPoint.y += 400;

        if (!this.historyMeshesAll.hasOwnProperty(poseRenderer.id)) {
            this.createHistoryLine(poseRenderer);
        }

        let historyMesh = this.historyMeshesAll[poseRenderer.id];

        // Split spaghetti line if we jumped by a large amount
        if (historyMesh.currentPoints.length > 0) {
            let lastPoint = historyMesh.currentPoints[historyMesh.currentPoints.length - 1];
            let lastVec = new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z);
            if (lastVec.distanceToSquared(newPoint) > 800 * 800) {
                this.historyMeshesAll[poseRenderer.id + '-until-' + timestamp] = historyMesh;
                this.createHistoryLine(poseRenderer);
                historyMesh = this.historyMeshesAll[poseRenderer.id];
            }
        }

        let hueReba = this.getOverallRebaScoreHue(poseRenderer.overallRebaScore);
        let colorRGB = new THREE.Color();
        colorRGB.setHSL(hueReba / 360, 0.8, 0.3);

        let nextHistoryPoint = {
            x: newPoint.x,
            y: newPoint.y,
            z: newPoint.z,
            color: [colorRGB.r * 255, colorRGB.g * 255, colorRGB.b * 255],
            overallRebaScore: poseRenderer.overallRebaScore,
            timestamp,
        };

        historyMesh.currentPoints.push(nextHistoryPoint);
        this.historyMeshesAll[poseRenderer.id].setPoints(historyMesh.currentPoints);
    }

    getOverallRebaScoreHue(overallRebaScore) {
        let hueReba = 140 - (overallRebaScore - 1) * 240 / 11;
        if (isNaN(hueReba)) {
            hueReba = 120;
        }
        hueReba = (Math.min(Math.max(hueReba, -30), 120) + 360) % 360;
        return hueReba;
    }

    clone(poseRenderer) {
        let colorRainbow = new THREE.Color();
        colorRainbow.setHSL(((Date.now() / 5) % 360) / 360, 1, 0.5);

        let hueReba = this.getOverallRebaScoreHue(poseRenderer.overallRebaScore);
        // let alphaReba = 0.3 + 0.3 * (poseRenderer.overallRebaScore - 1) / 11;
        let colorReba = new THREE.Color();
        colorReba.setHSL(hueReba / 360, 1, 0.5);

        let newContainer = poseRenderer.container.clone();
        let matBase = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.5,
        });

        newContainer.children.forEach((obj) => {
            if (obj.instanceColor) {
                // Make the material transparent

                let attrBase = obj.instanceColor;
                let attrReba = obj.instanceColor.clone();
                let attrRainbow = obj.instanceColor.clone();
                for (let i = 0; i < attrReba.count; i++) {
                    colorReba.toArray(attrReba.array, i * 3);
                    colorRainbow.toArray(attrRainbow.array, i * 3);
                }
                obj.__cloneColors = [
                    attrReba,
                    attrBase,
                    attrRainbow,
                ];
                obj.instanceColor = obj.__cloneColors[this.cloneMaterialIndex % obj.__cloneColors.length];
                obj.material = matBase;
                obj.instanceColor.needsUpdate = true;
            }
        });
        return newContainer;
    }

    /**
     * Creates a history line (spaghetti line) placing it within
     * the historyMeshContainer
     * @param {HumanPoseRenderer} poseRenderer
     */
    createHistoryLine(poseRenderer) {
        const historyMesh = new SpaghettiMeshPath([], {
            widthMm: 30,
            heightMm: 30,
            usePerVertexColors: true,
            wallBrightness: 0.6,
        });
        this.historyMeshContainer.add(historyMesh);

        this.historyMeshesAll[poseRenderer.id] = historyMesh;
    }

    resetHistoryLines() {
        for (let key of Object.keys(this.historyMeshesAll)) {
            let historyMesh = this.historyMeshesAll[key];
            historyMesh.resetPoints();
            this.historyMeshContainer.remove(historyMesh);
        }
        this.historyMeshesAll = {};
    }

    resetHistoryClones() {
        // Loop over copy of children to remove all
        for (let child of this.historyCloneContainer.children.concat()) {
            child.geometry.dispose();
            child.material.dispose();
            if (child.dispose) {
                child.dispose();
            }
            this.historyCloneContainer.remove(child);
        }
    }

    /**
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     */
    setHistoryTimeInterval(firstTimestamp, secondTimestamp) {
        for (let mesh of Object.values(this.historyMeshesAll)) {
            mesh.setTimeInterval(firstTimestamp, secondTimestamp);
        }
    }

    /**
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     * @return {Array<SpaghettiMeshPathPoint>}
     */
    getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp) {
        // TODO: perf can be improved through creating historyPointsAll and
        // binary search for indices
        let allPoints = [];
        for (const mesh of Object.values(this.historyMeshesAll)) {
            for (const point of mesh.currentPoints) {
                if (point.timestamp < firstTimestamp) {
                    continue;
                }
                if (point.timestamp > secondTimestamp) {
                    // Assume sorted
                    break;
                }
                allPoints.push(point);
            }
        }
        allPoints.sort((a, b) => {
            return a.timestamp - b.timestamp;
        });
        return allPoints;
    }

    /**
     * @param {boolean} visible
     */
    setHistoryLinesVisible(visible) {
        this.historyMeshContainer.visible = visible;
    }

    /**
     * @param {boolean} enabled
     */
    setRecordingClonesEnabled(enabled) {
        this.recordingClones = enabled;
    }

    advanceCloneMaterial() {
        this.cloneMaterialIndex += 1;

        this.historyCloneContainer.traverse((obj) => {
            if (obj.__cloneColors) {
                let index = this.cloneMaterialIndex % obj.__cloneColors.length;
                obj.instanceColor = obj.__cloneColors[index];
                obj.instanceColor.needsUpdate = true;
            }
        });
    }

    setAnimation(start, end) {
        this.animationStart = start;
        this.animationEnd = end;
    }

    updateAnimation() {
        let dt = Date.now() - this.lastAnimationUpdate;
        this.lastAnimationUpdate += dt;
        if (this.animationStart < 0 || this.animationEnd < 0) {
            this.hideLastDisplayedClone(-1);
            return;
        }
        this.animationPosition += dt;
        let offset = this.animationPosition - this.animationStart;
        let duration = this.animationEnd - this.animationStart;
        let offsetClamped = offset % duration;
        this.animationPosition = this.animationStart + offsetClamped;
        this.displayNearestClone(this.animationPosition);
    }

    hideLastDisplayedClone(timestamp) {
        if (this.lastDisplayedCloneIndex >= 0) {
            let lastClone = this.clonesAll[this.lastDisplayedCloneIndex];
            if (lastClone) {
                lastClone.poseObject.visible = false;
            }
            if (timestamp >= 0 && lastClone.timestamp > timestamp) {
                this.lastDisplayedCloneIndex = 0;
            }
        }
    }

    displayNearestClone(timestamp) {
        this.hideLastDisplayedClone(timestamp);

        if (this.clonesAll.length < 2) {
            return;
        }
        let bestClone = null;
        for (let i = this.lastDisplayedCloneIndex; i < this.clonesAll.length; i++) {
            let clone = this.clonesAll[i];
            let cloneNext = this.clonesAll[i + 1];
            if (clone.timestamp > timestamp) {
                break;
            }
            if (!cloneNext || cloneNext.timestamp > timestamp) {
                bestClone = clone;
                this.lastDisplayedCloneIndex = i;
                break;
            }
        }
        if (bestClone) {
            bestClone.poseObject.visible = true;
        }
    }
}

function renderHumanPoseObjects(poseObjects, timestamp, historical, container) {

    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;


    if (!humanPoseAnalyzer) {
        const historyMeshContainer = new THREE.Group();
        historyMeshContainer.visible = false;
        if (container) {
            container.add(historyMeshContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(historyMeshContainer);
        }

        const historyCloneContainer = new THREE.Group();
        historyCloneContainer.visible = true;
        if (container) {
            container.add(historyCloneContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(historyCloneContainer);
        }

        humanPoseAnalyzer = new HumanPoseAnalyzer(historyMeshContainer, historyCloneContainer);
    }

    for (let id in poseRenderers) {
        poseRenderers[id].updated = false;
    }
    for (let poseObject of poseObjects) {
        if (historical) {
            renderHistoricalPose(poseObject, timestamp, container);
        } else {
            renderPose(poseObject, timestamp, container);
        }
    }
    for (let id of Object.keys(poseRenderers)) {
        if (!poseRenderers[id].updated) {
            poseRenderers[id].removeFromScene(container);
            delete poseRenderers[id];
        }
    }
}

function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

function renderPose(poseObject, timestamp, container) {
    updatePoseRenderer(poseObject, timestamp, container, false);
}

function renderHistoricalPose(poseObject, timestamp, container) {
    if (!poseObject.uuid) {
        poseObject.uuid = poseObject.objectId;
        poseObject.id = poseObject.objectId;
    }

    updatePoseRenderer(poseObject, timestamp, container, true);
}

function updatePoseRenderer(poseObject, timestamp, container, historical) {
    
    // create per-device body pose base color
    let end = poseObject.uuid.indexOf('pose1')
    let poseDeviceId = poseObject.uuid.substring(0, end)

    if (!poseBaseColors[poseDeviceId]) {
        let baseColor = new THREE.Color(getColor(poseObject))
        poseBaseColors[poseDeviceId] = baseColor;
    }

    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
        poseRenderers[poseObject.uuid].setBaseColor(poseBaseColors[poseDeviceId]);
        poseRenderers[poseObject.uuid].addToScene(container);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];
    poseRenderer.updated = true;

    if (historical) {
        updateJointsHistorical(poseRenderer, poseObject);
    } else {
        updateJoints(poseRenderer, poseObject);
    }

    poseRenderer.updateBonePositions();

    humanPoseAnalyzer.poseRendererUpdated(poseRenderer, timestamp);
    if (realityEditor.analytics) {
        realityEditor.analytics.appendPose({
            time: timestamp,
        });
    }
}

function getGroundPlaneRelativeMatrix() {
    let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
    let groundPlaneRelativeMatrix = new THREE.Matrix4();
    setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));
    return groundPlaneRelativeMatrix;
}

function updateJointsHistorical(poseRenderer, poseObject) {
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    for (let jointId of Object.values(JOINTS)) {
        let frame = poseObject.frames[poseObject.uuid + jointId];
        if (!frame.ar.matrix) {
            continue;
        }

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, frame.ar.matrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        poseRenderer.setJointPosition(jointId, jointPosition);
    }
}

function updateJoints(poseRenderer, poseObject) {
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    if (poseObject.matrix && poseObject.matrix.length > 0) {
        let objectRootMatrix = new THREE.Matrix4();
        setMatrixFromArray(objectRootMatrix, poseObject.matrix);
        groundPlaneRelativeMatrix.multiply(objectRootMatrix);
    }

    for (const [i, jointId] of Object.values(JOINTS).entries()) {
        // assume that all sub-objects are of the form poseObject.id + joint name
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.uuid}${jointId}`);

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        poseRenderer.setJointPosition(jointId, jointPosition);

        if (RENDER_CONFIDENCE_COLOR) {
            let keys = getJointNodeInfo(poseObject, i);
            // zero confidence if node's public data are not available 
            let confidence = 0.0; 
            if (keys) {
                const node = poseObject.frames[keys.frameKey].nodes[keys.nodeKey];
                if (node && node.publicData[JOINT_PUBLIC_DATA_KEYS.data].confidence !== undefined) { 
                    confidence = node.publicData[JOINT_PUBLIC_DATA_KEYS.data].confidence;
                }
            }
            poseRenderer.setJointConfidenceColor(jointId, confidence);
        }
    }
}

function resetHistoryLines() {
    humanPoseAnalyzer.resetHistoryLines();
}

function resetHistoryClones() {
    humanPoseAnalyzer.resetHistoryClones();
}

/**
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 */
function setHistoryTimeInterval(firstTimestamp, secondTimestamp) {
    humanPoseAnalyzer.setHistoryTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 * @return {Array<SpaghettiMeshPathPoint>}
 */
function getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp) {
    return humanPoseAnalyzer.getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * @param {boolean} visible
 */
function setHistoryLinesVisible(visible) {
    if (!humanPoseAnalyzer) {
        return;
    }
    humanPoseAnalyzer.setHistoryLinesVisible(visible);
}

/**
 * @param {boolean} enabled
 */
function setRecordingClonesEnabled(enabled) {
    humanPoseAnalyzer.setRecordingClonesEnabled(enabled);
}

function advanceCloneMaterial() {
    humanPoseAnalyzer.advanceCloneMaterial();
}

/**
 * @param {boolean} visible
 */
function setHumanPosesVisible(visible) {
    
    for (let id in poseRenderers) {
        poseRenderers[id].container.visible = visible;
    }
}

export {
    renderHumanPoseObjects,
    resetHistoryLines,
    resetHistoryClones,
    setHistoryTimeInterval,
    setHistoryLinesVisible,
    setRecordingClonesEnabled,
    advanceCloneMaterial,
    getHistoryPointsInTimeInterval,
    setHumanPosesVisible
};
