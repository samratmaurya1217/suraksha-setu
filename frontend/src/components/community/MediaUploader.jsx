import React, { useState, useRef } from 'react';
import { 
  Upload, X, Image as ImageIcon, Video, Mic, FileText, 
  MapPin, Loader2, Play, Pause, Download
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MediaUploader = ({ onFilesChange, maxFiles = 5 }) => {
  const [files, setFiles] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Get geolocation
  const getGeolocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true }
      );
    });
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Process files with geotags for images/videos
    const processedFiles = await Promise.all(
      selectedFiles.map(async (file) => {
        const fileData = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview: null,
          geotag: null
        };

        // Create preview for images and videos
        if (file.type.startsWith('image/')) {
          fileData.preview = URL.createObjectURL(file);
          
          // Try to get geolocation for images
          try {
            const location = await getGeolocation();
            fileData.geotag = location;
          } catch (err) {
            console.log('Geolocation not available:', err);
          }
        } else if (file.type.startsWith('video/')) {
          fileData.preview = URL.createObjectURL(file);
          
          // Try to get geolocation for videos
          try {
            const location = await getGeolocation();
            fileData.geotag = location;
          } catch (err) {
            console.log('Geolocation not available:', err);
          }
        }

        return fileData;
      })
    );

    const updatedFiles = [...files, ...processedFiles];
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const removeFile = (id) => {
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        // Add to files
        const audioFile = {
          id: Math.random().toString(36).substr(2, 9),
          file: new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' }),
          name: `voice-${Date.now()}.wav`,
          size: audioBlob.size,
          type: 'audio/wav',
          preview: URL.createObjectURL(audioBlob),
          geotag: null
        };
        
        const updatedFiles = [...files, audioFile];
        setFiles(updatedFiles);
        onFilesChange?.(updatedFiles);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (playingAudio) {
      audioRef.current.pause();
      setPlayingAudio(false);
    } else {
      audioRef.current.play();
      setPlayingAudio(true);
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <Mic className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
          "hover:border-primary hover:bg-accent/50 cursor-pointer"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">Upload images, videos, or files</p>
        <p className="text-xs text-muted-foreground">
          Click to browse or drag and drop (Max {maxFiles} files)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          Image
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.onchange = handleFileSelect;
            input.click();
          }}
          className="gap-2"
        >
          <Video className="w-4 h-4" />
          Video
        </Button>
        <Button
          variant={recording ? "destructive" : "outline"}
          size="sm"
          onClick={recording ? stopRecording : startRecording}
          className="gap-2"
        >
          <Mic className={cn("w-4 h-4", recording && "animate-pulse")} />
          {recording ? 'Stop Recording' : 'Voice'}
        </Button>
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {files.map((file) => (
            <Card key={file.id} className="relative overflow-hidden">
              <CardContent className="p-2">
                {/* Preview */}
                <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2 relative">
                  {file.type.startsWith('image/') && (
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {file.type.startsWith('video/') && (
                    <video 
                      src={file.preview}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  {file.type.startsWith('audio/') && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleAudioPlayback}
                      >
                        {playingAudio ? 
                          <Pause className="w-8 h-8" /> : 
                          <Play className="w-8 h-8" />
                        }
                      </Button>
                      <audio 
                        ref={audioRef}
                        src={file.preview}
                        onEnded={() => setPlayingAudio(false)}
                      />
                    </div>
                  )}
                  {!file.type.startsWith('image/') && 
                   !file.type.startsWith('video/') && 
                   !file.type.startsWith('audio/') && (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                  
                  {/* Geotag indicator */}
                  {file.geotag && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-1 left-1 text-[10px] gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      GPS
                    </Badge>
                  )}

                  {/* Remove button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* File info */}
                <div className="space-y-1">
                  <p className="text-xs font-medium truncate">{file.name}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    {file.geotag && (
                      <span className="text-green-600">
                        {file.geotag.latitude.toFixed(4)}, {file.geotag.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* File count */}
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {files.length} of {maxFiles} files uploaded
        </p>
      )}
    </div>
  );
};

export default MediaUploader;
