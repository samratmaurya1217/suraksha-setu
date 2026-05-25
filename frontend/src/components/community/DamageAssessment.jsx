import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, X, Loader2, AlertTriangle, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

const DamageAssessment = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const { toast } = useToast();

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAssessment(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await api.post('/api/ai/damage-assessment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAssessment(response.data);
      
      toast({
        title: 'Analysis Complete',
        description: 'AI has successfully assessed the damage',
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: 'Analysis Failed',
        description: error.response?.data?.detail || 'Failed to analyze image',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setAssessment(null);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      minor: 'text-blue-600 bg-blue-100 border-blue-300',
      moderate: 'text-yellow-600 bg-yellow-100 border-yellow-300',
      severe: 'text-orange-600 bg-orange-100 border-orange-300',
      critical: 'text-red-600 bg-red-100 border-red-300',
    };
    return colors[severity?.toLowerCase()] || colors.moderate;
  };

  const getSeverityIcon = (severity) => {
    if (severity?.toLowerCase() === 'minor') return <CheckCircle className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Damage Assessment</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload disaster images for AI-powered damage analysis
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {!previewUrl ? (
        <Card className="p-8">
          <label 
            htmlFor="image-upload" 
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload Disaster Image
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Select an image of building damage, flooding, fire damage, or other disaster impacts.
              Our AI will analyze the severity and provide detailed insights.
            </p>
            <Button variant="outline" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Choose Image
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: JPG, PNG, WEBP (max 10MB)
            </p>
          </label>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative">
              <img
                src={previewUrl}
                alt="Selected"
                className="w-full h-96 object-contain rounded-lg bg-muted"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Actions */}
            {!assessment && (
              <div className="flex justify-center">
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="gap-2 px-8"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      Analyze Damage
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Assessment Results */}
            <AnimatePresence>
              {assessment && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 border-t border-border pt-4"
                >
                  {/* Severity Badge */}
                  <div className="flex items-center justify-center gap-3">
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold ${getSeverityColor(
                        assessment.severity
                      )}`}
                    >
                      {getSeverityIcon(assessment.severity)}
                      <span className="text-lg uppercase">
                        {assessment.severity} Damage
                      </span>
                    </div>
                    {assessment.confidence && (
                      <Badge variant="outline" className="text-sm">
                        {Math.round(assessment.confidence * 100)}% Confidence
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {assessment.description && (
                    <Card className="p-4 bg-muted/50">
                      <h4 className="font-semibold text-foreground mb-2">
                        Assessment Details
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {assessment.description}
                      </p>
                    </Card>
                  )}

                  {/* Damage Type */}
                  {assessment.damage_type && (
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">Damage Type</p>
                        <p className="font-semibold text-foreground">
                          {assessment.damage_type}
                        </p>
                      </Card>
                      {assessment.estimated_cost && (
                        <Card className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">
                            Estimated Cost
                          </p>
                          <p className="font-semibold text-foreground">
                            {assessment.estimated_cost}
                          </p>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {assessment.recommendations && assessment.recommendations.length > 0 && (
                    <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-blue-600" />
                        Recommended Actions
                      </h4>
                      <ul className="space-y-2">
                        {assessment.recommendations.map((rec, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={clearImage}
                    >
                      Analyze Another Image
                    </Button>
                    <Button className="flex-1">
                      Create Community Report
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">AI Powered</h4>
              <p className="text-xs text-muted-foreground">
                GPT-4 Vision analysis
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Instant Results</h4>
              <p className="text-xs text-muted-foreground">
                Analysis in seconds
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Detailed Reports</h4>
              <p className="text-xs text-muted-foreground">
                Severity & recommendations
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DamageAssessment;
