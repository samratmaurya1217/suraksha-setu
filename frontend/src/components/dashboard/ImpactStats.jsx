import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Home, Zap, Activity } from 'lucide-react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const StatCard = ({ icon: Icon, label, value, subtext, color, loading }) => (
  <div className={`bg-card border border-border rounded-xl p-4 flex items-center gap-4 ${loading ? 'animate-pulse' : ''}`}>
    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <h4 className="text-2xl font-bold text-foreground">{value}</h4>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  </div>
);

const ImpactStats = () => {
  const [stats, setStats] = useState({
    affectedPeople: 0,
    sheltersActive: 0,
    disasters: 0,
    alerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [disastersRes, alertsRes, sheltersRes] = await Promise.all([
          axios.get(`${API_URL}/disasters?limit=100`),
          axios.get(`${API_URL}/alerts`),
          axios.get(`${API_URL}/evacuation-centers`)
        ]);

        const disasters = disastersRes.data?.disasters || disastersRes.data || [];
        const alerts = alertsRes.data?.alerts || alertsRes.data || [];
        const shelters = Array.isArray(sheltersRes.data) ? sheltersRes.data : sheltersRes.data?.centers || [];

        // Calculate affected people from recent disasters
        const recentDisasters = disasters.filter(d => {
          const disasterDate = new Date(d.date);
          const daysSince = (Date.now() - disasterDate) / (1000 * 60 * 60 * 24);
          return daysSince <= 30; // Last 30 days
        });
        const affectedPeople = recentDisasters.reduce((sum, d) => sum + (d.affected_population || 0), 0);

        // Count active shelters
        const activeShelters = shelters.filter(s => s.status === 'active').length;

        // Count active alerts
        const activeAlerts = alerts.length;

        setStats({
          affectedPeople,
          sheltersActive: activeShelters,
          disasters: recentDisasters.length,
          alerts: activeAlerts
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <StatCard 
        icon={Users} 
        label="Affected People" 
        value={stats.affectedPeople.toLocaleString()} 
        subtext="Last 30 days"
        color="bg-orange-500"
        loading={loading}
      />
      <StatCard 
        icon={Home} 
        label="Shelters Active" 
        value={stats.sheltersActive.toString()} 
        subtext="Available now"
        color="bg-green-500"
        loading={loading}
      />
      <StatCard 
        icon={Zap} 
        label="Recent Disasters" 
        value={stats.disasters.toString()} 
        subtext="Last 30 days"
        color="bg-yellow-500"
        loading={loading}
      />
      <StatCard 
        icon={Activity} 
        label="Active Alerts" 
        value={stats.alerts.toString()} 
        subtext="Current warnings"
        color="bg-red-500"
        loading={loading}
      />
    </motion.div>
  );
};

export default ImpactStats;
