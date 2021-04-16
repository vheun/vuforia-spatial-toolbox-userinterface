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
        
        const originBox = new THREE.Mesh(new THREE.BoxGeometry(10,10,10),new THREE.MeshNormalMaterial());
        const xBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0xff0000}));
        const yBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x00ff00}));
        const zBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x0000ff}));
        xBox.position.x = 15;
        yBox.position.y = 15;
        zBox.position.z = 15;
        threejsContainerObj.add(originBox);
        originBox.scale.set(10,10,10);
        originBox.add(xBox);
        originBox.add(yBox);
        originBox.add(zBox);
        // onAnimationFrame(deltaT => {
        //   originBox.scale.x = 100 * Math.abs(Math.sin(Date.now()/2));
        //   originBox.scale.y = 100 * Math.abs(Math.sin(Date.now()/2));
        //   originBox.scale.z = 100 * Math.abs(Math.sin(Date.now()/2));
        // });

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
        
        if (globalStates.realProjectionMatrix && globalStates.realProjectionMatrix.length > 0) {
            setMatrixFromArray(camera.projectionMatrix, globalStates.realProjectionMatrix);
            isProjectionMatrixSet = true;
        }
        
        // this gets the model view matrix of the world object. ignores the WORLD_local
        let modelViewMatrix = null;
        let worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (worldObject && worldObject.objectId !== realityEditor.worldObjects.getLocalWorldId()) {
            // TODO: modify addToScene to addToAreaTarget and use positions relative to that
            // This also allows for multiple containers with different mvMatrices for each area target
            modelViewMatrix = realityEditor.sceneGraph.getModelViewMatrix(worldObject.objectId);
        }

        // only render the scene if we're localized within a world object and the projection matrix is initialized
        if (isProjectionMatrixSet && modelViewMatrix) {

            // children of the threejsContainerObject can be animated here
            // mesh.rotation.x += 0.25 * deltaT / 1000; // slow rotation, for aesthetic effect
            // mesh.rotation.y += 0.5 * deltaT / 1000;
            
            animationCallbacks.forEach(callback => {
                callback(deltaTime);
            });

            // update model view matrix and render the scene
            setMatrixFromArray(threejsContainerObj.matrix, modelViewMatrix);
            renderer.render( scene, camera );
        }
        
        requestAnimationFrame(renderScene);
    }
    
    function addToScene(obj) {
      threejsContainerObj.add(obj);
    }
    
    function removeFromScene(obj) {
      threejsContainerObj.remove(obj);
    }
    
    function onAnimationFrame(callback) {
      animationCallbacks.push(callback);
    }
    
    function removeAnimationCallback(callback) {
      if (animationCallbacks.includes(callback)) {
        animationCallbacks.splice(animationCallbacks.indexOf(callback), 1);
      }
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
    exports.addGltfToScene = addGltfToScene;
    exports.onAnimationFrame = onAnimationFrame;
    exports.removeAnimationCallback = removeAnimationCallback;
    exports.addToScene = addToScene;
    exports.removeFromScene = removeFromScene;
    exports.THREE = THREE;
})(realityEditor.gui.threejsScene);
