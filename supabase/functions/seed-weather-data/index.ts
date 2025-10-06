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

    // Create weather stations
    const stations = [
      { name: "Downtown Station", location: "City Center", latitude: 40.7128, longitude: -74.0060 },
      { name: "Airport Station", location: "International Airport", latitude: 40.6413, longitude: -73.7781 },
      { name: "Coastal Station", location: "Seaside", latitude: 40.5795, longitude: -73.9680 },
      { name: "Mountain Station", location: "Highland Peak", latitude: 40.9176, longitude: -74.1718 },
      { name: "Valley Station", location: "Green Valley", latitude: 40.8448, longitude: -73.8648 }
    ];

    const { data: stationsData, error: stationsError } = await supabase
      .from('weather_stations')
      .upsert(stations, { onConflict: 'name' })
      .select();

    if (stationsError) throw stationsError;

    // Generate historical weather data (last 7 days)
    const weatherData = [];
    const predictions = [];
    const alerts = [];
    
    for (const station of stationsData) {
      const baseTemp = 15 + Math.random() * 15; // 15-30°C base
      
      // Historical data (last 7 days, hourly)
      for (let day = 7; day >= 0; day--) {
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = new Date(Date.now() - (day * 24 + (23 - hour)) * 3600000);
          const temp = baseTemp + Math.sin(hour / 24 * Math.PI * 2) * 5 + (Math.random() - 0.5) * 3;
          const humidity = 40 + Math.random() * 40;
          const precipitation = Math.random() < 0.15 ? Math.random() * 10 : 0;
          
          weatherData.push({
            station_id: station.id,
            timestamp: timestamp.toISOString(),
            temperature: Number(temp.toFixed(2)),
            humidity: Number(humidity.toFixed(2)),
            precipitation: Number(precipitation.toFixed(2)),
            wind_speed: Number((Math.random() * 30).toFixed(2)),
            pressure: Number((1000 + Math.random() * 30).toFixed(2))
          });
        }
      }

      // Generate predictions (next 5 days, every 6 hours)
      for (let day = 0; day < 5; day++) {
        for (let hour = 0; hour < 24; hour += 6) {
          const predDate = new Date(Date.now() + (day * 24 + hour) * 3600000);
          const trend = (Math.random() - 0.5) * 2;
          const predictedTemp = baseTemp + trend + Math.sin((hour / 24) * Math.PI * 2) * 5;
          
          predictions.push({
            station_id: station.id,
            prediction_date: predDate.toISOString(),
            predicted_temp: Number(predictedTemp.toFixed(2)),
            predicted_humidity: Number((45 + Math.random() * 30).toFixed(2)),
            predicted_precipitation: Number((Math.random() * 5).toFixed(2)),
            confidence: Number((82 + Math.random() * 15).toFixed(2))
          });
        }
      }

      // Generate alerts based on extreme conditions
      const extremeTemp = baseTemp > 28 || baseTemp < 5;
      const highWind = Math.random() > 0.7;
      
      if (extremeTemp) {
        alerts.push({
          station_id: station.id,
          alert_type: baseTemp > 28 ? "Heat Warning" : "Cold Warning",
          severity: baseTemp > 32 || baseTemp < 0 ? "extreme" : "high",
          message: baseTemp > 28 
            ? `High temperature warning: ${baseTemp.toFixed(1)}°C expected` 
            : `Low temperature warning: ${baseTemp.toFixed(1)}°C expected`,
          is_active: true
        });
      }

      if (highWind) {
        alerts.push({
          station_id: station.id,
          alert_type: "Wind Advisory",
          severity: "medium",
          message: "Strong winds expected, up to 45 km/h",
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