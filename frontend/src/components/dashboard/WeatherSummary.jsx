import React, { useState, useEffect } from 'react';
import { CloudRain, Wind, Droplets, Sun, Thermometer, Cloud, CloudDrizzle } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000') + '/api';

const WeatherSummary = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await axios.get(`${API_URL}/weather/auto-detect`);
        setWeatherData(response.data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading || !weatherData) {
    return null;
  }

  const { current, location } = weatherData;
  const getWeatherIcon = (condition) => {
    if (condition?.toLowerCase().includes('clear')) return Sun;
    if (condition?.toLowerCase().includes('cloud')) return Cloud;
    if (condition?.toLowerCase().includes('rain')) return CloudDrizzle;
    return Sun;
  };

  const WeatherIcon = getWeatherIcon(current.condition);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6 shadow-sm"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-blue-500" />
            Live Weather
          </h3>
          <p className="text-sm text-muted-foreground">{location?.city || location?.display_name || 'Loading...'}</p>
        </div>
        <div className="bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-bold">
          LIVE
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-background rounded-full shadow-sm">
            <WeatherIcon className="w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
          <div>
            <span className="text-4xl font-bold text-foreground">{current.temperature}°C</span>
            <p className="text-sm text-muted-foreground">{current.condition}</p>
          </div>
        </div>
        <div className="text-right">
            <div className="text-sm font-medium text-foreground">Feels</div>
            <div className="text-2xl font-bold text-blue-500">{current.feels_like}°C</div>
            <div className="text-xs text-muted-foreground">Real Feel</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background/50 p-3 rounded-lg text-center">
          <Wind className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span className="block text-sm font-bold text-foreground">{current.wind_speed} km/h</span>
          <span className="text-[10px] text-muted-foreground">Wind</span>
        </div>
        <div className="bg-background/50 p-3 rounded-lg text-center">
          <Droplets className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span className="block text-sm font-bold text-foreground">{current.humidity}%</span>
          <span className="text-[10px] text-muted-foreground">Humidity</span>
        </div>
        <div className="bg-background/50 p-3 rounded-lg text-center">
          <Thermometer className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <span className="block text-sm font-bold text-foreground">{current.rain || 0}mm</span>
          <span className="text-[10px] text-muted-foreground">Rain</span>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherSummary;
