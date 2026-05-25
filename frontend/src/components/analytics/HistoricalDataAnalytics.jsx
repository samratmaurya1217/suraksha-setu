import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Cloud, 
  Droplets, 
  Wind,
  AlertTriangle,
  Calendar,
  Download
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const HistoricalDataAnalytics = () => {
  const [rainfallData, setRainfallData] = useState([]);
  const [aqiData, setAqiData] = useState([]);
  const [disasterStats, setDisasterStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    generateMockData();
  }, [timeRange]);

  const generateMockData = () => {
    // Generate rainfall data for last N days
    const rainfall = [];
    const aqi = [];
    const disasters = [
      { type: 'Flood', count: 12, severity: 'high' },
      { type: 'Cyclone', count: 3, severity: 'critical' },
      { type: 'Earthquake', count: 8, severity: 'medium' },
      { type: 'Drought', count: 5, severity: 'medium' },
      { type: 'Landslide', count: 7, severity: 'high' }
    ];

    for (let i = timeRange; i >= 0; i--) {
      const date = subDays(new Date(), i);
      rainfall.push({
        date: format(date, 'MMM dd'),
        fullDate: format(date, 'yyyy-MM-dd'),
        rainfall: Math.random() * 100 + 20,
        avgRainfall: 60,
        lastYear: Math.random() * 90 + 15
      });

      aqi.push({
        date: format(date, 'MMM dd'),
        fullDate: format(date, 'yyyy-MM-dd'),
        aqi: Math.floor(Math.random() * 200 + 50),
        pm25: Math.floor(Math.random() * 100 + 20),
        pm10: Math.floor(Math.random() * 150 + 30),
        threshold: 100
      });
    }

    setRainfallData(rainfall);
    setAqiData(aqi);
    setDisasterStats(disasters);
    setLoading(false);
  };

  const calculateTrend = (data, key) => {
    if (data.length < 2) return 0;
    const recent = data.slice(-7).reduce((sum, item) => sum + item[key], 0) / 7;
    const previous = data.slice(-14, -7).reduce((sum, item) => sum + item[key], 0) / 7;
    return ((recent - previous) / previous * 100).toFixed(1);
  };

  const rainfallTrend = calculateTrend(rainfallData, 'rainfall');
  const aqiTrend = calculateTrend(aqiData, 'aqi');

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleExport = (dataType) => {
    const data = dataType === 'rainfall' ? rainfallData : aqiData;
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataType}_data_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Historical Data & Analytics</h2>
          <p className="text-muted-foreground">Analyze trends and patterns in disaster data</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(days => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days} Days
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rainfall</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(rainfallData.reduce((sum, d) => sum + d.rainfall, 0) / rainfallData.length).toFixed(1)} mm
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {rainfallTrend > 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
              )}
              <span className={rainfallTrend > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(rainfallTrend)}%
              </span>
              <span className="ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. AQI</CardTitle>
            <Wind className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(aqiData.reduce((sum, d) => sum + d.aqi, 0) / aqiData.length)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {aqiTrend > 0 ? (
                <TrendingUp className="w-3 h-3 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
              )}
              <span className={aqiTrend > 0 ? 'text-red-500' : 'text-green-500'}>
                {Math.abs(aqiTrend)}%
              </span>
              <span className="ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disasters</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {disasterStats.reduce((sum, d) => sum + d.count, 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Calendar className="w-3 h-3 mr-1" />
              <span>Last {timeRange} days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="rainfall" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="rainfall">Rainfall</TabsTrigger>
          <TabsTrigger value="aqi">Air Quality</TabsTrigger>
          <TabsTrigger value="disasters">Disasters</TabsTrigger>
        </TabsList>

        {/* Rainfall Chart */}
        <TabsContent value="rainfall" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rainfall Trends</CardTitle>
                  <CardDescription>30-day rainfall comparison with historical average</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport('rainfall')} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={rainfallData}>
                  <defs>
                    <linearGradient id="colorRainfall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="rainfall" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorRainfall)"
                    name="Current Rainfall"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgRainfall" 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    name="Historical Avg"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="lastYear" 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3"
                    name="Last Year"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AQI Chart */}
        <TabsContent value="aqi" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Air Quality Index History</CardTitle>
                  <CardDescription>PM2.5, PM10, and overall AQI trends</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport('aqi')} className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={aqiData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'currentColor' }}
                    label={{ value: 'AQI Value', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="aqi" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="AQI"
                    dot={{ fill: '#ef4444', r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pm25" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="PM2.5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pm10" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="PM10"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="threshold" 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    name="Safe Threshold"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Badge className="bg-green-500">0-50: Good</Badge>
                <Badge className="bg-yellow-500">51-100: Moderate</Badge>
                <Badge className="bg-orange-500">101-150: Unhealthy (Sensitive)</Badge>
                <Badge className="bg-red-500">151-200: Unhealthy</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disasters Chart */}
        <TabsContent value="disasters" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Disaster Distribution</CardTitle>
                <CardDescription>Breakdown by disaster type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={disasterStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                    >
                      {disasterStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disaster Count by Type</CardTitle>
                <CardDescription>Total occurrences in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={disasterStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="type" 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Occurrences">
                      {disasterStats.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.severity === 'critical' ? '#ef4444' :
                            entry.severity === 'high' ? '#f59e0b' :
                            '#3b82f6'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricalDataAnalytics;
