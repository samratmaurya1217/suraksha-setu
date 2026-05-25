import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const DisasterTimeline = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const [disastersRes, alertsRes] = await Promise.all([
          axios.get(`${API_URL}/disasters?limit=3`),
          axios.get(`${API_URL}/alerts`)
        ]);

        const timelineEvents = [];
        
        // Add recent alerts
        const alertsList = alertsRes.data?.alerts || [];
        alertsList.slice(0, 2).forEach(alert => {
          const time = new Date(alert.created_at || alert.issued_at);
          timelineEvents.push({
            time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            title: alert.title || alert.type || 'Alert',
            type: alert.severity === 'critical' || alert.severity === 'red' ? 'critical' : alert.severity === 'warning' || alert.severity === 'orange' ? 'warning' : 'info',
            location: alert.location || alert.region || 'Unknown'
          });
        });
        
        // Add recent disasters
        const disastersList = disastersRes.data?.disasters || [];
        disastersList.slice(0, 2).forEach(disaster => {
          const time = new Date(disaster.date);
          timelineEvents.push({
            time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            title: disaster.title,
            type: 'warning',
            location: disaster.location
          });
        });
        
        // Add current time marker
        const now = new Date();
        timelineEvents.push({
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          title: 'Current Status',
          type: 'normal'
        });
        
        // Sort by time (most recent first)
        timelineEvents.sort((a, b) => {
          const timeA = new Date('1970/01/01 ' + a.time);
          const timeB = new Date('1970/01/01 ' + b.time);
          return timeB - timeA;
        });
        
        setEvents(timelineEvents.slice(0, 5));
      } catch (error) {
        console.error('Error fetching timeline:', error);
        setEvents([
          { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), title: 'System Active', type: 'normal' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-xl p-6 shadow-sm animate-pulse"
      >
        <div className="h-24 flex items-center justify-center text-muted-foreground">
          Loading timeline...
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-xl p-6 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        Today's Timeline
      </h3>
      
      <div className="relative">
        {/* Line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2 z-0"></div>
        
        <div className="flex justify-between relative z-10 overflow-x-auto pb-4 custom-scrollbar gap-4">
          {events.map((event, index) => (
            <div key={index} className="flex flex-col items-center min-w-[100px] text-center">
              <div className={`w-4 h-4 rounded-full border-4 border-background mb-2 ${
                event.type === 'critical' ? 'bg-destructive' :
                event.type === 'warning' ? 'bg-warning' :
                event.type === 'info' ? 'bg-blue-500' :
                'bg-muted-foreground'
              }`}></div>
              <span className="text-xs font-bold text-foreground">{event.time}</span>
              <span className="text-[10px] text-muted-foreground mt-1">{event.title}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default DisasterTimeline;
