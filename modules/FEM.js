// global variables
var scene;
var camera, orthographicCamera, perspectiveCamera;
var renderer;

var renderer_output = document.getElementById("renderer-output");
var canvas = document.getElementById("canvas");

var stats, gui;

var clock, trackballControls;

var config;

var plane;

var joints, jointMaterial;
var frames, frameMaterial;

var joints_name = new Set();
var joints_coordiante = [];

function init() {
  // load the json config
  loadJSON("./config.json")
    .then(function (json) {
      // set the config
      config = json.remembered[json.preset]["0"];

      // set the background
      canvas.style.backgroundColor = config.topBackgroundColor;
      canvas.style.backgroundImage =
        "linear-gradient(" +
        config.topBackgroundColor +
        ", " +
        config.bottomBackgroundColor +
        ")";

      // create the scene
      scene = new THREE.Scene();

      // create the perspective camera and orthographic camera
      perspectiveCamera = new THREE.PerspectiveCamera(
        config.perspectiveCameraFOV,
        window.innerWidth / window.innerHeight,
        config.perspectiveCameraNear,
        config.perspectiveCameraFar
      );
      orthographicCamera = new THREE.OrthographicCamera(
        window.innerWidth / -16,
        window.innerWidth / 16,
        window.innerHeight / 16,
        window.innerHeight / -16,
        config.orthographicCameraNear,
        config.orthographicCameraFar
      );

      // set the camera
      if (config.cameraType == "perspective") {
        camera = perspectiveCamera;
      } else if (config.cameraType == "orthographic") {
        camera = orthographicCamera;
      }
      // set the position
      camera.position.set(
        config.cameraPosition_x,
        config.cameraPosition_y,
        config.cameraPosition_z
      );
      // set the look at
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      // create the WebGL renderer
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
      // set the size
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);

      // add the output to the html element
      renderer_output.appendChild(renderer.domElement);

      // create the clock
      clock = new THREE.Clock();

      // create the trackballControls
      if (config.cameraType == "perspective") {
        trackballControls = new THREE.TrackballControls(
          camera,
          renderer.domElement
        );
      } else if (config.cameraType == "orthographic") {
        trackballControls = new THREE.OrthographicTrackballControls(
          camera,
          renderer.domElement
        );
      }
      // set the properties
      trackballControls.rotateSpeed = config.rotateSpeed;
      trackballControls.zoomSpeed = config.zoomSpeed;
      trackballControls.panSpeed = config.panSpeed;
      trackballControls.staticMoving = config.staticMoving;

      // create and add the plane to the scene
      plane = new THREE.Object3D();
      // set the upwards axis
      setUpwardsAxis(config.axisUpwards);
      // create the grid
      var grid = new THREE.GridHelper(
        config.planeSize,
        (2 * config.planeSize) / config.planeDivisions
      );
      // set the colors
      grid.setColors(
        new THREE.Color(config.planeColorCenterLine),
        new THREE.Color(config.planeColorGrid)
      );
      // set the rotation
      grid.rotation.x = 0.5 * Math.PI;
      // add the grid to the plane
      plane.add(grid);
      // add the rectangle to the plane
      plane.add(
        new THREE.Mesh(
          new THREE.PlaneBufferGeometry(
            2 * config.planeSize,
            2 * config.planeSize
          ),
          new THREE.MeshBasicMaterial({
            color: config.planeColor,
            transparent: config.planeTransparent,
            opacity: config.planeOpacity,
            side: THREE.DoubleSide,
          })
        )
      );
      // set the orientation
      switch (config.axisUpwards) {
        case "x":
          plane.rotation.y = 0.5 * Math.PI;
          break;
        case "y":
          plane.rotation.x = 0.5 * Math.PI;
          break;
        case "z":
          break;
      }
      // add the plane to the scene
      scene.add(plane);

      // set the joints
      joints = new THREE.Object3D();
      // set the material
      jointMaterial = new THREE.MeshBasicMaterial({ color: config.jointColor });
      // add to the scene
      scene.add(joints);

      // set the frames
      frames = new THREE.Object3D();
      // set the material
      frameMaterial = new THREE.MeshBasicMaterial({ color: config.frameColor });
      // add to the scene
      scene.add(frames);

      // show axes in the screen
      var axes = new THREE.AxisHelper(1);
      scene.add(axes);

      // create the stats
      stats = initStats();

      return json;
    })
    .then(function ( json ) {
      // create the dat gui
      gui = new dat.GUI({ load: json, preset: json.preset });

      // close gui
      gui.close();

      // remember config
      gui.remember(config);

      // add a Background folder
      let backgroundFolder = gui.addFolder("Background");
      backgroundFolder.open();

      // set control topBackgroundColor
      let topBackgroundColorController = backgroundFolder.addColor(
        config,
        "topBackgroundColor"
      );
      topBackgroundColorController.name("Top color");
      topBackgroundColorController.onChange(function (topBackgroundColor) {
        // set the background
        canvas.style.backgroundColor = config.topBackgroundColor;
        canvas.style.backgroundImage =
          "linear-gradient(" +
          config.topBackgroundColor +
          ", " +
          config.bottomBackgroundColor +
          ")";
      });

      // set control bottomBackgroundColor
      let bottomBackgroundColorController = backgroundFolder.addColor(
        config,
        "bottomBackgroundColor"
      );
      bottomBackgroundColorController.name("Bottom color");
      bottomBackgroundColorController.onChange(function (
        bottomBackgroundColor
      ) {
        // set the background
        canvas.style.backgroundColor = config.topBackgroundColor;
        canvas.style.backgroundImage =
          "linear-gradient(" +
          config.topBackgroundColor +
          ", " +
          config.bottomBackgroundColor +
          ")";
      });

      // add a Camera folder
      let cameraFolder = gui.addFolder("Camera");
      cameraFolder.open();

      // perspective camera
      let perspectiveCameraFOVController;
      let perspectiveCameraNearController;
      let perspectiveCameraFarController;
      // orthographic camera
      let orthographicCameraNearController;
      let orthographicCameraFarController;

      // set control cameraType
      let cameraTypeController = cameraFolder
        .add(config, "cameraType")
        .options(["perspective", "orthographic"]);
      cameraTypeController.name("Type");
      cameraTypeController.onChange(function (cameraType) {
        // save the trackballControls target
        var target = trackballControls.target;

        // save the camera position
        var position = camera.position;
        // save the lookAt
        var lookAtVector = new THREE.Vector3();
        camera.getWorldDirection(lookAtVector);
        // set the camera, add and remove controllers
        if (config.cameraType == "perspective") {
          // set the camera
          camera = perspectiveCamera;

          // remove controls
          orthographicCameraNearController.remove();
          orthographicCameraFarController.remove();

          // add controls
          // set control FOV
          perspectiveCameraFOVController = cameraTypeOptionsFolder
            .add(config, "perspectiveCameraFOV")
            .min(45)
            .max(90)
            .step(1);
          perspectiveCameraFOVController.name("FOV");
          perspectiveCameraFOVController.onChange(function (fov) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
          });
          // set control near
          perspectiveCameraNearController = cameraTypeOptionsFolder
            .add(config, "perspectiveCameraNear")
            .min(0.01)
            .max(1)
            .step(0.01);
          perspectiveCameraNearController.name("Near");
          perspectiveCameraNearController.onChange(function (near) {
            camera.near = near;
            camera.updateProjectionMatrix();
          });
          // set control far
          perspectiveCameraFarController = cameraTypeOptionsFolder
            .add(config, "perspectiveCameraFar")
            .min(100)
            .max(10000)
            .step(100);
          perspectiveCameraFarController.name("Far");
          perspectiveCameraFarController.onChange(function (far) {
            camera.far = far;
            camera.updateProjectionMatrix();
          });
        } else if (config.cameraType == "orthographic") {
          // set the camera
          camera = orthographicCamera;

          // remove controls
          perspectiveCameraFOVController.remove();
          perspectiveCameraNearController.remove();
          perspectiveCameraFarController.remove();

          // add controls
          // set control near
          orthographicCameraNearController = cameraTypeOptionsFolder
            .add(config, "orthographicCameraNear")
            .min(-2000)
            .max(-20)
            .step(20);
          orthographicCameraNearController.name("Near");
          orthographicCameraNearController.onChange(function (near) {
            camera.near = near;
            camera.updateProjectionMatrix();
          });
          // set control far
          orthographicCameraFarController = cameraTypeOptionsFolder
            .add(config, "orthographicCameraFar")
            .min(50)
            .max(5000)
            .step(50);
          orthographicCameraFarController.name("Far");
          orthographicCameraFarController.onChange(function (far) {
            camera.far = far;
            camera.updateProjectionMatrix();
          });
        }
        // set the upwards axis
        setUpwardsAxis(config.axisUpwards);
        // set the position
        camera.position.x = position.x;
        camera.position.y = position.y;
        camera.position.z = position.z;
        // set the look at
        camera.lookAt(lookAtVector);

        // create the trackballControls
        if (config.cameraType == "perspective") {
          trackballControls = new THREE.TrackballControls(
            camera,
            renderer.domElement
          );
        } else if (config.cameraType == "orthographic") {
          trackballControls = new THREE.OrthographicTrackballControls(
            camera,
            renderer.domElement
          );
        }
        // set the target
        trackballControls.target = target;
        // set the properties
        trackballControls.rotateSpeed = config.rotateSpeed;
        trackballControls.zoomSpeed = config.zoomSpeed;
        trackballControls.panSpeed = config.panSpeed;
        trackballControls.staticMoving = config.staticMoving;
      });

      // add a perspective/orthographic camera options folder
      let cameraTypeOptionsFolder = cameraFolder.addFolder("Options");

      // set control camera's properties
      if (config.cameraType == "perspective") {
        // set control FOV
        perspectiveCameraFOVController = cameraTypeOptionsFolder
          .add(config, "perspectiveCameraFOV")
          .min(45)
          .max(90)
          .step(1);
        perspectiveCameraFOVController.name("FOV");
        perspectiveCameraFOVController.onChange(function (fov) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        });
        // set control near
        perspectiveCameraNearController = cameraTypeOptionsFolder
          .add(config, "perspectiveCameraNear")
          .min(0.01)
          .max(1)
          .step(0.01);
        perspectiveCameraNearController.name("Near");
        perspectiveCameraNearController.onChange(function (near) {
          camera.near = near;
          camera.updateProjectionMatrix();
        });
        // set control far
        perspectiveCameraFarController = cameraTypeOptionsFolder
          .add(config, "perspectiveCameraFar")
          .min(100)
          .max(10000)
          .step(100);
        perspectiveCameraFarController.name("Far");
        perspectiveCameraFarController.onChange(function (far) {
          camera.far = far;
          camera.updateProjectionMatrix();
        });
      } else if (config.cameraType == "orthographic") {
        // set control near
        orthographicCameraNearController = cameraTypeOptionsFolder
          .add(config, "orthographicCameraNear")
          .min(-2000)
          .max(-20)
          .step(20);
        orthographicCameraNearController.name("Near");
        orthographicCameraNearController.onChange(function (near) {
          camera.near = near;
          camera.updateProjectionMatrix();
        });
        // set control far
        orthographicCameraFarController = cameraTypeOptionsFolder
          .add(config, "orthographicCameraFar", 50, 5000)
          .step(50);
        orthographicCameraFarController.name("Far");
        orthographicCameraFarController.onChange(function (far) {
          camera.far = far;
          camera.updateProjectionMatrix();
        });
      }

      // add a cameraPosition folder
      let cameraPositionFolder = cameraFolder.addFolder("Position");

      // set control cameraPosition_x
      let cameraPosition_xController = cameraPositionFolder
        .add(config, "cameraPosition_x")
        .min(-100)
        .max(100)
        .step(1);
      cameraPosition_xController.name("x");
      cameraPosition_xController.onChange(function (cameraPosition_x) {
        // save the lookAt
        var lookAtVector = new THREE.Vector3();
        camera.getWorldDirection(lookAtVector);
        // set the position
        camera.position.set(
          config.cameraPosition_x,
          config.cameraPosition_y,
          config.cameraPosition_z
        );
        // set the look at
        camera.lookAt(lookAtVector);
      });

      // set control cameraPosition_y
      let cameraPosition_yController = cameraPositionFolder
        .add(config, "cameraPosition_y")
        .min(-100)
        .max(100)
        .step(1);
      cameraPosition_yController.name("y");
      cameraPosition_yController.onChange(function (cameraPosition_y) {
        // save the lookAt
        var lookAtVector = new THREE.Vector3();
        camera.getWorldDirection(lookAtVector);
        // set the position
        camera.position.set(
          config.cameraPosition_x,
          config.cameraPosition_y,
          config.cameraPosition_z
        );
        // set the look at
        camera.lookAt(lookAtVector);
      });

      // set control cameraPosition_z
      let cameraPosition_zController = cameraPositionFolder
        .add(config, "cameraPosition_z")
        .min(-100)
        .max(100)
        .step(1);
      cameraPosition_zController.name("z");
      cameraPosition_zController.onChange(function (cameraPosition_z) {
        // save the lookAt
        var lookAtVector = new THREE.Vector3();
        camera.getWorldDirection(lookAtVector);
        // set the position
        camera.position.set(
          config.cameraPosition_x,
          config.cameraPosition_y,
          config.cameraPosition_z
        );
        // set the look at
        camera.lookAt(lookAtVector);
      });

      // set control axisUpwards
      let axisUpwardsController = cameraFolder
        .add(config, "axisUpwards")
        .options(["x", "y", "z"]);
      axisUpwardsController.name("Upwards axis");
      axisUpwardsController.onChange(function (axisUpwards) {
        setUpwardsAxis(axisUpwards);
      });

      // add a Trackball controls folder
      let trackbackControlsFolder = gui.addFolder("Trackball controls");
      trackbackControlsFolder.open();

      // set control rotateSpeed
      let rotateSpeedController = trackbackControlsFolder
        .add(config, "rotateSpeed")
        .min(0.1)
        .max(10)
        .step(0.1);
      rotateSpeedController.name("Rotate speed");
      rotateSpeedController.onFinishChange(function (rotateSpeed) {
        trackballControls.rotateSpeed = rotateSpeed;
      });

      // set control zoomSpeed
      let zoomSpeedController = trackbackControlsFolder
        .add(config, "zoomSpeed")
        .min(0.12)
        .max(12)
        .step(0.12);
      zoomSpeedController.name("Zoom speed");
      zoomSpeedController.onFinishChange(function (zoomSpeed) {
        trackballControls.zoomSpeed = zoomSpeed;
      });

      // set control panSpeed
      let panSpeedController = trackbackControlsFolder
        .add(config, "panSpeed")
        .min(0.03)
        .max(3)
        .step(0.03);
      panSpeedController.name("Pan speed");
      panSpeedController.onFinishChange(function (panSpeed) {
        trackballControls.panSpeed = panSpeed;
      });

      // set control staticMoving
      let staticMovingController = trackbackControlsFolder.add(
        config,
        "staticMoving"
      );
      staticMovingController.name("Static moving");
      staticMovingController.onFinishChange(function (staticMoving) {
        trackballControls.staticMoving = staticMoving;
      });

      // add a Plane folder
      let planeFolder = gui.addFolder("Plane");
      planeFolder.open();

      // set control planeSize
      let planeSizeController = planeFolder
        .add(config, "planeSize")
        .min(1)
        .max(100)
        .step(1);
      planeSizeController.name("Size");
      planeSizeController.onChange(function () {
        // remove the plane
        scene.remove(plane);
        // create and add the ground plane to the scene
        plane = new THREE.Object3D();
        // create the grid
        var grid = new THREE.GridHelper(
          config.planeSize,
          (2 * config.planeSize) / config.planeDivisions
        );
        // set the colors
        grid.setColors(
          new THREE.Color(config.planeColorCenterLine),
          new THREE.Color(config.planeColorGrid)
        );
        // set the rotation
        grid.rotation.x = 0.5 * Math.PI;
        // add the grid to the plane
        plane.add(grid);
        // add the rectangle to the plane
        plane.add(
          new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
              2 * config.planeSize,
              2 * config.planeSize
            ),
            new THREE.MeshBasicMaterial({
              color: config.planeColor,
              transparent: config.planeTransparent,
              opacity: config.planeOpacity,
              side: THREE.DoubleSide,
            })
          )
        );
        // set the orientation
        switch (config.axisUpwards) {
          case "x":
            plane.rotation.y = 0.5 * Math.PI;
            break;
          case "y":
            plane.rotation.x = 0.5 * Math.PI;
            break;
          case "z":
            break;
        }
        // add the plane to the scene
        scene.add(plane);
      });

      // set control planeDivisions
      let planeDivisions = planeFolder
        .add(config, "planeDivisions")
        .min(0)
        .max(100)
        .step(5);
      planeDivisions.name("Divisions");
      planeDivisions.onChange(function () {
        // remove the plane
        scene.remove(plane);
        // create and add the ground plane to the scene
        plane = new THREE.Object3D();
        // create the grid
        var grid = new THREE.GridHelper(
          config.planeSize,
          (2 * config.planeSize) / config.planeDivisions
        );
        // set the colors
        grid.setColors(
          new THREE.Color(config.planeColorCenterLine),
          new THREE.Color(config.planeColorGrid)
        );
        // set the rotation
        grid.rotation.x = 0.5 * Math.PI;
        // add the grid to the plane
        plane.add(grid);
        // add the rectangle to the plane
        plane.add(
          new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
              2 * config.planeSize,
              2 * config.planeSize
            ),
            new THREE.MeshBasicMaterial({
              color: config.planeColor,
              transparent: config.planeTransparent,
              opacity: config.planeOpacity,
              side: THREE.DoubleSide,
            })
          )
        );
        // set the orientation
        switch (config.axisUpwards) {
          case "x":
            plane.rotation.y = 0.5 * Math.PI;
            break;
          case "y":
            plane.rotation.x = 0.5 * Math.PI;
            break;
          case "z":
            break;
        }
        // add the plane to the scene
        scene.add(plane);
      });

      // add a Color folder
      let planeColorsFolder = planeFolder.addFolder("Colors");

      // set control planeColor
      let planeColorController = planeColorsFolder.addColor(
        config,
        "planeColor"
      );
      planeColorController.name("Plane");
      planeColorController.onChange(function () {
        // remove the plane
        scene.remove(plane);
        // create and add the ground plane to the scene
        plane = new THREE.Object3D();
        // create the grid
        var grid = new THREE.GridHelper(
          config.planeSize,
          (2 * config.planeSize) / config.planeDivisions
        );
        // set the colors
        grid.setColors(
          new THREE.Color(config.planeColorCenterLine),
          new THREE.Color(config.planeColorGrid)
        );
        // set the rotation
        grid.rotation.x = 0.5 * Math.PI;
        // add the grid to the plane
        plane.add(grid);
        // add the rectangle to the plane
        plane.add(
          new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
              2 * config.planeSize,
              2 * config.planeSize
            ),
            new THREE.MeshBasicMaterial({
              color: config.planeColor,
              transparent: config.planeTransparent,
              opacity: config.planeOpacity,
              side: THREE.DoubleSide,
            })
          )
        );
        // set the orientation
        switch (config.axisUpwards) {
          case "x":
            plane.rotation.y = 0.5 * Math.PI;
            break;
          case "y":
            plane.rotation.x = 0.5 * Math.PI;
            break;
          case "z":
            break;
        }
        // add the plane to the scene
        scene.add(plane);
      });

      // set control planeColorCenterLine
      let planeColorCenterLineController = planeColorsFolder.addColor(
        config,
        "planeColorCenterLine"
      );
      planeColorCenterLineController.name("Center line");
      planeColorCenterLineController.onChange(function () {
        // remove the plane
        scene.remove(plane);
        // create and add the ground plane to the scene
        plane = new THREE.Object3D();
        // create the grid
        var grid = new THREE.GridHelper(
          config.planeSize,
          (2 * config.planeSize) / config.planeDivisions
        );
        // set the colors
        grid.setColors(
          new THREE.Color(config.planeColorCenterLine),
          new THREE.Color(config.planeColorGrid)
        );
        // set the rotation
        grid.rotation.x = 0.5 * Math.PI;
        // add the grid to the plane
        plane.add(grid);
        // add the rectangle to the plane
        plane.add(
          new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
              2 * config.planeSize,
              2 * config.planeSize
            ),
            new THREE.MeshBasicMaterial({
              color: config.planeColor,
              transparent: config.planeTransparent,
              opacity: config.planeOpacity,
              side: THREE.DoubleSide,
            })
          )
        );
        // set the orientation
        switch (config.axisUpwards) {
          case "x":
            plane.rotation.y = 0.5 * Math.PI;
            break;
          case "y":
            plane.rotation.x = 0.5 * Math.PI;
            break;
          case "z":
            break;
        }
        // add the plane to the scene
        scene.add(plane);
      });

      // set control planeColorGrid
      let planeColorGridController = planeColorsFolder.addColor(
        config,
        "planeColorGrid"
      );
      planeColorGridController.name("Grid");
      planeColorGridController.onChange(function () {
        // remove the plane
        scene.remove(plane);
        // create and add the ground plane to the scene
        plane = new THREE.Object3D();
        // create the grid
        var grid = new THREE.GridHelper(
          config.planeSize,
          (2 * config.planeSize) / config.planeDivisions
        );
        // set the colors
        grid.setColors(
          new THREE.Color(config.planeColorCenterLine),
          new THREE.Color(config.planeColorGrid)
        );
        // set the rotation
        grid.rotation.x = 0.5 * Math.PI;
        // add the grid to the plane
        plane.add(grid);
        // add the rectangle to the plane
        plane.add(
          new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
              2 * config.planeSize,
              2 * config.planeSize
            ),
            new THREE.MeshBasicMaterial({
              color: config.planeColor,
              transparent: config.planeTransparent,
              opacity: config.planeOpacity,
              side: THREE.DoubleSide,
            })
          )
        );
        // set the orientation
        switch (config.axisUpwards) {
          case "x":
            plane.rotation.y = 0.5 * Math.PI;
            break;
          case "y":
            plane.rotation.x = 0.5 * Math.PI;
            break;
          case "z":
            break;
        }
        // add the plane to the scene
        scene.add(plane);
      });

      // set control planeTransparent
      let planeTransparentController = planeFolder.add(
        config,
        "planeTransparent"
      );
      planeTransparentController.name("Transparent");
      planeTransparentController.onChange(function (transparent) {
        plane.children[1].material.transparent = transparent;
      });

      // set control planeOpacity
      let planeOpacityController = planeFolder
        .add(config, "planeOpacity")
        .min(0)
        .max(1)
        .step(0.01);
      planeOpacityController.name("Opacity");
      planeOpacityController.onChange(function (opacity) {
        // remove the plane
        scene.remove(plane);
        // create and add the ground plane to the scene
        plane = new THREE.Object3D();
        // create the grid
        var grid = new THREE.GridHelper(
          config.planeSize,
          (2 * config.planeSize) / config.planeDivisions
        );
        // set the colors
        grid.setColors(
          new THREE.Color(config.planeColorCenterLine),
          new THREE.Color(config.planeColorGrid)
        );
        // set the rotation
        grid.rotation.x = 0.5 * Math.PI;
        // add the grid to the plane
        plane.add(grid);
        // add the rectangle to the plane
        plane.add(
          new THREE.Mesh(
            new THREE.PlaneBufferGeometry(
              2 * config.planeSize,
              2 * config.planeSize
            ),
            new THREE.MeshBasicMaterial({
              color: config.planeColor,
              transparent: config.planeTransparent,
              opacity: config.planeOpacity,
              side: THREE.DoubleSide,
            })
          )
        );
        // set the orientation
        switch (config.axisUpwards) {
          case "x":
            plane.rotation.y = 0.5 * Math.PI;
            break;
          case "y":
            plane.rotation.x = 0.5 * Math.PI;
            break;
          case "z":
            break;
        }
        // add the plane to the scene
        scene.add(plane);
      });

      // add a Joint folder
      let jointFolder = gui.addFolder("Joints");
      jointFolder.open();

      // set control joint size
      let jointSizeController = jointFolder
        .add(config, "jointSize")
        .min(0.01)
        .max(1)
        .step(0.01);
      jointSizeController.name("Size");
      jointSizeController.onChange(function (jointSize) {
        var joint;

        for (var i = 0; i < joints.children.length; i++) {
          joint = joints.children[i];

          joint.scale.x = jointSize;
          joint.scale.y = jointSize;
          joint.scale.z = jointSize;
        }
      });

      let jointColorController = jointFolder.addColor(config, "jointColor");
      jointColorController.name("Color");
      jointColorController.onChange(function (color) {
        jointMaterial.color = new THREE.Color(color);
      });

      // add a Frame folder
      let frameFolder = gui.addFolder("Frames");
      frameFolder.open();

      // set the control frame size
      let frameSizeController = frameFolder
        .add(config, "frameSize")
        .min(0.01)
        .max(1)
        .step(0.01);
      frameSizeController.name("Size");
      frameSizeController.onChange(function (frameSize) {
        var frame;

        for (var i = 0; i < frames.children.length; i++) {
          frame = frames.children[i];

          frame.scale.x = frameSize;
          frame.scale.z = frameSize;
        }
      });

      let frameColorController = frameFolder.addColor(config, "frameColor");
      frameColorController.name("Color");
      frameColorController.onChange(function (color) {
        frameMaterial.color = new THREE.Color(color);
      });
    })
    .then(function() {
      // manyJoints(10, 20);
      // manyFrames(10, 10);

      render();
    })
    .catch(function (error) {
      console.log("Error occurred in sequence:", error);
    })

  // // casting
  // var projector = new THREE.Projector();

  // document.addEventListener('mousedown', onDocumentMouseDown, false);
  // document.addEventListener('mousemove', onDocumentMouseMove, false);

  // // // setupKeyLogger();
  // // setupKeyControls();
}

// function onDocumentMouseDown(event) {
//     var vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
//     vector = vector.unproject(camera);

//     var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());

//     var intersects = raycaster.intersectObjects([joint]);

//     if (intersects.length > 0) {
//         console.log(intersects[0]);

//         intersects[0].object.material.transparent = !intersects[0].object.material.transparent;
//         intersects[0].object.material.opacity = 0.1;
//     }
// }

// function onDocumentMouseMove(event) {
// var vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
// var vector = vector.unproject(camera);

// var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
// var intersects = raycaster.intersectObjects([joint]);

// if (intersects.length > 0) {
//     var points = [];
//     points.push(new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z));
//     points.push(intersects[0].point);

//     var mat = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.6});
//     var tubeGeometry = new THREE.TubeGeometry(new THREE.SplineCurve3(points), 60, 0.001);

//     tube = new THREE.Mesh(tubeGeometry, mat);
//     scene.add(tube);
// }
// }

// function getCSSValuePrefix() {
//     var rtrnVal = '';
//     var prefixes = ['-o-', '-ms-', '-moz-', '-webkit-'];

//     var dom = document.createElement('div');

//     for (var i = 0; i < prefixes.length; i++) {
//         dom.style.background = prefixes[i] + 'linear-gradient(#000000, #ffffff)';

//         if (dom.style.background) {
//             rtrnVal = prefixes[i];
//         }
//     }

//     dom = null;

//     delete dom;

//     return rtrnVal;
// }

window.onload = init;

export function setUpwardsAxis( axis ) {
  // set the upwards axis
  
  var promise = new Promise( (resolve, reject) => {
    if (axis =='x' || axis == 'y' || axis == 'z' ) {
      switch(axis) {
        case 'x':
          camera.up.set(1, 0, 0);
          plane.rotation.x = 0;
          plane.rotation.y = 0.5 * Math.PI;
          break;
        case 'y':
          camera.up.set(0, 1, 0);
          plane.rotation.y = 0;
          plane.rotation.x = 0.5 * Math.PI;
          break;
        case 'z':
          camera.up.set(0, 0, 1);
          plane.rotation.x = 0;
          plane.rotation.y = 0;
          break;        
      }
      resolve();
    } else {
      reject(new Error("'" + axis + "' axis does not exist"));
    }
  })

  return promise;
}

export function loadModel(filename) {
  // load a model

  var promise = loadJSON(filename)
    .then(function (json) {
      // remove joints
      for (let name of joints_name ) {
        removeJoint(name);
      }
      
      // add joints
      for (var key in json.joints) {
        addJoint(
          key,
          json.joints[key].x,
          json.joints[key].y,
          json.joints[key].z
        );
      }

      // remove frames
      while (!(frames.children.length === 0)) {
        frames.remove(frames.children[0]);
      }
      
      // add frames
      for (var key in json.frames) {
        addFrame(key, json.frames[key].j, json.frames[key].k);
      }

      return;
    })
    .catch(function (e) {
      throw e;
    })

  return promise;
}

function manyJoints(radius, quantite) {
  for (var i = 0; i < quantite; i++) {
     addJoint(
      Math.random(),
      radius * (Math.random() - 1 / 2),
      radius * (Math.random() - 1 / 2),
      radius * (Math.random() - 1 / 2)
    );
  }
}

function manyFrames(radius, quantite) {
  for (var i = 0; i < quantite; i++) {
    addFrame(
      Math.random(),
      joints.children[Math.floor(Math.random() * joints.children.length)].name,
      joints.children[Math.floor(Math.random() * joints.children.length)].name
    );
  }
}

function addFrame(name, j, k) {
  for (var i = 0; i < frames.children.length; i++) {
    if (name === frames.children[i].name) {
      return;
    }
  }

  var j = joints.getObjectByName(j);
  var k = joints.getObjectByName(k);

  if (j && k) {
    var vector = new THREE.Vector3(
      k.position.x - j.position.x,
      k.position.y - j.position.y,
      k.position.z - j.position.z
    );

    var axis = new THREE.Vector3(0, 1, 0);

    var frame = createFrame(config.frameSize, vector.length());
    frame.name = name;
    frame.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
    frame.position.copy(vector.clone().multiplyScalar(0.5));
    frame.position.x += j.position.x;
    frame.position.y += j.position.y;
    frame.position.z += j.position.z;

    frames.add(frame);
  }
}

export function addJoint(name, x, y, z) {
  // add a joint

  var promise = new Promise( (resolve, reject) => {
    // check if joint's name or joint's coordinate already exits

    // only strings acceptec as name
    name = name.toString();

    if ( joints_name.has(name) || joints_coordiante.some(xyz => coordinatesEqual(xyz, [x, y, z]))) {
      if ( joints_name.has(name) ) {
        reject(new Error("joint's name '" + name + "' already exist" ));
      } else {
        reject(new Error("joint's coordinate [" + x + ", " + y + ", " + z + "] already exist" ));
      }
    } else {
      // create the joint
      var joint = createJoint(config.jointSize);

      // set the joint
      joint.name = name;
      joint.position.x = x;
      joint.position.y = y;
      joint.position.z = z;
    
      // save it
      joints.add(joint);

      // track joint's name
      joints_name.add(name);

      // track joint's coordinate
      joints_coordiante.push([x, y, z]);

      resolve();
    }
  })

  return promise;
}

export function removeJoint(name) {
  // remove a joint

  var promise = new Promise( (resolve, reject) => {
    if ( joints_name.has(name) ) {
      // remove joint of the scene
      let joint = joints.getObjectByName(name);
      joints.remove(joint);

      // remove joint's name
      joints_name.delete(name);

      resolve();
    } else {
      reject(new Error("joint " + name + " does not exist"))
    }
    
    return promise;
  })
}

function createFrame(size, length) {
  var geometry = new THREE.CylinderGeometry(1, 1, length);

  var mesh = new THREE.Mesh(geometry, frameMaterial);
  mesh.scale.x = size;
  mesh.scale.z = size;

  return mesh;
}

function createJoint(size) {
  // create a joint
  var geometry = new THREE.SphereGeometry(1, 32, 32);

  var mesh = new THREE.Mesh(geometry, jointMaterial);
  mesh.scale.x = size;
  mesh.scale.y = size;
  mesh.scale.z = size;

  return mesh;
}

function coordinatesEqual(a, b) {
  // check if coordinate a is equal to coordinate b

  for ( var i = 0; i < a.length; ++i ) {
    if ( a[i] !== b[i] ) return false;
  }

  return true;
}

function render() {
  // update the camera
  var delta = clock.getDelta();
  trackballControls.update(delta);

  // update the statistics
    stats.update();

  // update the scene
  renderer.render(scene, camera);

  // call the render function
  requestAnimationFrame(render);
}

function initStats() {
  var stats = new Stats();

  document.getElementById("Stats-output").appendChild(stats.domElement);

  return stats;
}

function loadJSON(json) {
  var promise = fetch(json + "?nocache=" + new Date().getTime())
    .then(function (response) {
      if ( response.status == 404 ) {
        throw new Error("404 File Not Found")
      }
      
      return response;
    })
    .then(function (response) {
      return response.json();
    })
    .catch(function (e) {
      throw e;
    })

  return promise;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onResize, false);