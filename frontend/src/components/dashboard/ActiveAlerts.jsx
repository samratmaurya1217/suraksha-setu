import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const ActiveAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get(`${API_URL}/alerts`);
        const alertsArr = response.data?.alerts || response.data || [];
        const recentAlerts = alertsArr.slice(0, 5).map(alert => ({
          id: alert.id,
          type: alert.severity === 'critical' || alert.severity === 'red' ? 'critical' : alert.severity === 'warning' || alert.severity === 'orange' ? 'warning' : 'info',
          title: alert.title,
          message: alert.description,
          time: alert.created_at ? new Date(alert.created_at).toLocaleString() : '',
          location: typeof alert.location === 'string' ? alert.location : alert.location?.city || alert.location?.state || ''
        }));
        setAlerts(recentAlerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || alerts.length === 0) {
    return null;
  }
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Active Alerts
        </h3>
        <Button variant="ghost" size="sm" className="text-xs">View All</Button>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={`p-3 rounded-lg border-l-4 ${
              alert.type === 'critical' ? 'bg-destructive/10 border-destructive' :
              alert.type === 'warning' ? 'bg-warning/10 border-warning' :
              'bg-blue-500/10 border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <h4 className={`text-sm font-bold ${
                alert.type === 'critical' ? 'text-destructive' :
                alert.type === 'warning' ? 'text-warning' :
                'text-blue-500'
              }`}>
                {alert.title}
              </h4>
              <span className="text-[10px] text-muted-foreground">{alert.time}</span>
            </div>
            <p className="text-xs text-foreground mt-1">{alert.message}</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase">
              <span>📍 {alert.location}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ActiveAlerts;
