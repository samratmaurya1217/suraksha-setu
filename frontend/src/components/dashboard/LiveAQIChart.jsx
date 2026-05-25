import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const LiveAQIChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState('stable');

  useEffect(() => {
    const fetchAQIData = async () => {
      try {
        // Get current location AQI
        const weatherRes = await axios.get(`${API_URL}/weather/auto-detect`);
        const { lat, lon } = weatherRes.data.location;
        
        // Fetch 7-day history
        const historyRes = await axios.get(`${API_URL}/aqi/history?lat=${lat}&lon=${lon}&days=7`);
        
        if (historyRes.data.history) {
          const chartData = historyRes.data.history.map(item => ({
            date: new Date(item.timestamp || item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            aqi: item.aqi,
            pm25: item.pm25,
            category: item.aqi_label
          }));
          
          setData(chartData);
          
          // Calculate trend
          if (chartData.length >= 2) {
            const recent = chartData[chartData.length - 1].aqi;
            const previous = chartData[chartData.length - 2].aqi;
            if (recent > previous + 10) setTrend('up');
            else if (recent < previous - 10) setTrend('down');
            else setTrend('stable');
          }
        }
      } catch (error) {
        console.error('Error fetching AQI chart data:', error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAQIData();
    const interval = setInterval(fetchAQIData, 600000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading || data.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground">{payload[0].payload.date}</p>
          <p className="text-sm text-foreground">AQI: <span className="font-bold">{payload[0].value}</span></p>
          {payload[0].payload.pm25 && (
            <p className="text-xs text-muted-foreground">PM2.5: {payload[0].payload.pm25} µg/m³</p>
          )}
          {payload[0].payload.category && (
            <p className="text-xs font-medium" style={{ color: payload[0].color }}>{payload[0].payload.category}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-6 bg-card border border-border rounded-xl p-6 shadow-sm"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">7-Day AQI Trend</h3>
        </div>
        <div className="flex items-center gap-2">
          {trend === 'up' && (
            <>
              <TrendingUp className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">Increasing</span>
            </>
          )}
          {trend === 'down' && (
            <>
              <TrendingDown className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">Improving</span>
            </>
          )}
          {trend === 'stable' && (
            <span className="text-sm font-medium text-muted-foreground">Stable</span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="aqi" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            fill="url(#aqiGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Current</p>
          <p className="text-lg font-bold text-foreground">{data[data.length - 1]?.aqi || '-'}</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-lg font-bold text-foreground">
            {data.length > 0 ? Math.round(data.reduce((sum, item) => sum + item.aqi, 0) / data.length) : '-'}
          </p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground">Peak</p>
          <p className="text-lg font-bold text-foreground">
            {data.length > 0 ? Math.max(...data.map(item => item.aqi)) : '-'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveAQIChart;
