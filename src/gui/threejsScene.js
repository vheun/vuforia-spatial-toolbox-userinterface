createNameSpace("realityEditor.gui.threejsScene");

// three.js libraries are loaded from a CDN since we don't currently use a build system for the userinterface
import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js';
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/BufferGeometryUtils.js';
// import { SceneUtils }  from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/SceneUtils.js';

(function(exports) {

    var camera, scene, renderer;
    var rendererWidth = window.innerWidth;
    var rendererHeight = window.innerHeight;
    var aspectRatio = rendererWidth / rendererHeight;
    var isProjectionMatrixSet = false;
    const animationCallbacks = [];
    let lastFrameTime = Date.now();
    const worldObjectGroups = {}; // Parent objects for objects attached to world objects
    const worldObjectOccludedGroups = {}; // Parent objects for occluded objects attached to world objects
    const worldOcclusionObjects = {}; // Keeps track of initialized occlusion objects per world object

    // for now, everything gets added to this and then this moves based on the modelview matrix of the world origin
    // todo: in future, move three.js camera instead of moving the scene
    var threejsContainerObj;

    function initService() {
        // create a fullscreen webgl renderer for the threejs content and add to the dom
        renderer = new THREE.WebGLRenderer( { alpha: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( rendererWidth, rendererHeight );
        renderer.domElement.id = 'mainThreejsCanvas'; // this applies some css to make it fullscreen
        document.body.appendChild( renderer.domElement );
        camera = new THREE.PerspectiveCamera( 70, aspectRatio, 1, 1000 );
        scene = new THREE.Scene();

        // create a parent 3D object to contain all the three js objects
        // we can apply the transform to this object and all of its children objects will be affected
        threejsContainerObj = new THREE.Object3D();
        threejsContainerObj.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        scene.add(threejsContainerObj);

        // light the scene with a combination of ambient and directional white light
        var ambLight = new THREE.AmbientLight(0xffffff);
        scene.add(ambLight);
        var dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(-10, -10, 1000);
        scene.add(dirLight);
        var spotLight = new THREE.SpotLight(0xffffff);
        spotLight.position.set(-30, -30, 150);
        spotLight.castShadow = true;
        scene.add(spotLight);

        // additional 3d content can be added to the scene like so:
        // var radius = 75;
        // var geometry = new THREE.IcosahedronGeometry( radius, 1 );
        // var materials = [
        //     new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading, vertexColors: THREE.VertexColors, shininess: 0 } ),
        //     new THREE.MeshBasicMaterial( { color: 0x000000, shading: THREE.FlatShading, wireframe: true, transparent: true } )
        // ];
        // mesh = SceneUtils.createMultiMaterialObject( geometry, materials );
        // threejsContainerObj.add( mesh );
        // mesh.position.setZ(150);

        renderScene(); // update loop 
    }

    function renderScene() {
        const deltaTime = Date.now() - lastFrameTime; // In ms
        lastFrameTime = Date.now();
        
        animationCallbacks.forEach(callback => {
            callback(deltaTime);
        });
        
        if (globalStates.realProjectionMatrix && globalStates.realProjectionMatrix.length > 0) {
            setMatrixFromArray(camera.projectionMatrix, globalStates.realProjectionMatrix);
            isProjectionMatrixSet = true;
        }
        
        const worldObjectIds = realityEditor.worldObjects.getWorldObjectKeys();
        worldObjectIds.forEach(worldObjectId => {
            if (!worldObjectGroups[worldObjectId]) {
                const group = new THREE.Group();
                worldObjectGroups[worldObjectId] = group;
                group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
                scene.add(group);
                
                const occludedGroup = new THREE.Group();
                worldObjectOccludedGroups[worldObjectId] = occludedGroup;
                occludedGroup.matrixAutoUpdate = false; // this is needed to position it directly with matrices
                occludedGroup.renderOrder = 2; // Causes objects in this group to be occluded by the mesh
                scene.add(occludedGroup);
                
                // Helps visualize world object origin point
                // if (worldObjectId != realityEditor.worldObjects.getLocalWorldId()) {
                //     const originBox = new THREE.Mesh(new THREE.BoxGeometry(10,10,10),new THREE.MeshNormalMaterial());
                //     const xBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0xff0000}));
                //     const yBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x00ff00}));
                //     const zBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x0000ff}));
                //     xBox.position.x = 15;
                //     yBox.position.y = 15;
                //     zBox.position.z = 15;
                //     group.add(originBox);
                //     originBox.scale.set(10,10,10);
                //     originBox.add(xBox);
                //     originBox.add(yBox);
                //     originBox.add(zBox);
                // }
            }
            const group = worldObjectGroups[worldObjectId];
            const occludedGroup = worldObjectOccludedGroups[worldObjectId];
            const modelViewMatrix = realityEditor.sceneGraph.getModelViewMatrix(worldObjectId);
            if (modelViewMatrix) {
                setMatrixFromArray(group.matrix, modelViewMatrix);
                setMatrixFromArray(occludedGroup.matrix, modelViewMatrix);
                group.visible = true;
                occludedGroup.visible = true;
            } else {
                group.visible = false;
                occludedGroup.visible = false;
            }
        });
        
        const rootModelViewMatrix = realityEditor.sceneGraph.getGroundPlaneModelViewMatrix();
        if (rootModelViewMatrix) {
            setMatrixFromArray(threejsContainerObj.matrix, rootModelViewMatrix);
        }
        
        // only render the scene if the projection matrix is initialized
        if (isProjectionMatrixSet) {
            renderer.render( scene, camera );
        }
        
        // // this gets the model view matrix of the world object. ignores the WORLD_local
        // let modelViewMatrix = null;
        // let worldObject = realityEditor.worldObjects.getBestWorldObject();
        // if (worldObject && worldObject.objectId !== realityEditor.worldObjects.getLocalWorldId()) {
        //     // TODO: modify addToScene to addToAreaTarget and use positions relative to that
        //     // This also allows for multiple containers with different mvMatrices for each area target
        //     modelViewMatrix = realityEditor.sceneGraph.getModelViewMatrix(worldObject.objectId);
        // }
        // 
        // // only render the scene if we're localized within a world object and the projection matrix is initialized
        // if (isProjectionMatrixSet && modelViewMatrix) {
        //     // update model view matrix and render the scene
        //     setMatrixFromArray(threejsContainerObj.matrix, modelViewMatrix);
        //     renderer.render( scene, camera );
        // }
        
        requestAnimationFrame(renderScene);
    }
    
    function addToScene(obj, worldObjectId, occluded) {
        if (obj) {
            if (worldObjectId) {
                if (occluded) {
                    worldObjectOccludedGroups[worldObjectId].add(obj);
                } else {
                    worldObjectGroups[worldObjectId].add(obj);
                }
            } else {
                threejsContainerObj.add(obj);
            }
        }
    }
    
    function removeFromScene(obj) {
        if (obj && obj.parent) {
            obj.parent.remove(obj);
        }
    }
    
    function onAnimationFrame(callback) {
        animationCallbacks.push(callback);
    }
    
    function removeAnimationCallback(callback) {
        if (animationCallbacks.includes(callback)) {
            animationCallbacks.splice(animationCallbacks.indexOf(callback), 1);
        }
    }
    
    function addOcclusionGltf(pathToGltf, objectId) {
        if (worldOcclusionObjects[objectId]) {
            console.log(`didn't load occlusion gltf`);
            return; // Don't try creating multiple occlusion objects for the same world object
        }
        
        const gltfLoader = new GLTFLoader();
        console.log('loading occlusion gltf');
        gltfLoader.load(pathToGltf, function(gltf) {
            if (gltf.scene.children[0].geometry) {
                gltf.scene.children[0].geometry.computeVertexNormals();
                gltf.scene.children[0].material = new THREE.MeshNormalMaterial();
                gltf.scene.children[0].material.colorWrite = false; // Makes it invisible
                // gltf.scene.children[0].renderOrder = 1;
            } else {
                gltf.scene.children[0].children.forEach(child => {
                    child.geometry.computeVertexNormals();
                    child.material = new THREE.MeshNormalMaterial();
                    child.material.colorWrite = false; // Makes it invisible
                    // child.renderOrder = 1;
                });
            }
            // gltf.scene.material = new THREE.MeshNormalMaterial();
            // gltf.scene.material.colorWrite = false; // Makes it invisible
            gltf.scene.renderOrder = 1; // To make something occluded by the mesh, set its renderOrder > 1
        
            // align the coordinate systems
            gltf.scene.scale.set(1000, 1000, 1000); // convert meters -> mm
        
            scene.add(gltf.scene);
        
            worldOcclusionObjects[objectId] = gltf.scene;
        
            console.log(`loaded occlusion gltf for ${objectId}`, pathToGltf);
            
            // const testObj = new THREE.Mesh(new THREE.BoxGeometry(50,200,50),new THREE.MeshStandardMaterial());
            // worldObjectGroups[objectId].add(testObj);
        });
    }
    
    function isOcclusionActive(objectId) {
        return !!worldOcclusionObjects[objectId];
    }
    
    /* For my example area target:
        pathToGltf = './svg/BenApt1_authoring.glb' // put in arbitrary local directory to test
        originOffset = {x: -600, y: 0, z: -3300};
        originRotation = {x: 0, y: 2.661627109291353, z: 0};
     */
    function addGltfToScene(pathToGltf, originOffset, originRotation) {
        const gltfLoader = new GLTFLoader();

        gltfLoader.load(pathToGltf, function(gltf) {
            
            if (gltf.scene.children[0].geometry) {
                // gltf.scene.children[0].material = new THREE.MeshStandardMaterial( { color: 0xaaaaaa } );
                gltf.scene.children[0].geometry.computeVertexNormals();
                gltf.scene.children[0].geometry.computeBoundingBox();
            } else {
                gltf.scene.children[0].children.forEach(child => {
                    child.material = new THREE.MeshBasicMaterial( {color: new THREE.Color(Math.random(), Math.random(), Math.random()) }); //, side: THREE.BackSide })
                });
                const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(gltf.scene.children[0].children.map(child=>child.geometry));
                mergedGeometry.computeVertexNormals();
                mergedGeometry.computeBoundingBox();
            }

            // align the coordinate systems
            gltf.scene.scale.set(1000, 1000, 1000); // convert meters -> mm
            if (typeof originOffset !== 'undefined') {
                gltf.scene.position.set(originOffset.x, originOffset.y, originOffset.z);
            }
            if (typeof originRotation !== 'undefined') {
                gltf.scene.rotation.set(originRotation.x, originRotation.y, originRotation.z);
            }

            threejsContainerObj.add( gltf.scene );

            console.log('loaded gltf', pathToGltf);
        });
    }

    // small helper function for setting three.js matrices from the custom format we use
    function setMatrixFromArray(matrix, array) {
        matrix.set( array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }

    exports.initService = initService;
    exports.addOcclusionGltf = addOcclusionGltf;
    exports.isOcclusionActive = isOcclusionActive;
    exports.addGltfToScene = addGltfToScene;
    exports.onAnimationFrame = onAnimationFrame;
    exports.removeAnimationCallback = removeAnimationCallback;
    exports.addToScene = addToScene;
    exports.removeFromScene = removeFromScene;
    exports.THREE = THREE;
})(realityEditor.gui.threejsScene);
