import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Shield, MapPin, AlertTriangle, CloudRain, TrendingUp, Info, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';

const SurakshaScore = ({ score: initialScore = 85 }) => {
  const { t } = useTranslation();
  const { location, alerts = [] } = useLocation();
  const [score, setScore] = useState(initialScore);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSafetyScore();
  }, [location, alerts]);

  const fetchSafetyScore = async () => {
    try {
      const response = await api.get('/api/safety-score', {
        params: {
          latitude: location?.latitude,
          longitude: location?.longitude,
        }
      });
      
      if (response.data) {
        setScore(response.data.total_score);
        setBreakdown(response.data.breakdown);
      }
    } catch (error) {
      console.error('Error fetching safety score:', error);
      // Fallback to calculated score
      calculateLocalScore();
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalScore = () => {
    // Fallback calculation if API fails
    let baseScore = 90;
    
    // Reduce score based on nearby alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'red').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning' || a.severity === 'orange').length;
    baseScore -= (criticalAlerts * 15 + warningAlerts * 5);

    // Location risk (example)
    if (location?.name?.toLowerCase().includes('coast')) {
      baseScore -= 10; // Higher risk near coast
    }

    setScore(Math.max(0, Math.min(100, baseScore)));
    
    setBreakdown({
      location_risk: Math.max(0, 100 - (criticalAlerts * 20)),
      alert_impact: Math.max(0, 100 - (criticalAlerts * 25 + warningAlerts * 10)),
      weather_risk: 85,
      disaster_proximity: Math.max(0, 100 - alerts.length * 8),
      infrastructure: 85,
    });
  };

  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  let color = '#10b981'; // Green
  let status = t('safety.excellent');
  let Icon = ShieldCheck;

  if (score < 40) {
    color = '#ef4444'; // Red
    status = t('safety.critical');
    Icon = ShieldAlert;
  } else if (score < 60) {
    color = '#f97316'; // Orange
    status = t('safety.poor');
    Icon = Shield;
  } else if (score < 80) {
    color = '#f59e0b'; // Yellow
    status = t('safety.moderate');
    Icon = Shield;
  } else if (score < 90) {
    color = '#10b981'; // Green
    status = t('safety.good');
    Icon = ShieldCheck;
  }

  const breakdownData = breakdown ? [
    { name: t('safety.locationRisk'), value: breakdown.location_risk, icon: MapPin },
    { name: t('safety.weatherRisk'), value: breakdown.weather_risk, icon: CloudRain },
    { name: t('safety.disasterProximity'), value: breakdown.disaster_proximity, icon: AlertTriangle },
    { name: t('safety.infrastructure'), value: breakdown.infrastructure, icon: TrendingUp },
  ] : [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon className="w-24 h-24" />
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {t('dashboard.safetyScore')}
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-primary flex items-center gap-1 hover:underline"
          >
            <Info className="w-4 h-4" />
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="h-48 relative" style={{ minHeight: '192px' }}>
          <ResponsiveContainer width="100%" height={192}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={180}
                endAngle={0}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                <Cell key="score" fill={color} cornerRadius={10} />
                <Cell key="remaining" fill="hsl(var(--muted))" cornerRadius={10} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
            <span className="text-4xl font-bold text-foreground">{loading ? '...' : score}</span>
            <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{status}</span>
          </div>
        </div>

        {/* Detailed Breakdown */}
        {showDetails && breakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-4 border-t border-border pt-4"
          >
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Score Breakdown
            </h4>
            
            <div className="space-y-3">
              {breakdownData.map((item, idx) => {
                const ItemIcon = item.icon;
                const itemColor = item.value >= 80 ? '#10b981' : item.value >= 60 ? '#f59e0b' : '#ef4444';
                
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <ItemIcon className="w-4 h-4" />
                        {item.name}
                      </span>
                      <span className="font-semibold" style={{ color: itemColor }}>
                        {item.value}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: itemColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h5 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Recommendations
              </h5>
              <ul className="text-xs text-muted-foreground space-y-1">
                {breakdown.infrastructure < 80 && (
                  <li>• Review your emergency kit and family safety plan</li>
                )}
                {breakdown.disaster_proximity < 70 && (
                  <li>• Active alerts nearby - stay updated</li>
                )}
                {breakdown.weather_risk < 70 && (
                  <li>• Weather conditions unfavorable - limit outdoor activities</li>
                )}
                {breakdown.location_risk < 80 && (
                  <li>• High-risk location detected - stay alert and prepared</li>
                )}
                {score >= 80 && (
                  <li>✓ You're well-prepared - keep monitoring alerts</li>
                )}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active Alerts</span>
            <span className={`font-medium ${alerts.length > 0 ? 'text-orange-500' : 'text-green-500'}`}>
              {alerts.length} nearby
            </span>
          </div>
          {location && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium text-foreground truncate max-w-[150px]">
                {location.name || 'Unknown'}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SurakshaScore;
