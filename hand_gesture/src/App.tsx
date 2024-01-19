import React, { useEffect, useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { Button, Box, Grid, Paper } from '@mui/material';
import './App.css';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import * as cam from "@mediapipe/camera_utils";

interface GestureResult {
  categoryName: string;
  score: number;
  handedness: string;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}


const App: React.FC = () => {
  const [webcamEnabled, setWebcamEnabled] = useState<boolean>(false);
  const [gestureRecognizer, setGestureRecognizer] = useState<GestureRecognizer | null>(null);
  const [gestureResult, setGestureResult] = useState<GestureResult | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);



  useEffect(() => {
    const createGestureRecognizer = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      );

      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/gesture_recognizer.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
      });
      setGestureRecognizer(recognizer);
    };
    createGestureRecognizer();
  }, []);


  useEffect(() => {
    if (webcamEnabled && gestureRecognizer && webcamRef.current && webcamRef.current.video) {
      const camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx && webcamRef.current?.video) {
            canvas.width = webcamRef.current.video.videoWidth;
            canvas.height = webcamRef.current.video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          if (webcamRef.current && webcamRef.current.video) {
            const results = await gestureRecognizer.recognizeForVideo(webcamRef.current.video, Date.now());
            if (results.gestures.length > 0) {
              const gesture = results.gestures[0][0];
              const handedness = results.handedness[0][0].displayName;
              setGestureResult({
                categoryName: gesture.categoryName,
                score: gesture.score * 100,
                handedness: handedness,
              });
              //console.log(results.landmarks)
              if (results.landmarks) {
                drawLandmarks(results.landmarks);
              }
            }
          }
        },
      });
      camera.start();
    }
  }, [webcamEnabled, gestureRecognizer]);

  const drawLandmarks = (landmarksArray: Landmark[][]) => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // The actual drawing size should match the video dimensions for accurate landmark placement
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear the canvas for a new frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks
    const drawingUtils = new DrawingUtils(ctx);
    landmarksArray.forEach(landmarks => {
      drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
      drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 2 });
    });
  };

  const toggleWebcam = () => {
    setWebcamEnabled(!webcamEnabled);
    if (!gestureRecognizer) {
      console.log('Gesture Recognizer is not ready');
    }
  };

  return (
    <div>
      <Box sx={{ display: 'flex', p: 3, height: 'calc(100vh - 48px)' }}>
        <Grid alignItems='stretch' sx={{ height: '100%' }} container spacing={2}>
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {gestureResult && (
                <Box sx={{
                  display: 'flex', // Use flexbox layout
                  flexDirection: 'column', // Stack children vertically
                  alignItems: 'center', // Center align items horizontally
                  justifyContent: 'center', // Center align items vertically
                  height: '100vh', // Set the height to the full viewport height
                }}>
                  <h2>Gesture: {gestureResult.categoryName}</h2>
                  <h2>Confidence: {gestureResult.score.toFixed(2)}%</h2>
                  <h2>Handedness: {gestureResult.handedness}</h2>
                </Box>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} sx={{ height: '100%' }}>
            <Paper sx={{
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative' 
            }}>
              {!webcamEnabled && (
                <Button
                  variant='contained'
                  onClick={toggleWebcam}
                >
                  Turn On Camera
                </Button>
              )}
              {webcamEnabled && (
                <>
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'grayscale(100%)',
                      transform: 'scaleX(-1)'
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)'
                    }}
                  />
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </div>
  );
};

export default App;