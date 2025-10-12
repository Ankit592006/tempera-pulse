import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Cloud, CloudRain, Droplets, Wind, Gauge, AlertTriangle, TrendingUp, Database } from "lucide-react";
import WeatherCharts from "./WeatherCharts";
import AlertsPanel from "./AlertsPanel";

interface Station {
  id: string;
  name: string;
  location: string;
}

interface CurrentWeather {
  temperature: number;
  humidity: number;
  precipitation: number;
  wind_speed: number;
  pressure: number;
  timestamp: string;
}

const WeatherDashboard = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadStations();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadCurrentWeather();
    }
  }, [selectedStation]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('weather-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weather_data'
        },
        () => {
          if (selectedStation) loadCurrentWeather();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadStations = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_stations')
        .select('*')
        .order('name');

      if (error) throw error;

      setStations(data || []);
      if (data && data.length > 0) {
        setSelectedStation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      toast.error('Failed to load weather stations');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentWeather = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('station_id', selectedStation)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setCurrentWeather(data);
    } catch (error) {
      console.error('Error loading current weather:', error);
    }
  };

  const seedData = async () => {
    setSeeding(true);
    try {
      const { error } = await supabase.functions.invoke('seed-weather-data');
      
      if (error) throw error;
      
      toast.success('Weather data seeded successfully!');
      await loadStations();
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed weather data');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              No Data Available
            </CardTitle>
            <CardDescription>
              Initialize the weather monitoring system with sample data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={seedData} 
              disabled={seeding} 
              className="w-full"
              size="lg"
            >
              {seeding ? "Seeding Data..." : "Seed Weather Data"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Cloud className="h-10 w-10 text-primary" />
              Weather Prediction System
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time weather monitoring and AI-powered forecasting
            </p>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="px-4 py-2 rounded-lg border border-border bg-card text-card-foreground shadow-sm"
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={seedData} disabled={seeding}>
              <Database className="h-4 w-4 mr-2" />
              Reseed
            </Button>
          </div>
        </div>

        {/* Current Weather Cards */}
        {currentWeather && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Temperature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {currentWeather.temperature.toFixed(1)}°C
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Humidity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">
                  {currentWeather.humidity.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CloudRain className="h-4 w-4 text-cyan-500" />
                  Precipitation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-500">
                  {currentWeather.precipitation.toFixed(1)}mm
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wind className="h-4 w-4 text-green-500" />
                  Wind Speed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {currentWeather.wind_speed.toFixed(1)} km/h
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-purple-500" />
                  Pressure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">
                  {currentWeather.pressure.toFixed(0)} hPa
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerts Panel */}
        <AlertsPanel stationId={selectedStation} />

        {/* Charts and Analytics */}
        <Tabs defaultValue="forecast" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="historical">Historical Data</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4">
            <WeatherCharts stationId={selectedStation} type="forecast" />
          </TabsContent>

          <TabsContent value="historical" className="space-y-4">
            <WeatherCharts stationId={selectedStation} type="historical" />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <WeatherCharts stationId={selectedStation} type="analytics" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WeatherDashboard;