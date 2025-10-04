// Sample Data for Interactive Earth Story Map
// Contains realistic climate anomaly events for demonstration

export const sampleEvents = [
  {
    id: "fire_001",
    type: "fire",
    title: "Amazon Rainforest Wildfire",
    summary: "Large wildfire detected in the Brazilian Amazon rainforest region with significant smoke plumes",
    location: {
      name: "Rondônia, Brazil",
      coordinates: {
        lat: -8.783,
        lng: -63.904
      },
      mapPosition: {
        xPercent: 32,
        yPercent: 65
      }
    },
    severity: "high",
    instrument: "MODIS",
    satellite: "Terra/Aqua",
    date: "2024-08-15T10:30:00Z",
    confidence: 92,
    metadata: {
      area_burned: "1,847 hectares",
      detection_time: "2024-08-15T10:15:00Z",
      fire_radiative_power: "245.8 MW"
    },
    timeline: [
      {
        date: "2024-08-15T10:15:00Z",
        event: "Initial detection",
        description: "Thermal anomaly first detected by satellite"
      },
      {
        date: "2024-08-15T14:30:00Z",
        event: "Fire confirmed",
        description: "Ground verification confirms active wildfire"
      },
      {
        date: "2024-08-16T08:00:00Z",
        event: "Spread accelerates",
        description: "Fire spreads due to strong winds and dry conditions"
      }
    ]
  },
  
  {
    id: "pollution_001", 
    type: "co_pollution",
    title: "Industrial CO Emissions Spike",
    summary: "Significant carbon monoxide pollution detected over major industrial region in China",
    location: {
      name: "Hebei Province, China",
      coordinates: {
        lat: 38.0428,
        lng: 114.5149
      },
      mapPosition: {
        xPercent: 75,
        yPercent: 35
      }
    },
    severity: "medium",
    instrument: "AIRS",
    satellite: "Aqua",
    date: "2024-07-22T06:45:00Z",
    confidence: 87,
    metadata: {
      co_concentration: "2.3 ppmv",
      detection_altitude: "500-700 hPa",
      source_type: "industrial"
    },
    timeline: [
      {
        date: "2024-07-22T06:45:00Z",
        event: "Anomaly detected",
        description: "Elevated CO levels first observed"
      },
      {
        date: "2024-07-22T12:00:00Z",
        event: "Peak concentration",
        description: "CO levels reach maximum values"
      },
      {
        date: "2024-07-23T18:30:00Z",
        event: "Levels declining",
        description: "Pollution begins to disperse"
      }
    ]
  },

  {
    id: "flood_001",
    type: "flood",
    title: "Monsoon Flooding in Bangladesh",
    summary: "Extensive flooding in the Ganges-Brahmaputra delta due to heavy monsoon rains",
    location: {
      name: "Sylhet Division, Bangladesh",
      coordinates: {
        lat: 24.8949,
        lng: 91.8687
      },
      mapPosition: {
        xPercent: 78,
        yPercent: 42
      }
    },
    severity: "high",
    instrument: "VIIRS",
    satellite: "NOAA-20",
    date: "2024-06-18T14:20:00Z",
    confidence: 95,
    metadata: {
      flood_extent: "12,450 km²",
      water_depth: "2-4 meters",
      affected_population: "~450,000"
    },
    timeline: [
      {
        date: "2024-06-16T00:00:00Z",
        event: "Heavy rains begin",
        description: "Monsoon brings intense precipitation"
      },
      {
        date: "2024-06-17T18:45:00Z",
        event: "Rivers overflow",
        description: "Major rivers exceed danger levels"
      },
      {
        date: "2024-06-18T14:20:00Z",
        event: "Peak flooding",
        description: "Maximum flood extent reached"
      }
    ]
  },

  {
    id: "snow_001",
    type: "snow",
    title: "Unusual September Snowfall",
    summary: "Rare early season snowfall event in the Rocky Mountains, setting September records",
    location: {
      name: "Colorado Rockies, USA",
      coordinates: {
        lat: 39.7392,
        lng: -104.9903
      },
      mapPosition: {
        xPercent: 25,
        yPercent: 40
      }
    },
    severity: "low",
    instrument: "MODIS",
    satellite: "Terra",
    date: "2024-09-04T16:15:00Z",
    confidence: 89,
    metadata: {
      snow_depth: "35 cm",
      temperature: "-3°C",
      elevation: "2,800-3,400m"
    },
    timeline: [
      {
        date: "2024-09-03T22:00:00Z",
        event: "Cold front approaches",
        description: "Arctic air mass moves south"
      },
      {
        date: "2024-09-04T20:30:00Z",
        event: "Snow begins",
        description: "First snowflakes detected by satellite"
      },
      {
        date: "2024-09-05T12:20:00Z",
        event: "Heavy accumulation",
        description: "35cm of snow recorded, breaking September records"
      }
    ]
  },

  {
    id: "drought_001",
    type: "drought",
    title: "California Central Valley Drought",
    summary: "Severe agricultural drought conditions persist, affecting crop yields across region",
    location: {
      name: "Central Valley, California, USA",
      coordinates: {
        lat: 36.7783,
        lng: -119.4179
      },
      mapPosition: {
        xPercent: 15,
        yPercent: 38
      }
    },
    severity: "high",
    instrument: "Landsat-8",
    satellite: "Landsat-8",
    date: "2024-05-10T18:30:00Z",
    confidence: 93,
    metadata: {
      soil_moisture: "15% below normal",
      crop_stress: "severe",
      reservoir_levels: "32% capacity"
    },
    timeline: [
      {
        date: "2024-03-01T00:00:00Z",
        event: "Drought onset",
        description: "Below-normal precipitation begins"
      },
      {
        date: "2024-04-15T12:00:00Z",
        event: "Soil moisture decline",
        description: "Significant reduction in soil water content"
      },
      {
        date: "2024-05-10T18:30:00Z",
        event: "Severe conditions",
        description: "Drought classified as severe"
      }
    ]
  },

  {
    id: "deforestation_001",
    type: "deforestation",
    title: "Congo Basin Forest Loss",
    summary: "Rapid deforestation detected in the Congo Basin rainforest, likely due to logging activities",
    location: {
      name: "Democratic Republic of Congo",
      coordinates: {
        lat: -2.9814,
        lng: 23.8222
      },
      mapPosition: {
        xPercent: 55,
        yPercent: 58
      }
    },
    severity: "medium",
    instrument: "Landsat-9",
    satellite: "Landsat-9",
    date: "2024-03-25T11:45:00Z",
    confidence: 91,
    metadata: {
      area_cleared: "847 hectares",
      forest_type: "primary rainforest",
      clearing_method: "selective logging"
    },
    timeline: [
      {
        date: "2024-03-20T00:00:00Z",
        event: "Clearing begins",
        description: "Initial forest clearing detected"
      },
      {
        date: "2024-03-22T14:30:00Z",
        event: "Accelerated clearing",
        description: "Clearing rate increases significantly"
      },
      {
        date: "2024-03-25T11:45:00Z",
        event: "Large area cleared",
        description: "Major section of forest removed"
      }
    ]
  }
];

// Event type configuration for UI styling and filtering
export const eventTypeConfig = {
  fire: {
    name: "Wildfire",
    color: "#ff4444",
    icon: "🔥",
    description: "Active fires and thermal anomalies"
  },
  co_pollution: {
    name: "CO Pollution",
    color: "#ff8800", 
    icon: "🏭",
    description: "Carbon monoxide atmospheric pollution"
  },
  flood: {
    name: "Flooding",
    color: "#4488ff",
    icon: "🌊",
    description: "Surface water flooding events"
  },
  snow: {
    name: "Snow Cover",
    color: "#88ddff",
    icon: "❄️",
    description: "Snow accumulation and coverage"
  },
  drought: {
    name: "Drought",
    color: "#cc8844",
    icon: "🌵",
    description: "Agricultural and meteorological drought"
  },
  deforestation: {
    name: "Deforestation",
    color: "#44aa44",
    icon: "🌳",
    description: "Forest cover loss and land use change"
  }
};

// Helper functions for data manipulation

export function getEventsByType(eventType) {
  return sampleEvents.filter(event => event.type === eventType);
}

export function getEventsBySeverity(severity) {
  return sampleEvents.filter(event => event.severity === severity);
}

export function getEventsByDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return sampleEvents.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= start && eventDate <= end;
  });
}

export function getRecentEvents() {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  return sampleEvents.filter(event => {
    return new Date(event.date) >= oneMonthAgo;
  });
}