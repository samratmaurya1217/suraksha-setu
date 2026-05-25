import React, { useEffect, useRef } from 'react';
import { Viewer, Entity, PolylineGraphics, EntityDescription, CameraFlyTo, BillboardGraphics } from 'resium';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const { Cartesian3, Color, Ion, Terrain } = Cesium;

// Set Cesium Ion token
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3MjBkYTE5OC1mY2EwLTRkMmQtYmRiMC05YTAxNDI1MWI2MTIiLCJpZCI6MzYyOTAzLCJpYXQiOjE3NjM4NDk1NjR9.5XcrizHm7rKiSxsPvgJq53h5QFEcMu5SbhAl71dnDFI';
Ion.defaultAccessToken = CESIUM_TOKEN;

const Map3D = ({ center, aqiStations, cycloneTrack, rainfallData, showLayers }) => {
  const viewerRef = useRef(null);

  // Default center if not provided
  const defaultCenter = center || [20.5937, 78.9629, 500000]; // India center with altitude

  // Convert lat/lon to Cartesian3
  const positionFromLatLon = (lat, lon, height = 0) => {
    return Cartesian3.fromDegrees(lon, lat, height);
  };

  // Get AQI color
  const getAQIColor = (aqi) => {
    if (aqi > 300) return Color.MAROON;
    if (aqi > 200) return Color.PURPLE;
    if (aqi > 150) return Color.RED;
    if (aqi > 100) return Color.ORANGE;
    if (aqi > 50) return Color.YELLOW;
    return Color.GREEN;
  };

  return (
    <Viewer
      ref={viewerRef}
      full
      style={{ height: '100%', width: '100%' }}
      terrain={Terrain.fromWorldTerrain()}
      animation={false}
      timeline={false}
      baseLayerPicker={false}
      geocoder={false}
      homeButton={false}
      sceneModePicker={false}
      navigationHelpButton={false}
    >
      {/* Fly to center location */}
      <CameraFlyTo
        destination={positionFromLatLon(defaultCenter[0], defaultCenter[1], defaultCenter[2] || 500000)}
        duration={2}
      />

      {/* Center Location Marker */}
      {center && center[0] && center[1] && (
        <Entity
          name="Selected Location"
          description={`Latitude: ${center[0].toFixed(4)}, Longitude: ${center[1].toFixed(4)}`}
          position={positionFromLatLon(center[0], center[1], 1000)}
        >
          <BillboardGraphics
            image="/marker-icon.png"
            scale={0.5}
            heightReference={1}
          />
        </Entity>
      )}

      {/* AQI Station Markers in 3D */}
      {showLayers?.aqi && aqiStations && aqiStations.length > 0 && aqiStations.map((station, index) => (
        station.lat && station.lon && (
          <Entity
            key={`aqi-3d-${index}`}
            name={station.name}
            description={`
              <div>
                <strong>${station.name}</strong><br/>
                AQI: <strong>${station.aqi}</strong><br/>
                Category: ${station.category}
              </div>
            `}
            position={positionFromLatLon(station.lat, station.lon, 5000)}
          >
            <BillboardGraphics
              color={getAQIColor(station.aqi)}
              scale={0.8}
              heightReference={1}
            />
            {/* Vertical line from ground */}
            <PolylineGraphics
              positions={[
                positionFromLatLon(station.lat, station.lon, 0),
                positionFromLatLon(station.lat, station.lon, station.aqi * 100)
              ]}
              width={3}
              material={getAQIColor(station.aqi)}
            />
          </Entity>
        )
      ))}

      {/* Rainfall Visualization - Columns */}
      {showLayers?.rainfall && rainfallData && rainfallData.length > 0 && rainfallData.map((zone, index) => (
        zone.lat && zone.lon && (
          <Entity
            key={`rain-3d-${index}`}
            name="Rainfall Zone"
            description={`
              <div>
                <strong>Rainfall Zone</strong><br/>
                Intensity: ${zone.intensity}%<br/>
                Amount: ${zone.amount}mm
              </div>
            `}
            position={positionFromLatLon(zone.lat, zone.lon, zone.intensity * 500)}
          >
            <PolylineGraphics
              positions={[
                positionFromLatLon(zone.lat, zone.lon, 0),
                positionFromLatLon(zone.lat, zone.lon, zone.intensity * 1000)
              ]}
              width={5}
              material={Color.BLUE.withAlpha(0.7)}
            />
          </Entity>
        )
      ))}

      {/* Cyclone Track in 3D */}
      {showLayers?.cyclone && cycloneTrack && cycloneTrack.length > 0 && (
        <>
          {/* Path line */}
          <Entity name="Cyclone Path">
            <PolylineGraphics
              positions={cycloneTrack.map(point => 
                positionFromLatLon(point.lat, point.lon, 10000)
              )}
              width={5}
              material={Color.RED.withAlpha(0.8)}
            />
          </Entity>

          {/* Position markers */}
          {cycloneTrack.map((point, index) => (
            <Entity
              key={`cyclone-3d-${index}`}
              name={`Cyclone Position ${index + 1}`}
              description={`
                <div>
                  <strong>Cyclone Position</strong><br/>
                  Time: ${point.time}<br/>
                  Intensity: ${point.intensity}<br/>
                  Wind Speed: ${point.wind_speed} km/h
                </div>
              `}
              position={positionFromLatLon(point.lat, point.lon, point.intensity * 100)}
            >
              <BillboardGraphics
                color={Color.RED}
                scale={1.0}
                heightReference={1}
              />
            </Entity>
          ))}
        </>
      )}
    </Viewer>
  );
};

export default Map3D;
