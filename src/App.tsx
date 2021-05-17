import React, { useState, useRef, useLayoutEffect } from 'react';
import { Engine, Scene, SceneEventArgs } from 'react-babylonjs';
import { Vector3, Scene as BabylonScene, WebXRHitTest, IWebXRHitResult, WebXRBackgroundRemover, WebXRAnchorSystem } from '@babylonjs/core';
import { Button } from '@material-ui/core';
import Switch from '@material-ui/core/Switch';
import { makeStyles } from '@material-ui/core/styles';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import './App.css';
import { Nullable } from '@babylonjs/core/types';
import { WebXRFeatureName } from '@babylonjs/core/XR/webXRFeaturesManager';
import { WebXRState } from '@babylonjs/core/XR/webXRTypes';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));

function App() {
  const [checkState, setCheckState] = useState(false);
  const [scene, setScene] = useState<Nullable<BabylonScene>>(null);
  const xrInitialized = useRef(false);
  const toggleState = () => {
    setCheckState((checkState) => !checkState);
  }

  const domOverlayRef = useRef(null);
  const placeButtonRef = useRef<HTMLButtonElement>(null);
  const switchColorRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    console.log('scene:', scene);
    console.log('domOverlay:', domOverlayRef.current);
    if (xrInitialized.current === false && scene !== null && domOverlayRef.current !== null) {
      xrInitialized.current = true;
      // IIFE FTW
      (async () => {
        console.log('creating default experience');
        const xr = await scene!.createDefaultXRExperienceAsync({
          uiOptions: {
            sessionMode: 'immersive-ar'
          },
          // optionalFeatures: true,
        });

        // ground
        var ground = MeshBuilder.CreateGround("ground", {width:10, height:10}, scene);
        ground.isVisible = false;

        // model
        var model = MeshBuilder.CreateBox("box", {width: 0.2, height: 0.2, depth: 0.2}, scene);
        model.rotationQuaternion = new Quaternion();
        model.position.y += 0.1;

        //marker
        const marker = MeshBuilder.CreateTorus('marker', { diameter: 0.15, thickness: 0.05 });
        marker.isVisible = false;
        marker.rotationQuaternion = new Quaternion();

        // materials
        var colorIdx = 0;
        var material1 = new StandardMaterial('mat1', scene);
        material1.emissiveColor = Color3.Red();
        material1.specularColor = Color3.Black();

        var material2 = new StandardMaterial('mat2', scene);
        material2.emissiveColor = Color3.Green();
        material2.specularColor = Color3.Black();

        model.material = material1;

        const featureName = (WebXRFeatureName as any).DOM_OVERLAY
        console.log('xr started:', featureName, xr);
        const fm = xr.baseExperience.featuresManager;

        const sceneMeshes = [model];

        // hit test
        let hitTest: IWebXRHitResult | null = null;
        const xrTest = fm.enableFeature(WebXRHitTest, "latest") as WebXRHitTest;
        placeButtonRef.current!.onclick = function() {
          if (hitTest && xr.baseExperience.state === WebXRState.IN_XR) {
              model.isVisible = true;
              let clonedMesh = model.clone('clone');
              sceneMeshes.push(clonedMesh);
              model.isVisible = false;
              hitTest.transformationMatrix.decompose(clonedMesh.scaling, clonedMesh.rotationQuaternion!, clonedMesh.position);
          }
        }

        switchColorRef.current!.onclick = function() {
          colorIdx++;
          let nextMaterial = (colorIdx % 2 === 0)
              ? material1
              : material2;
          for(const sceneMesh of sceneMeshes) {
              sceneMesh.material = nextMaterial;
          }
        }

        xrTest.onHitTestResultObservable.add((results) => {
          if (results.length) {
              hitTest = results[0];
              model.isVisible = false;
              marker.isVisible = true;
              hitTest.transformationMatrix.decompose(model.scaling, model.rotationQuaternion!, model.position);
              hitTest.transformationMatrix.decompose(marker.scaling, marker.rotationQuaternion!, marker.position);
          } else {
              hitTest = null;
              model.isVisible = false;
              marker.isVisible = false;
          }
        });

        const anchors = fm.enableFeature(WebXRAnchorSystem, 'latest');
        const xrBackgroundRemover = fm.enableFeature(WebXRBackgroundRemover.Name);

        const domOverlayFeature = fm.enableFeature(featureName, 1, {
          element: domOverlayRef.current
        });
      })();
    }
  }, [scene, domOverlayRef]);

  const onSceneMount = (args: SceneEventArgs) => {
    setScene(args.scene)
  }

  const classes = useStyles();

  return (
    <div className="App">
      <div ref={domOverlayRef} className="dom-overlay-container">
        <p>
          dom-overlay XR (part of "immersive-ar" experience)
        </p>
        <div className={classes.root}>
          <Button ref={placeButtonRef} variant="contained" color="primary">Place Model</Button>
          <FormControlLabel
            control={<Switch ref={switchColorRef} checked={checkState} onChange={toggleState} name="checkedA" />}
            label={`color ${checkState ? 'red' : 'green'}`}
          />
        </div>
      </div>
      <Engine antialias adaptToDeviceRatio canvasId='babylon-canvas'>
        <Scene onSceneMount={onSceneMount}>
          <freeCamera name='camera1' position={new Vector3(0, 5, -10)} setTarget={[Vector3.Zero()]} />
          <hemisphericLight name='light1' intensity={0.7} direction={Vector3.Up()} />
          <box name='box1' size={2} />
        </Scene>
      </Engine>
    </div>
  );
}

export default App;
