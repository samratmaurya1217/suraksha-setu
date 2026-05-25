import React, { useState } from 'react';
import { MapPin, Loader2, Check, X, Navigation, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

const LocationSelector = ({ compact = false }) => {
  const {
    location,
    loading,
    error,
    wsConnected,
    detectLocation,
    updateLocationByPincode,
    clearLocation,
  } = useLocation();

  const [pinCode, setPinCode] = useState('');
  const [validating, setValidating] = useState(false);

  const handlePinCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!pinCode.trim()) {
      return;
    }

    if (!/^\d{6}$/.test(pinCode.trim())) {
      return;
    }

    setValidating(true);
    const result = await updateLocationByPincode(pinCode.trim());
    setValidating(false);

    if (result.success) {
      setPinCode('');
    }
  };

  const handleAutoDetect = async () => {
    await detectLocation();
  };

  if (compact && location) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-4 h-4 text-blue-500" />
        <span className="font-medium">
          {location.city || 'Unknown'}
          {location.pin_code && ` (${location.pin_code})`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearLocation}
          className="h-6 px-2"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Your Location</h3>
          </div>
          {location && (
            <Badge variant="outline" className="gap-1">
              <Check className="w-3 h-3" />
              Set
            </Badge>
          )}
        </div>

        {/* Current Location Display */}
        {location && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {location.city || 'Unknown City'}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {location.state || 'Unknown State'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLocation}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Change
                </Button>
              </div>
              {location.pin_code && (
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  PIN: {location.pin_code}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Method: {location.method === 'pincode' ? 'PIN Code' : location.method === 'gps' ? 'GPS' : 'IP Address'}
                </p>
                <Badge 
                  variant={wsConnected ? "default" : "secondary"} 
                  className={`gap-1 text-xs ${wsConnected ? 'bg-green-600' : 'bg-gray-400'}`}
                >
                  {wsConnected ? (
                    <>
                      <Wifi className="w-3 h-3" />
                      Live Alerts
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Location Input Methods */}
        {!location && (
          <div className="space-y-4">
            {/* Auto-detect button */}
            <Button
              onClick={handleAutoDetect}
              disabled={loading}
              className="w-full gap-2"
              variant="outline"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Auto-detect Location
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">Or</span>
              </div>
            </div>

            {/* PIN code input */}
            <form onSubmit={handlePinCodeSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Enter PIN Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit PIN code"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                  disabled={validating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: 110001 (Delhi), 400001 (Mumbai)
                </p>
              </div>
              <Button
                type="submit"
                disabled={validating || pinCode.length !== 6}
                className="w-full gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Set Location
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Error message */}
        {error && !location && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Info */}
        {!location && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 Setting your location helps us provide hyper-local weather alerts and disaster warnings specific to your area.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LocationSelector;
