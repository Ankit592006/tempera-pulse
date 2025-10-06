import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface WeatherAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

interface AlertsPanelProps {
  stationId: string;
}

const AlertsPanel = ({ stationId }: AlertsPanelProps) => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    setupRealtimeSubscription();
  }, [stationId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('weather-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weather_alerts',
          filter: `station_id=eq.${stationId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new as WeatherAlert;
            setAlerts(prev => [newAlert, ...prev]);
            
            // Show toast notification for new alerts
            if (newAlert.is_active) {
              toast.error(newAlert.message, {
                description: `Severity: ${newAlert.severity}`,
                duration: 5000,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev => prev.map(alert => 
              alert.id === payload.new.id ? payload.new as WeatherAlert : alert
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load weather alerts');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      default:
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Active Weather Alerts
        </CardTitle>
        <CardDescription>
          Real-time notifications for extreme weather conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <Alert className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <AlertDescription>
              No active weather alerts. Conditions are normal.
            </AlertDescription>
          </Alert>
        ) : (
          alerts.map((alert) => (
            <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
              <div className="flex gap-3">
                {getSeverityIcon(alert.severity)}
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">
                    {alert.alert_type}
                  </div>
                  <AlertDescription className="text-sm">
                    {alert.message}
                  </AlertDescription>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </Alert>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;