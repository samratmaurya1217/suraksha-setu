import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, X, MapPin, Loader2, RotateCw, Check, Info
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const CameraCapture = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [metadataOption, setMetadataOption] = useState('overlay'); // 'overlay' or 'stored'
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
      getLocation();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isOpen, facingMode]);

  // Get GPS location
  const getLocation = async () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      setIsLoadingLocation(false);
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };
      
      setLocation(locationData);
      
      // Reverse geocoding
      await reverseGeocode(locationData.latitude, locationData.longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation({
        latitude: null,
        longitude: null,
        accuracy: null,
        error: error.message
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Reverse geocoding using OpenStreetMap Nominatim (free, no API key needed)
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Suraksha-Setu-Community-App'
          }
        }
      );
      
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        const formattedAddress = {
          street: addr.road || addr.street || '',
          area: addr.suburb || addr.neighbourhood || addr.village || '',
          city: addr.city || addr.town || addr.state_district || '',
          state: addr.state || '',
          pincode: addr.postcode || '',
          country: addr.country || 'India',
          full: data.display_name
        };
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setIsLoadingCamera(true);
    
    try {
      // Stop existing stream if any
      stopCamera();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please grant camera permission.');
    } finally {
      setIsLoadingCamera(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Flip camera (front/back)
  const flipCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // If overlay option is selected, add metadata overlay
    if (metadataOption === 'overlay' && location) {
      drawOverlay(ctx, canvas.width, canvas.height);
    }
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
      }
    }, 'image/jpeg', 0.95);
  };

  // Draw overlay on image
  const drawOverlay = (ctx, width, height) => {
    const padding = 20;
    const lineHeight = 25;
    const fontSize = 18;
    
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, height - 180, width, 180);
    
    // Text styling
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px Arial`;
    
    let y = height - 150;
    
    // Date & Time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN');
    ctx.fillText(`📅 ${dateStr} ${timeStr}`, padding, y);
    y += lineHeight;
    
    // Coordinates
    if (location.latitude && location.longitude) {
      ctx.fillText(`📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`, padding, y);
      y += lineHeight;
      
      // Accuracy
      ctx.font = `${fontSize - 2}px Arial`;
      ctx.fillText(`   Accuracy: ±${Math.round(location.accuracy)}m`, padding, y);
      y += lineHeight;
    }
    
    // Address
    if (address && address.full) {
      ctx.font = `${fontSize - 2}px Arial`;
      const maxWidth = width - (padding * 2);
      const addressText = address.full.length > 80 
        ? address.full.substring(0, 77) + '...' 
        : address.full;
      ctx.fillText(`🏠 ${addressText}`, padding, y);
    }
  };

  // Confirm and send captured image
  const confirmCapture = () => {
    if (!capturedImage || !canvasRef.current) return;
    
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File(
          [blob], 
          `camera-${Date.now()}.jpg`, 
          { type: 'image/jpeg' }
        );
        
        // Send file with metadata
        const fileData = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: capturedImage,
          geotag: location,
          address: address,
          capturedAt: new Date().toISOString(),
          metadataType: metadataOption
        };
        
        onCapture?.(fileData);
        handleClose();
      }
    }, 'image/jpeg', 0.95);
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // Close and cleanup
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera Capture
          </DialogTitle>
          <DialogDescription>
            Capture photo with GPS location data - Live stream only, no upload
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security Notice */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="py-3">
              <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Privacy & Security:</strong> Camera feed is live only. No video is stored or uploaded. 
                  GPS coordinates are captured only when you take a photo.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera View or Captured Image */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {!capturedImage ? (
              <>
                {/* Live Camera Feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {isLoadingCamera && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
                
                {/* Camera Controls Overlay */}
                {stream && !isLoadingCamera && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                    {/* Flip Camera Button */}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full w-12 h-12"
                      onClick={flipCamera}
                    >
                      <RotateCw className="w-5 h-5" />
                    </Button>
                    
                    {/* Capture Button */}
                    <Button
                      size="icon"
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-200"
                      onClick={capturePhoto}
                    >
                      <div className="w-12 h-12 border-4 border-black rounded-full" />
                    </Button>
                    
                    {/* Spacer for symmetry */}
                    <div className="w-12 h-12" />
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Captured Image Preview */}
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
                
                {/* Retake/Confirm Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-4">
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={retakePhoto}
                    className="gap-2"
                  >
                    <X className="w-5 h-5" />
                    Retake
                  </Button>
                  
                  <Button
                    size="lg"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    onClick={confirmCapture}
                  >
                    <Check className="w-5 h-5" />
                    Use Photo
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Hidden canvas for image processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Metadata Options (before capture) */}
          {!capturedImage && (
            <div className="space-y-3">
              <Label>Location Data Display</Label>
              <RadioGroup value={metadataOption} onValueChange={setMetadataOption}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="overlay" id="overlay" />
                  <Label htmlFor="overlay" className="cursor-pointer">
                    Overlay on image (visible watermark with date, GPS, address)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stored" id="stored" />
                  <Label htmlFor="stored" className="cursor-pointer">
                    Store as metadata only (hidden, attached to file)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Location Information */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-green-600" />
                <div className="flex-1 text-sm space-y-2">
                  {isLoadingLocation ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting GPS coordinates...
                    </div>
                  ) : location ? (
                    <>
                      {location.latitude && location.longitude ? (
                        <>
                          <div>
                            <strong>Coordinates:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Accuracy: ±{Math.round(location.accuracy)}m
                          </div>
                          {address && (
                            <div className="text-xs">
                              <strong>Address:</strong> {address.full}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-orange-600">
                          Location access denied or unavailable
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground">
                      No location data available
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Badge variant="outline" className="text-xs">
            🔒 Secure • Live Stream Only
          </Badge>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraCapture;
