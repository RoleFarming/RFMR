// SETUP [

var engine;
var scene;
var canvas;

var xrInited

async function setup() {

    canvas = document.getElementById("renderCanvas");

    //var engine = null;
    //var scene = null;
    var sceneToRender = null;
    var createDefaultEngine = function() { return new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true,  disableWebGL2Support: false}); };

    initFunction = async function() {               
        var asyncEngineCreation = async function() {
            try {
                return createDefaultEngine();
            } catch(e) {
                console.log("the available createEngine function failed. Creating the default engine instead");
                return createDefaultEngine();
            }
        }

        engine = await asyncEngineCreation();
        
        if (!engine) 
            throw 'engine should not be null.';
        
        scene = init()
    };
    
    initFunction().then(() => {
        scene.then(returnedScene => { sceneToRender = returnedScene; });
            
        engine.runRenderLoop(function () {
            if (sceneToRender && sceneToRender.activeCamera) {
                sceneToRender.render();
            }
        });
    });

    // Resize
    window.addEventListener("resize", function () {
        engine.resize();
    });
}

// SETUP ]

async function setupAR(scene) {

    if (xrInited)
        return scene
    xrInited = true

    // AR availability check and GUI in non-AR mode
    let arAvailable = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');

    arAvailable = true;

    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "FullscreenUI"
    );

    var rectangle = new BABYLON.GUI.Rectangle("rect");
    rectangle.background = "#040";
    rectangle.color = "blue";
    rectangle.width = "70%";
    rectangle.height = "30%";

    advancedTexture.addControl(rectangle);
    var nonXRPanel = new BABYLON.GUI.StackPanel();
//    rectangle.addControl(nonXRPanel);

    if (!arAvailable) {
        const text1 = new BABYLON.GUI.TextBlock("text1");
        text1.fontFamily = "Helvetica";
        text1.textWrapping = true;
        text1.text = "AR is not available in your system. Please make sure you use a supported mobile device such as a modern Android device and a supported browser like Chrome.";
        text1.color = "white";
        text1.fontSize = "20px";
        text1.height = "100px"

        text1.paddingLeft = "10px";
        text1.paddingRight = "10px";
        nonXRPanel.addControl(text1);

        const text2 = new BABYLON.GUI.TextBlock("text1");
        text2.fontFamily = "Helvetica";
        text2.textWrapping = true;
        text2.text = "Make sure you have Google AR services installed and that you enabled the WebXR incubation flag under chrome://flags";
        text2.color = "white";
        text2.fontSize = "20px";
        text2.height = "100px";
        text2.paddingLeft = "10px";
        text2.paddingRight = "10px";
        nonXRPanel.addControl(text2);
        return null;
    } else {
        const text1 = new BABYLON.GUI.TextBlock("text1");
        text1.fontFamily = "Helvetica";
        text1.textWrapping = true;
        text1.text = "Welcome to RFMR Game! Please enter AR mode";
        text1.color = "white";
        text1.fontSize = "14px";
        text1.height = "400px"

        text1.paddingLeft = "10px";
        text1.paddingRight = "10px";
        nonXRPanel.addControl(text1);
    }

    // Create the WebXR Experience Helper for an AR Session (it initializes the XR scene, creates an XR Camera, 
    // initialize the features manager, create an HTML UI button to enter XR,...)
    var xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: "immersive-ar",
            referenceSpaceType: "local-floor",
            onError: (error) => {
                alert(error);
            }
        },
        optionalFeatures: true
    });

    //Hide GUI in AR mode
    xr.baseExperience.sessionManager.onXRSessionInit.add(() => {
        rectangle.isVisible = false;
    })
    xr.baseExperience.sessionManager.onXRSessionEnded.add(() => {
        rectangle.isVisible = true;
    })

    return xr;
}

// SCENE [


/***************************************************
 * WebXR AR demo with Particle Systems and hit-test
 * ************************************************
 * 
 * Working (at the moment) on android devices and the latest chrome and Google VR Services installed.
 *
 * 
 * - Once in AR, look at the floor or at a flat surface for a few seconds (and move a little): the hit-testing ring will appear.
 * - Then, if the ring is displayed, the first press on the screen will add an Orb made of 4 Particle Systems in the requested position. 
 * - The Orb will be kept in place by the AR system you are using.
 * - It will "blossom" when you get closer to it (<3m).
 * 
 * 
 * Created by @thomlucc, based on example from Raanan Weber (@RaananW).
 * Details about how to create the Orb: https://babylonjs.medium.com/visual-effects-with-particles-a-guide-for-beginners-5f322445388d
 */

var createScene = async function () {

    // Creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // Creates and positions a free camera (non-mesh)
    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 1, -5), scene);

    // Cargets the camera to scene origin
    camera.setTarget(BABYLON.Vector3.Zero());

    // Attaches the camera to the canvas
    camera.attachControl(canvas, true);

    // Creates lights
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    var dirLight = new BABYLON.DirectionalLight("dirlight", new BABYLON.Vector3(0, -1, -0.5), scene);
    dirLight.position = new BABYLON.Vector3(0, 5, -5);

    // XR [

    let xr = await setupAR(scene);
    if (!xr) {
        return;
    }
    return scene

    // Get the Feature Manager and from it the HitTesting fearture 
    const fm = xr.baseExperience.featuresManager;
    const xrTest = fm.enableFeature(BABYLON.WebXRHitTest.Name, "latest");

    // Get XR Camera Created by Basic Experience Helper 
    const xrCamera = xr.baseExperience.camera

    // XR ]

    // TORUS [

    //Create a marker that will be used to represent the hitTest position
    const marker = BABYLON.MeshBuilder.CreateTorus('marker', { diameter: 0.15, thickness: 0.05, tessellation: 32 });
    marker.isVisible = false;
    marker.rotationQuaternion = new BABYLON.Quaternion();

    var matStd = new BABYLON.StandardMaterial("matstd", scene);
    matStd.diffuseTexture = new BABYLON.Texture("textures/albedo.png", scene);
    matStd.diffuseTexture.uScale = .5;
    matStd.diffuseTexture.vScale = .5;
    marker.material = matStd;

    // TORUS ]

    // Update the position/rotation of the marker with HitTest information
    let hitTest;
    xrTest.onHitTestResultObservable.add((results) => {
        if (results.length) {
            marker.isVisible = true;
            hitTest = results[0];
            hitTest.transformationMatrix.decompose(undefined, marker.rotationQuaternion, marker.position);
        } else {
            marker.isVisible = false;
            hitTest = undefined;
        }
    });
/*
    // Create the first two particle systems that will be updated later
    var orbCore = await BABYLON.ParticleHelper.CreateFromSnippetAsync("EXUQ7M#5", scene);
    orbCore.stop();
    var orbSparks = await BABYLON.ParticleHelper.CreateFromSnippetAsync("UY098C#3", scene);
    orbSparks.stop();
    var sphereSpark = BABYLON.MeshBuilder.CreateSphere("sphereSpark", { diameter: 0.4, segments: 32 }, scene);
    sphereSpark.isVisible = false;

    // Create/update the Orb's particles systems at the hitTest Position
    var orbAppearded = false;
    var coreAppeared = false;
    const orbPositionOffSet = 1.2;

    scene.onPointerDown = (evt, pickInfo) => {

        if (hitTest && xr.baseExperience.state === BABYLON.WebXRState.IN_XR && !orbAppearded) {

            //The Orb is made of 4 Particle systems
            // 1st Particle Sytem - Circles
            BABYLON.ParticleHelper.CreateFromSnippetAsync("2JRD1A#2", scene, false).then(system => {
                let circlePosition = new BABYLON.Vector3();
                hitTest.transformationMatrix.decompose(undefined, undefined, circlePosition);
                circlePosition = circlePosition.add(new BABYLON.Vector3(0, orbPositionOffSet, 0));
                system.emitter = circlePosition;
            });

            // 2nd Particle Sytem - Core
            let corePosition = new BABYLON.Vector3();
            hitTest.transformationMatrix.decompose(undefined, undefined, corePosition);
            corePosition = corePosition.add(new BABYLON.Vector3(0, orbPositionOffSet, 0));
            orbCore.emitter = corePosition;

            // 3rd Particle Sytem - Sparks
            orbSparks.emitter = sphereSpark;
            hitTest.transformationMatrix.decompose(undefined, sphereSpark.rotationQuaternion, sphereSpark.position);
            let direction = new BABYLON.Vector3(0, 1, 0);
            sphereSpark.translate(direction, orbPositionOffSet, BABYLON.Space.LOCAL);
            orbSparks.maxEmitPower = 10;
            orbSparks.start();

            // 4th Particle Sytem - Smoke
            var sphereSmoke = BABYLON.MeshBuilder.CreateSphere("sphereSmoke", { diameter: 1.8, segments: 32 }, scene);
            sphereSmoke.isVisible = false;
            BABYLON.ParticleHelper.CreateFromSnippetAsync("UY098C#6", scene, false).then(system => {
                system.emitter = sphereSmoke;
                hitTest.transformationMatrix.decompose(undefined, sphereSmoke.rotationQuaternion, sphereSmoke.position);
                let direction = new BABYLON.Vector3(0, 1, 0);
                sphereSmoke.translate(direction, orbPositionOffSet, BABYLON.Space.LOCAL);
            });

            orbAppearded = true;
        }
    }
*/
    // RENDER LOOP [

    //Rendering loop 
    scene.onBeforeRenderObservable.add(() => {
/*
        //Calculate distance between XRCamera and the Orb
        var distanceToOrb = sphereSpark.position.subtract(xrCamera.position).length();
        const distanceBlossom = 3

        if (orbAppearded) marker.isVisible = false;

        //Make the Orb blossom when we (the XRcamera) get close to it    
        if (orbAppearded && !coreAppeared && (distanceToOrb < distanceBlossom)) {
            orbCore.start();
            coreAppeared = true;
            orbSparks.emitRate = 1500;
        }
        else {
            orbCore.stop();
            coreAppeared = false;
            orbSparks.emitRate = 40;
        }
        */


//        box.position.x += 0.0001;

    });

    // RENDER LOOP ]
    // PLANE [

//    const plane = BABYLON.Mesh.CreatePlane("plane", size, scene);
//    const plane = BABYLON.Mesh.CreatePlane("plane", size, scene, updatable, sideOrientation); //optional parameters after scene

    const Mesh = BABYLON.Mesh
    

//    var options = {width:1, height:1}
    var size = 5;

    const plane = BABYLON.Mesh.CreatePlane("plane", size, scene);
///    const plane = BABYLON.Mesh.CreatePlane("plane", {}, scene);

//    plane.position = new BABYLON.Vector3(5, 5, -5);
//    plane.position = new BABYLON.Vector3(0, 5, -5);
    plane.position = new BABYLON.Vector3(0, 0, 5);

//    plane.sideOrientation = Mesh.DOUBLESIDE
//    plane.rotation = new BABYLON.Vector3(3, 2, 5);

//    plane.position.subtract(xrCamera.position).length();

    // PLANE ]

    var box = BABYLON.MeshBuilder.CreateBox("box", {}, scene);
//    box.material = matStd;
    box.position = new BABYLON.Vector3(0, 5, 7);

//    var ground = BABYLON.MeshBuilder.CreateGround("gd", {width: 6, subdivsions: 4}, scene);

    //        var plane1 = BABYLON.Mesh.CreatePlane("plane1", 1);
    //        plane1.position = new BABYLON.Vector3(0.0, 1.5, 0.4)

/*
var plane = BABYLON.Mesh.CreatePlane("plane", 350, scene);
plane.position.y = -5;
plane.rotation.x = Math.PI / 2;
box.rotation.y = Math.PI / 4;
box.rotation.y = BABYLON.Tools.ToRadians(45);
box.scaling.x = 2;
box.scaling.y = 1.5;
box.scaling.z = 3;
*/

    var options1 = {
        width: 512,
        height: 256
    }
    var label1 = createLabel("label1", "Falcon1", options1, scene);
//    label1.position = new BABYLON.Vector3(0, 5, 200);
    label1.position = new BABYLON.Vector3(0, 0, 4);
    label1.scaling = new BABYLON.Vector3(0.01, 0.01, 1);

    return scene;

};

// SCENE ]
// TEXT LABEL 1 [

function createLabel(name, text, options, scene) {

    var font_type = "Arial";

    //Create plane
    var plane = BABYLON.MeshBuilder.CreatePlane("plane", options, scene);

    //Set width and height for dynamic texture using same multiplier
    var DTWidth = options.width;
    var DTHeight = options.height;
    
    //Create dynamic texture
    var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", {width:DTWidth, height:DTHeight}, scene);

    //Check width of text for given font type at any size of font
    var ctx = dynamicTexture.getContext();
    var size = 12; //any value will work
    ctx.font = size + "px " + font_type;
    var textWidth = ctx.measureText(text).width;
    
    //Calculate ratio of text width to size of font used
    var ratio = textWidth/size;
    
    //set font to be actually used to write text on dynamic texture
    var font_size = Math.floor(DTWidth / (ratio * 1)); //size of multiplier (1) can be adjusted, increase for smaller text
    var font = font_size + "px " + font_type;
    
    //Draw text
    dynamicTexture.drawText(text, null, null, font, "#000000", "#ffff00", true);

    //create material
    var mat = new BABYLON.StandardMaterial("mat", scene);
    mat.diffuseTexture = dynamicTexture;
    
    //apply material
    plane.material = mat;

    return plane
}

// TEXT LABEL 1 ]
// BUTTONS 1 [

var createScene2 = async function () {
    var scene = new BABYLON.Scene(engine);
    var camera = new BABYLON.ArcRotateCamera("cam", -Math.PI / 2, Math.PI / 2, 10, BABYLON.Vector3.Zero());

    camera.wheelDeltaPercentage = 0.01;
    camera.attachControl(canvas, true);

    // Create the 3D UI manager
    var manager = new BABYLON.GUI.GUI3DManager(scene);

    // Create a horizontal stack panel
    var panel = new BABYLON.GUI.SpherePanel();
  
    manager.addControl(panel);
    panel.position.z = -1.5;

    // Let's add some buttons!
    var addButton = function() {
        var button = new BABYLON.GUI.HolographicButton("orientation");
        panel.addControl(button);

        button.text = "Button #" + panel.children.length;
    }

    panel.blockLayout = true;
    for (var index = 0; index < 60; index++) {
        addButton();    
    }
    panel.blockLayout = false;

    return scene;

};

// BUTTONS 1 ]
// SCENE 3 [

var createScene3 = async function () {

    var scene = new BABYLON.Scene(engine);
//    scene.clearColor = new BABYLON.Color3(0.0, 0.0, 0.0);


    var light = new BABYLON.HemisphericLight("Hemi", new BABYLON.Vector3(0, 1, 0), scene);
    light.groundColor = new BABYLON.Color3(1, 0, 0);

    var camera = new BABYLON.ArcRotateCamera("Camera", -.8, 1.3, 65, new BABYLON.Vector3.Zero(), scene);
    camera.attachControl(canvas);

    let xr = await setupAR(scene);
    if (!xr) {
        return;
    }

    // Mirrors
    var tile1 = BABYLON.Mesh.CreatePlane("tile1", 70, scene);
    tile1.position.y = -15;
    tile1.rotation = new BABYLON.Vector3(Math.PI / 2, 0, 0);
    tile1.showBoundingBox = true;
/*
    var tile2 = BABYLON.Mesh.CreatePlane("tile2", 70, scene);
    tile2.position = new BABYLON.Vector3(0, 20, 35);
    tile2.rotation = new BABYLON.Vector3(Math.PI, Math.PI, 0);
    tile2.showBoundingBox = true;

    var tile3 = BABYLON.Mesh.CreatePlane("tile3", 70, scene);
    tile3.position = new BABYLON.Vector3(-35, 20, 0);
    tile3.rotation = new BABYLON.Vector3(Math.PI, Math.PI/2, 0);
    tile3.showBoundingBox = true;
*/

    // Emitters
    var emitter0 = BABYLON.Mesh.CreateBox("emitter0", 2, scene);
    emitter0.position.y = 2;
    emitter0.isVisible = true;
    emitter0.material = new BABYLON.StandardMaterial("emat", scene);
    emitter0.material.diffuseColor = BABYLON.Color3.Blue();

    //Creation of mirror materials
    var mirrorMaterial1 = new BABYLON.StandardMaterial("texture4", scene);
    mirrorMaterial1.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial1.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial1.reflectionTexture = new BABYLON.MirrorTexture("mirror", 1024, scene, true); //Create a mirror texture
    mirrorMaterial1.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, -1.0, 0, -5.0);
    mirrorMaterial1.reflectionTexture.renderList = [emitter0];
    mirrorMaterial1.reflectionTexture.level = 1; //Select the level (0.0 > 1.0) of the reflection

    var mirrorMaterial2 = new BABYLON.StandardMaterial("texture6", scene);
    mirrorMaterial2.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial2.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial2.reflectionTexture = new BABYLON.MirrorTexture("mirror2", 1024, scene, true);
    mirrorMaterial2.reflectionTexture.mirrorPlane = new BABYLON.Plane(0, 0, 1, -10.0);
    mirrorMaterial2.reflectionTexture.renderList = [emitter0];
    mirrorMaterial2.reflectionTexture.level = 1;

    var mirrorMaterial3 = new BABYLON.StandardMaterial("texture6", scene);
    mirrorMaterial3.diffuseColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial3.specularColor = new BABYLON.Color3(0.0, 0.0, 0.0);
    mirrorMaterial3.reflectionTexture = new BABYLON.MirrorTexture("mirror2", 1024, scene, true);
    mirrorMaterial3.reflectionTexture.mirrorPlane = new BABYLON.Plane(-1, 0, 0, -10.0);
    mirrorMaterial3.reflectionTexture.renderList = [emitter0];
    mirrorMaterial3.reflectionTexture.level = 1;

    //Applying materials
    tile1.material = mirrorMaterial1;
/*
    tile2.material = mirrorMaterial2;
    tile3.material = mirrorMaterial3;
*/
    // Particles
    var particleSystem = new BABYLON.ParticleSystem("particles", 50000, scene);

    // particleSystem.particleTexture = new BABYLON.Texture("textures/flare.png", scene);
    particleSystem.particleTexture = new BABYLON.Texture("http://i166.photobucket.com/albums/u83/j1m68/star.jpg", scene);

    particleSystem.minSize = 0.01;
    particleSystem.maxSize = 2;
    particleSystem.minLifeTime = 10;
    particleSystem.maxLifeTime = 10;
    particleSystem.minEmitPower = 2;
    particleSystem.maxEmitPower = 2;

/*
    particleSystem.color1 = new BABYLON.Color4(1, 0, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(0, 1, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(1, 1, 1, 1);
*/

    particleSystem.minAngularSpeed = -5;
    particleSystem.maxAngularSpeed = 5;
    particleSystem.emitter = emitter0;

    particleSystem.emitRate = 20;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

    particleSystem.direction1 = new BABYLON.Vector3(-.3, 1, -.3);
    particleSystem.direction2 = new BABYLON.Vector3(.3, 1, .3);

    particleSystem.gravity = new BABYLON.Vector3(0, -.1, 0);
    particleSystem.start();

// -----------------------------------------------------------------------------------------------------------------------
    var randomNumber = function (min, max) {
        if (min == max) {
            return (min);
        }

        var random = Math.random();

        return ((random * (max - min)) + min);
    };
// -----------------------------------------------------------------------------------------------------------------------
    var doubleColor4 = function (min, max) {
        return new BABYLON.Color4(Math.random()*2, Math.random()*2, Math.random()*2, Math.random());
    }
// -----------------------------------------------------------------------------------------------------------------------

    // animation
    var animate = function() {
        emitter0.rotation.y += .1;
        particleSystem.color1 = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
        particleSystem.color2 = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
        particleSystem.colorDead = new BABYLON.Color4(Math.random(), Math.random(), Math.random(), 1);
    }

    scene.registerBeforeRender(animate);

    return scene;
};

// SCENE 3 ]
// SCENE 4 [

async function createScene4(scene)
{
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.ArcRotateCamera(
       "Camera", Math.PI / 4, Math.PI / 4, 4, BABYLON.Vector3.Zero(), scene);

    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    BABYLON.Effect.ShadersStore["customVertexShader"] = "\r\n" + 
       "precision highp float;\r\n" + 
       "// Attributes\r\n" + 
       "attribute vec3 position;\r\n" + 
       "attribute vec2 uv;\r\n" + 
       "// Uniforms\r\n" + 
       "uniform mat4 worldViewProjection;\r\n" + 

       "// Varying\r\n" + 
       "varying vec2 vUV;\r\n" + 
       "void main(void) {\r\n" + 
          "gl_Position = worldViewProjection * vec4(position, 1.0);\r\n" + 
          "vUV = uv;\r\n"+"       }       \r\n";
       BABYLON.Effect.ShadersStore["customFragmentShader"] = "\r\n"+
          "precision highp float;\r\n" + 
          "varying vec2 vUV;\r\n" + 
          "uniform sampler2D textureSampler;\r\n" + 
       "void main(void) {          \r\n"+
          "gl_FragColor = texture2D(textureSampler, vUV);\r\n"+"       }       \r\n";

    //

//    BABYLON.Effect.ShadersStore["customFragmentShader"] = $('#shader1').text()
    BABYLON.Effect.ShadersStore["customFragmentShader"] = $('#shader2').text()

    var shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
        vertex: "custom",
        fragment: "custom",
    }, {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "iTime"]
    });

//    shaderMaterial.AddUniform('iTime', 'float');
//    mainMaterial.AddUniform('radius', 'float');
//    mainMaterial.AddUniform('radiusVariationAmplitude', 'float');
//    mainMaterial.AddUniform('radiusNoiseFrequency', 'float');
    let initTime = new Date()
    shaderMaterial.onBind = () => {
        let time = (+new Date() - initTime) * .001;
        shaderMaterial.getEffect().setFloat('iTime', time);//time);
//        shaderMaterial.getEffect().setFloat('iTime', Math.random()*100);//time);

//        mainMaterial.getEffect().setFloat('radius', radius);
//        mainMaterial.getEffect().setFloat('radiusVariationAmplitude', 0.75);
//        mainMaterial.getEffect().setFloat('radiusNoiseFrequency', 0.5);
    };

    var mainTexture = new BABYLON.Texture("images/mat.jpg", scene);

    shaderMaterial.setTexture("textureSampler", mainTexture);

    shaderMaterial.backFaceCulling = false;

//    var box = BABYLON.MeshBuilder.CreateBox("box", {}, scene);
//    box.material = shaderMaterial;


    const plane = BABYLON.Mesh.CreatePlane("plane", 5, scene);
    plane.position = new BABYLON.Vector3(0, 0, 5);
    plane.material = shaderMaterial

    return scene;
}

// SCENE 4 ]
// INIT [

async function init() {
//            scene = await createScene();
//            let scene = await createScene2();
//    let scene = await createScene3();
    let scene = await createScene4();

    let xr = await setupAR(scene);
    if (!xr) {
        return;
    }
    return scene
}

window.onload = function ()
{
//   setup();
    setup1()
}

async function setup1() {
    canvas = document.getElementById("renderCanvas");
    engine = new BABYLON.Engine(canvas, true);
    var scene = await createScene4();
    let xr = await setupAR(scene);
    if (!xr) {
//        return;
    }
    engine.runRenderLoop(function() {
        scene.render();
    });
}

// INIT ]
