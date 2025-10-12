import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete existing data to start fresh with Indian cities
    await supabase.from('weather_alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('weather_predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('weather_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('weather_stations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create Indian weather stations
    const stations = [
      { name: "Mumbai", location: "Maharashtra, Western India", latitude: 19.0760, longitude: 72.8777 },
      { name: "Pune", location: "Maharashtra, Western India", latitude: 18.5204, longitude: 73.8567 },
      { name: "Alandi", location: "Maharashtra, Western India", latitude: 18.6776, longitude: 73.8987 },
      { name: "Sangamner", location: "Maharashtra, Central India", latitude: 19.5673, longitude: 74.2058 },
      { name: "Nagpur", location: "Maharashtra, Central India", latitude: 21.1458, longitude: 79.0882 }
    ];

    const { data: stationsData, error: stationsError } = await supabase
      .from('weather_stations')
      .insert(stations)
      .select();

    if (stationsError) throw stationsError;

    // Generate historical weather data (last 7 days)
    const weatherData = [];
    const predictions = [];
    const alerts = [];
    
    // Realistic climate profiles for Indian cities
    const climateProfiles: Record<string, { 
      baseTemp: number, 
      tempRange: number, 
      humidity: { min: number, max: number },
      rainProbability: number,
      windSpeed: { min: number, max: number }
    }> = {
      "Mumbai": { baseTemp: 30, tempRange: 5, humidity: { min: 65, max: 85 }, rainProbability: 0.25, windSpeed: { min: 10, max: 35 } },
      "Pune": { baseTemp: 28, tempRange: 7, humidity: { min: 45, max: 70 }, rainProbability: 0.15, windSpeed: { min: 8, max: 25 } },
      "Alandi": { baseTemp: 27, tempRange: 6, humidity: { min: 50, max: 75 }, rainProbability: 0.18, windSpeed: { min: 7, max: 22 } },
      "Sangamner": { baseTemp: 29, tempRange: 8, humidity: { min: 40, max: 65 }, rainProbability: 0.20, windSpeed: { min: 12, max: 30 } },
      "Nagpur": { baseTemp: 32, tempRange: 9, humidity: { min: 35, max: 60 }, rainProbability: 0.12, windSpeed: { min: 5, max: 20 } }
    };
    
    for (const station of stationsData) {
      const profile = climateProfiles[station.name] || climateProfiles["Pune"];
      
      // Historical data (last 7 days, hourly)
      for (let day = 7; day >= 0; day--) {
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = new Date(Date.now() - (day * 24 + (23 - hour)) * 3600000);
          
          // Realistic temperature variation: cooler at night (2-6 AM), hotter in afternoon (1-4 PM)
          const hourFactor = Math.sin((hour - 6) / 24 * Math.PI * 2);
          const temp = profile.baseTemp + (hourFactor * profile.tempRange) + (Math.random() - 0.5) * 2;
          
          // Humidity inversely correlated with temperature
          const humidityBase = profile.humidity.min + (profile.humidity.max - profile.humidity.min) * (1 - (hourFactor + 1) / 2);
          const humidity = humidityBase + (Math.random() - 0.5) * 10;
          
          // Realistic precipitation patterns
          const precipitation = Math.random() < profile.rainProbability ? (Math.random() * 15 + 2) : 0;
          
          // Wind speed varies with time of day
          const windBase = profile.windSpeed.min + (profile.windSpeed.max - profile.windSpeed.min) * Math.random();
          const windSpeed = Math.max(windBase + (Math.random() - 0.5) * 5, 0);
          
          // Atmospheric pressure (typical range for India)
          const pressure = 1010 + Math.sin(day / 7 * Math.PI) * 8 + (Math.random() - 0.5) * 5;
          
          weatherData.push({
            station_id: station.id,
            timestamp: timestamp.toISOString(),
            temperature: Number(temp.toFixed(2)),
            humidity: Number(Math.max(20, Math.min(95, humidity)).toFixed(2)),
            precipitation: Number(precipitation.toFixed(2)),
            wind_speed: Number(windSpeed.toFixed(2)),
            pressure: Number(pressure.toFixed(2))
          });
        }
      }

      // Generate predictions (next 5 days, every 6 hours)
      for (let day = 0; day < 5; day++) {
        for (let hour = 0; hour < 24; hour += 6) {
          const predDate = new Date(Date.now() + (day * 24 + hour) * 3600000);
          
          // Slight warming trend over prediction period
          const trendFactor = day * 0.5;
          const hourFactor = Math.sin((hour - 6) / 24 * Math.PI * 2);
          const predictedTemp = profile.baseTemp + (hourFactor * profile.tempRange) + trendFactor;
          
          const humidityBase = profile.humidity.min + (profile.humidity.max - profile.humidity.min) * (1 - (hourFactor + 1) / 2);
          const predictedHumidity = humidityBase + (Math.random() - 0.5) * 8;
          
          const predictedPrecipitation = Math.random() < profile.rainProbability * 0.8 ? (Math.random() * 8 + 1) : 0;
          
          // Confidence decreases over time
          const confidence = 95 - (day * 3) + (Math.random() - 0.5) * 4;
          
          predictions.push({
            station_id: station.id,
            prediction_date: predDate.toISOString(),
            predicted_temp: Number(predictedTemp.toFixed(2)),
            predicted_humidity: Number(Math.max(20, Math.min(95, predictedHumidity)).toFixed(2)),
            predicted_precipitation: Number(predictedPrecipitation.toFixed(2)),
            confidence: Number(Math.max(75, Math.min(98, confidence)).toFixed(2))
          });
        }
      }

      // Generate realistic alerts based on Indian weather patterns
      const avgTemp = profile.baseTemp;
      const isHeatWave = avgTemp > 38;
      const isHeavyRain = profile.rainProbability > 0.22;
      const isHighWind = profile.windSpeed.max > 30;
      
      if (isHeatWave) {
        alerts.push({
          station_id: station.id,
          alert_type: "Heat Wave Warning",
          severity: avgTemp > 42 ? "extreme" : "high",
          message: `Heat wave conditions expected. Temperature may reach ${(avgTemp + 3).toFixed(1)}°C. Stay hydrated and avoid direct sunlight.`,
          is_active: true
        });
      }

      if (isHeavyRain) {
        alerts.push({
          station_id: station.id,
          alert_type: "Heavy Rainfall Alert",
          severity: "medium",
          message: `Heavy rainfall expected. Possibility of waterlogging in low-lying areas. Take necessary precautions.`,
          is_active: true
        });
      }

      if (isHighWind) {
        alerts.push({
          station_id: station.id,
          alert_type: "Strong Wind Advisory",
          severity: "medium",
          message: `Strong winds expected with speeds up to ${profile.windSpeed.max} km/h. Secure loose objects.`,
          is_active: true
        });
      }

      // Monsoon-related alerts for high humidity cities
      if (profile.humidity.max > 75 && Math.random() > 0.5) {
        alerts.push({
          station_id: station.id,
          alert_type: "High Humidity Alert",
          severity: "low",
          message: `High humidity levels expected (${profile.humidity.max}%). Uncomfortable weather conditions likely.`,
          is_active: true
        });
      }
    }

    // Insert all data
    const { error: dataError } = await supabase
      .from('weather_data')
      .insert(weatherData);

    if (dataError) throw dataError;

    const { error: predError } = await supabase
      .from('weather_predictions')
      .insert(predictions);

    if (predError) throw predError;

    if (alerts.length > 0) {
      const { error: alertError } = await supabase
        .from('weather_alerts')
        .insert(alerts);

      if (alertError) throw alertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Weather data seeded successfully",
        stats: {
          stations: stationsData.length,
          dataPoints: weatherData.length,
          predictions: predictions.length,
          alerts: alerts.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error seeding weather data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
