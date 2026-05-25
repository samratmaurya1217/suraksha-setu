import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CloudRain, 
  Wind, 
  Waves, 
  Zap, 
  TrendingUp, 
  Calendar,
  MapPin,
  Loader2,
  Brain,
  BarChart3
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import api from '@/utils/api';
import { useLocation } from '@/contexts/LocationContext';

const DisasterPrediction = () => {
  const { location } = useLocation();
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (location) {
      fetchPredictions();
    }
  }, [location]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/ai/disaster-predictions', {
        params: {
          latitude: location?.latitude,
          longitude: location?.longitude,
        }
      });
      
      setPredictions(response.data.predictions);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisasterIcon = (type) => {
    const icons = {
      cyclone: Wind,
      flood: Waves,
      earthquake: Zap,
      rainfall: CloudRain,
      heatwave: TrendingUp,
    };
    return icons[type?.toLowerCase()] || AlertTriangle;
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 70) return 'text-red-600 bg-red-100 border-red-300';
    if (probability >= 40) return 'text-orange-600 bg-orange-100 border-orange-300';
    return 'text-yellow-600 bg-yellow-100 border-yellow-300';
  };

  const getProbabilityBarColor = (probability) => {
    if (probability >= 70) return 'bg-red-500';
    if (probability >= 40) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" />
            AI Disaster Prediction
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Machine learning-powered forecasts based on weather patterns and historical data
          </p>
        </div>
        <Button
          onClick={fetchPredictions}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              Refresh Predictions
            </>
          )}
        </Button>
      </div>

      {/* Location Info */}
      {location && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-foreground">{location.name || 'Unknown Location'}</p>
              <p className="text-xs text-muted-foreground">
                {location.latitude?.toFixed(4)}, {location.longitude?.toFixed(4)}
              </p>
            </div>
            {lastUpdated && (
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-xs font-medium text-foreground">{lastUpdated}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Predictions Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : predictions && predictions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {predictions.map((prediction, idx) => {
            const Icon = getDisasterIcon(prediction.disaster_type);
            const probabilityColor = getProbabilityColor(prediction.probability);
            const barColor = getProbabilityBarColor(prediction.probability);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground capitalize">
                          {prediction.disaster_type}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {prediction.timeframe || 'Next 7 days'}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${probabilityColor} border-2`}>
                      {prediction.probability}%
                    </Badge>
                  </div>

                  {/* Probability Bar */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Probability</span>
                      <span className="font-semibold text-foreground">
                        {prediction.probability}% Chance
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prediction.probability}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={`h-full ${barColor} rounded-full`}
                      />
                    </div>
                  </div>

                  {/* Confidence Score */}
                  {prediction.confidence && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          AI Confidence
                        </span>
                        <span className="font-semibold text-foreground">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Analysis */}
                  {prediction.analysis && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">Analysis</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {prediction.analysis}
                      </p>
                    </div>
                  )}

                  {/* Contributing Factors */}
                  {prediction.factors && prediction.factors.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Contributing Factors
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {prediction.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {prediction.recommendations && prediction.recommendations.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Recommended Actions
                      </h4>
                      <ul className="space-y-1">
                        {prediction.recommendations.map((rec, i) => (
                          <li
                            key={i}
                            className="text-xs text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Predictions Available
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click "Refresh Predictions" to analyze current weather patterns and generate
            AI-powered disaster forecasts for your location.
          </p>
          <Button onClick={fetchPredictions} className="mt-4">
            Generate Predictions
          </Button>
        </Card>
      )}

      {/* Info Section */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          How AI Prediction Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CloudRain className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Weather Analysis</p>
              <p className="text-xs">Real-time atmospheric data and patterns</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Historical Data</p>
              <p className="text-xs">Past disaster patterns and trends</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">ML Algorithms</p>
              <p className="text-xs">GPT-4 powered predictive modeling</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DisasterPrediction;
