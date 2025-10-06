import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface WeatherChartsProps {
  stationId: string;
  type: "forecast" | "historical" | "analytics";
}

const WeatherCharts = ({ stationId, type }: WeatherChartsProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type === "forecast") {
      loadForecastData();
    } else if (type === "historical") {
      loadHistoricalData();
    } else {
      loadAnalyticsData();
    }
  }, [stationId, type]);

  const loadForecastData = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_predictions')
        .select('*')
        .eq('station_id', stationId)
        .order('prediction_date')
        .limit(40);

      if (error) throw error;

      const formatted = data?.map(item => ({
        time: format(new Date(item.prediction_date), 'MMM dd HH:mm'),
        temperature: Number(item.predicted_temp),
        humidity: Number(item.predicted_humidity),
        precipitation: Number(item.predicted_precipitation),
        confidence: Number(item.confidence)
      })) || [];

      setChartData(formatted);
    } catch (error) {
      console.error('Error loading forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_data')
        .select('*')
        .eq('station_id', stationId)
        .order('timestamp', { ascending: false })
        .limit(48);

      if (error) throw error;

      const formatted = data?.reverse().map(item => ({
        time: format(new Date(item.timestamp), 'MMM dd HH:mm'),
        temperature: Number(item.temperature),
        humidity: Number(item.humidity),
        precipitation: Number(item.precipitation),
        windSpeed: Number(item.wind_speed),
        pressure: Number(item.pressure)
      })) || [];

      setChartData(formatted);
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const { data: historical, error: histError } = await supabase
        .from('weather_data')
        .select('*')
        .eq('station_id', stationId)
        .order('timestamp', { ascending: false })
        .limit(24);

      const { data: predictions, error: predError } = await supabase
        .from('weather_predictions')
        .select('*')
        .eq('station_id', stationId)
        .order('prediction_date')
        .limit(24);

      if (histError || predError) throw histError || predError;

      const avgAccuracy = predictions?.reduce((acc, pred) => acc + Number(pred.confidence), 0) / (predictions?.length || 1);
      
      const formatted = historical?.reverse().map((item, idx) => ({
        time: format(new Date(item.timestamp), 'MMM dd'),
        actual: Number(item.temperature),
        predicted: predictions?.[idx] ? Number(predictions[idx].predicted_temp) : null,
        accuracy: predictions?.[idx] ? Number(predictions[idx].confidence) : avgAccuracy
      })) || [];

      setChartData(formatted);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (type === "forecast") {
    return (
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Temperature & Humidity Forecast</CardTitle>
            <CardDescription>Next 5 days prediction with confidence intervals</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="temperature" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Temperature (°C)" />
                <Line type="monotone" dataKey="humidity" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Humidity (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Precipitation Forecast</CardTitle>
            <CardDescription>Expected rainfall in millimeters</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar dataKey="precipitation" fill="hsl(var(--chart-3))" name="Precipitation (mm)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Prediction Confidence</CardTitle>
            <CardDescription>Model accuracy over forecast period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis domain={[75, 100]} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Area type="monotone" dataKey="confidence" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.6} name="Confidence (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === "historical") {
    return (
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Temperature Trend</CardTitle>
            <CardDescription>Last 48 hours of recorded data</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Area type="monotone" dataKey="temperature" stroke="hsl(var(--chart-1))" fill="url(#tempGradient)" name="Temperature (°C)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Humidity & Precipitation</CardTitle>
              <CardDescription>Historical comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="humidity" stroke="hsl(var(--chart-2))" name="Humidity (%)" />
                  <Line type="monotone" dataKey="precipitation" stroke="hsl(var(--chart-3))" name="Precipitation (mm)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Wind & Pressure</CardTitle>
              <CardDescription>Atmospheric conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="windSpeed" stroke="hsl(var(--chart-4))" name="Wind Speed (km/h)" />
                  <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="hsl(var(--chart-5))" name="Pressure (hPa)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Prediction Accuracy Analysis</CardTitle>
          <CardDescription>Comparing actual vs predicted temperatures</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Actual Temperature (°C)" />
              <Line type="monotone" dataKey="predicted" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" name="Predicted Temperature (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Model Performance</CardTitle>
          <CardDescription>Accuracy percentage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {(chartData.reduce((acc, item) => acc + (item.accuracy || 0), 0) / chartData.length).toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">Average Model Accuracy</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis domain={[75, 100]} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="accuracy" fill="hsl(var(--chart-4))" name="Accuracy (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherCharts;