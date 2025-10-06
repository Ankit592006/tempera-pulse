-- Create weather_stations table
CREATE TABLE public.weather_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather_data table
CREATE TABLE public.weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.weather_stations(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  temperature DECIMAL(5, 2) NOT NULL,
  humidity DECIMAL(5, 2) NOT NULL,
  precipitation DECIMAL(5, 2) NOT NULL DEFAULT 0,
  wind_speed DECIMAL(5, 2) NOT NULL DEFAULT 0,
  pressure DECIMAL(7, 2) NOT NULL DEFAULT 1013.25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather_predictions table
CREATE TABLE public.weather_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.weather_stations(id) ON DELETE CASCADE,
  prediction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_temp DECIMAL(5, 2) NOT NULL,
  predicted_humidity DECIMAL(5, 2) NOT NULL,
  predicted_precipitation DECIMAL(5, 2) NOT NULL DEFAULT 0,
  confidence DECIMAL(5, 2) NOT NULL DEFAULT 85.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weather_alerts table
CREATE TABLE public.weather_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.weather_stations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'extreme')),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_weather_data_station_timestamp ON public.weather_data(station_id, timestamp DESC);
CREATE INDEX idx_weather_predictions_station_date ON public.weather_predictions(station_id, prediction_date);
CREATE INDEX idx_weather_alerts_station_active ON public.weather_alerts(station_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (monitoring system)
CREATE POLICY "Allow public read access to weather_stations"
ON public.weather_stations FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to weather_data"
ON public.weather_data FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to weather_predictions"
ON public.weather_predictions FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to weather_alerts"
ON public.weather_alerts FOR SELECT
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather_alerts;