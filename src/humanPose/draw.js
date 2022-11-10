createNameSpace("realityEditor.humanPose.draw");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {
    let poseRenderers = {};
    let humanPoseAnalyzer;

    const {utils, rebaScore} = realityEditor.humanPose;

    const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions

    /**
     * Renders COCO-pose keypoints
     */
    class HumanPoseRenderer {
        /**
         * @param {string} id - Unique identifier of human pose being rendered
         * @param {THREE.Object3D} historyLineContainer - THREE container for
         *                         history line meshes
         * @param {THREE.Object3D} historyCloneContainer - THREE container for
         *                         history clone meshes
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
            const mat = new THREE.MeshBasicMaterial({color: 0x0077ff});
            this.baseMaterial = mat;

            for (const jointId of Object.values(utils.JOINTS)) {
                // TODO use instanced mesh for better performance
                let sphere = new THREE.Mesh(geo, mat);
                // this.spheres.push(sphere);
                this.spheres[jointId] = sphere;
                this.container.add(sphere);
            }
            const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
            for (const boneName of Object.keys(utils.JOINT_CONNECTIONS)) {
                let bone = new THREE.Mesh(geoCyl, mat);
                this.bones[boneName] = bone;
                this.container.add(bone);
            }

            this.redMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000});
            this.yellowMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
            this.greenMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
        }

        /**
         * @param {string} jointId - from utils.JOINTS
         * @param {THREE.Vector3} position
         */
        setJointPosition(jointId, position) {
            let sphere = this.spheres[jointId];
            sphere.position.x = position.x;
            sphere.position.y = position.y;
            sphere.position.z = position.z;
        }

        /**
         * @return {THREE.Vector3}
         */
        getJointPosition(jointId) {
            return this.spheres[jointId].position;
        }

        /**
         * @param {Array<String>} jointIds
         * @return {{x: number, y: number, z: number}} Average position of all
         *         joints listed in jointIds
         */
        averageJointPositions(jointIds) {
            let avg = {x: 0, y: 0, z: 0};
            for (let jointId of jointIds) {
                let joint = this.spheres[jointId]
                avg.x += joint.position.x;
                avg.y += joint.position.y;
                avg.z += joint.position.z;
            }
            avg.x /= jointIds.length;
            avg.y /= jointIds.length;
            avg.z /= jointIds.length;
            return avg;
        }

        /**
         * Updates bone (stick between joints) positions based on this.spheres'
         * positions. Notably synthesizes a straight spine based on existing
         * COCO keypoints
         */
        updateBonePositions() {
            const {JOINTS} = utils;
            // Add synthetic joint positions expected by REBA
            this.setJointPosition(JOINTS.HEAD, this.averageJointPositions([
                JOINTS.LEFT_EAR,
                JOINTS.RIGHT_EAR
            ]));
            this.setJointPosition(JOINTS.NECK, this.averageJointPositions([
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
            ]));
            this.setJointPosition(JOINTS.CHEST, this.averageJointPositions([
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
            ]));
            this.setJointPosition(JOINTS.NAVEL, this.averageJointPositions([
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
            ]));
            this.setJointPosition(JOINTS.PELVIS, this.averageJointPositions([
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
            ]));

            for (let boneName of Object.keys(utils.JOINT_CONNECTIONS)) {
                let bone = this.bones[boneName];
                let jointA = this.spheres[utils.JOINT_CONNECTIONS[boneName][0]].position;
                let jointB = this.spheres[utils.JOINT_CONNECTIONS[boneName][1]].position;

                bone.position.x = (jointA.x + jointB.x) / 2;
                bone.position.y = (jointA.y + jointB.y) / 2;
                bone.position.z = (jointA.z + jointB.z) / 2;
                bone.rotation.set(0, 0, 0);

                let diff = new THREE.Vector3(jointB.x - jointA.x, jointB.y - jointA.y,
                    jointB.z - jointA.z);

                bone.scale.y = 1;
                let localTarget = new THREE.Vector3(
                    jointB.x, jointB.y, jointB.z);
                bone.lookAt(this.container.localToWorld(localTarget));
                bone.rotateX(Math.PI / 2);

                bone.scale.y = diff.length() / SCALE;
            }

            rebaScore.annotateHumanPoseRenderer(this);
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
            if (typeof this.bones[boneName] === 'undefined') return;

            if (boneColor === 0) {
                this.bones[boneName].material = this.greenMaterial;
            }
            if (boneColor === 1) {
                this.bones[boneName].material = this.yellowMaterial;
            } else if (boneColor === 2) {
                this.bones[boneName].material = this.redMaterial;
            }
        }

        addToScene() {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }

        /**
         * Removes from container and disposes resources
         */
        removeFromScene() {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
            this.bones.headNeck.geometry.dispose();
            this.spheres[utils.JOINTS.HEAD].geometry.dispose();
            this.spheres[utils.JOINTS.HEAD].material.dispose();
        }
    }

    class HumanPoseAnalyzer {
        constructor(historyLineContainer, historyCloneContainer) {
            this.historyLineContainer = historyLineContainer;
            this.historyCloneContainer = historyCloneContainer;
            this.recordingClones = false;
            this.cloneMaterialIndex = 0;
            this.historyLinesAll = {};
            this.historyPointsAll = {};
        }

        poseRendererUpdated(poseRenderer) {
            if (this.recordingClones) {
                const obj = this.clone(poseRenderer);
                this.historyCloneContainer.add(obj);
            }

            let newPoint = poseRenderer.getJointPosition(utils.JOINTS.HEAD).clone();
            newPoint.y += 0.4;

            if (!this.historyPointsAll.hasOwnProperty(poseRenderer.id)) {
                this.createHistoryLine(poseRenderer);
            }

            let historyPoints = this.historyPointsAll[poseRenderer.id];

            // Split spaghetti line if we jumped by a large amount
            if (historyPoints.length > 0 &&
                historyPoints[historyPoints.length - 1].sub(newPoint).lengthSq() > 1) {
                this.createHistoryLine(poseRenderer);
            }

            historyPoints.push(newPoint);
            this.historyLinesAll[poseRenderer.id].setPoints(historyPoints);
        }

        clone(poseRenderer) {
            let colorRainbow = `hsl(${(Date.now() / 5) % 360}, 100%, 50%)`;
            let hueReba = 180 - (poseRenderer.overallRebaScore - 1) * 240 / 11;
            if (isNaN(hueReba)) {
                hueReba = 120;
            }
            hueReba = Math.min(Math.max(hueReba, 0), 120);
            let colorReba = `hsl(${hueReba}, 100%, 50%)`;
            let newContainer = poseRenderer.container.clone();
            let matRainbow = new THREE.MeshBasicMaterial({
                color: colorRainbow,
                transparent: true,
                opacity: 0.5,
            });
            let matReba = new THREE.MeshBasicMaterial({
                color: colorReba,
                transparent: true,
                opacity: 0.5,
            });

            let baseMaterial = new THREE.MeshBasicMaterial({
                color: poseRenderer.baseMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            let redMaterial = new THREE.MeshBasicMaterial({
                color: poseRenderer.redMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            let yellowMaterial = new THREE.MeshBasicMaterial({
                color: poseRenderer.yellowMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            let greenMaterial = new THREE.MeshBasicMaterial({
                color: poseRenderer.greenMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            newContainer.traverse((obj) => {
                if (obj.material) {
                    let materialOld = obj.material;
                    // Switch to transparent version of old material if possible
                    if (materialOld === poseRenderer.baseMaterial) {
                        materialOld = baseMaterial;
                    } else if (materialOld === poseRenderer.redMaterial) {
                        materialOld = redMaterial;
                    } else if (materialOld === poseRenderer.yellowMaterial) {
                        materialOld = yellowMaterial;
                    } else if (materialOld === poseRenderer.greenMaterial) {
                        materialOld = greenMaterial;
                    }

                    obj.__cloneMaterials = [
                        materialOld,
                        matRainbow,
                        matReba,
                    ];
                    obj.material = obj.__cloneMaterials[this.cloneMaterialIndex % obj.__cloneMaterials.length];
                }
            });
            return newContainer;
        }

        /**
         * Creates a history line (spaghetti line) placing it within
         * the historyLineContainer
         * @param {HumanPoseRenderer} poseRenderer
         */
        createHistoryLine(poseRenderer) {
            const historyLine = new realityEditor.gui.ar.meshLine.MeshLine();
            const lineMat = new realityEditor.gui.ar.meshLine.MeshLineMaterial({
                color: 0xffff00,
                opacity: 0.6,
                lineWidth: 14,
                // depthWrite: false,
                transparent: true,
                side: THREE.DoubleSide,
            });
            const historyMesh = new THREE.Mesh(historyLine, lineMat);
            const historyPoints = [];
            historyLine.setPoints(historyPoints);
            this.historyLineContainer.add(historyMesh);

            this.historyPointsAll[poseRenderer.id] = historyPoints;
            this.historyLinesAll[poseRenderer.id] = historyLine;
        }


        resetHistoryLines() {
            // Loop over copy of children to remove all
            for (let child of this.historyLineContainer.children.concat()) {
                this.historyLineContainer.remove(child);
            }
        }

        resetHistoryClones() {
            for (let child of this.historyCloneContainer.children.concat()) {
                this.historyCloneContainer.remove(child);
            }
        }

        /**
         * @param {boolean} visible
         */
        setHistoryLinesVisible(visible) {
            this.historyLineContainer.visible = visible;
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
                if (obj.material && obj.__cloneMaterials) {
                    let index = this.cloneMaterialIndex % obj.__cloneMaterials.length;
                    obj.material = obj.__cloneMaterials[index];
                }
            });
        }
    }

    function renderHumanPoseObjects(poseObjects) {
        if (!humanPoseAnalyzer) {
            const historyLineContainer = new THREE.Group();
            historyLineContainer.visible = false;
            realityEditor.gui.threejsScene.addToScene(historyLineContainer);

            const historyCloneContainer = new THREE.Group();
            historyCloneContainer.visible = true;
            realityEditor.gui.threejsScene.addToScene(historyCloneContainer);

            humanPoseAnalyzer = new HumanPoseAnalyzer(historyLineContainer, historyCloneContainer);
        }

        for (let id in poseRenderers) {
            poseRenderers[id].updated = false;
        }
        for (let poseObject of poseObjects) {
            renderPose(poseObject);
        }
        for (let id of Object.keys(poseRenderers)) {
            if (!poseRenderers[id].updated) {
                poseRenderers[id].removeFromScene();
                delete poseRenderers[id];
            }
        }
    }

    function renderPose(poseObject) {
        // assume that all sub-objects are of the form poseObject.id + joint name

        if (!poseRenderers[poseObject.uuid]) {
            poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
            poseRenderers[poseObject.uuid].addToScene();
        }
        let poseRenderer = poseRenderers[poseObject.uuid];
        poseRenderer.updated = true;

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let groundPlaneRelativeMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));

        for (let jointId of Object.values(utils.JOINTS)) {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.uuid}${jointId}`);

            let jointMatrixThree = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
            jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

            let jointPosition = new THREE.Vector3();
            jointPosition.setFromMatrixPosition(jointMatrixThree);

            poseRenderer.setJointPosition(jointId, jointPosition);
        }
        poseRenderer.updateBonePositions();

        humanPoseAnalyzer.poseRendererUpdated(poseRenderer);
    }

    function resetHistoryLines() {
        humanPoseAnalyzer.resetHistoryLines();
    }

    function resetHistoryClones() {
        humanPoseAnalyzer.resetHistoryClones();
    }

    /**
     * @param {boolean} visible
     */
    function setHistoryLinesVisible(visible) {
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


    exports.renderHumanPoseObjects = renderHumanPoseObjects;
    exports.resetHistoryLines = resetHistoryLines;
    exports.resetHistoryClones = resetHistoryClones;
    exports.setHistoryLinesVisible = setHistoryLinesVisible;
    exports.setRecordingClonesEnabled = setRecordingClonesEnabled;
    exports.advanceCloneMaterial = advanceCloneMaterial;

}(realityEditor.humanPose.draw));
