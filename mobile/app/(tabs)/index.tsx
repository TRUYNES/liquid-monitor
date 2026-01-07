import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Cpu, Thermometer, HardDrive, ArrowDown, ArrowUp, Activity } from 'lucide-react-native';
import { getStats, getPeaks } from '@/services/api';
import StatsCard from '@/components/StatsCard';

export default function DashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [peaks, setPeaks] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const [currentData, peaksData] = await Promise.all([getStats(), getPeaks()]);
    if (currentData) setStats(currentData);
    if (peaksData) setPeaks(peaksData);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Activity size={48} color="#60a5fa" />
        <Text className="text-gray-400 mt-4">Connecting to Monitor...</Text>
      </View>
    );
  }

  // Format network speed (KB/s -> MB/s if large)
  const formatSpeed = (val: number) => {
    if (val > 1024) return `${(val / 1024).toFixed(1)} MB/s`;
    return `${val.toFixed(1)} KB/s`;
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        <Text className="text-3xl font-bold text-white mb-6">LiquidMonitor</Text>

        <View className="flex-row flex-wrap justify-between">
          <StatsCard
            title="CPU Usage"
            value={`${stats.cpu_usage}%`}
            subValue={peaks?.cpu_peak ? `${peaks.cpu_peak.value}%` : undefined}
            icon={Cpu}
            iconColor="#60a5fa" // blue-400
            borderColor="border-blue-500/30"
          />
          <StatsCard
            title="RAM Usage"
            value={`${stats.ram_usage}%`}
            subValue={peaks?.ram_peak ? `${peaks.ram_peak.value}%` : undefined}
            icon={Zap}
            iconColor="#c084fc" // purple-400
            borderColor="border-purple-500/30"
          />
          <StatsCard
            title="Temperature"
            value={`${stats.cpu_temp}°C`}
            subValue={peaks?.temp_peak ? `${peaks.temp_peak.value}°C` : undefined}
            icon={Thermometer}
            iconColor="#f87171" // red-400
            borderColor="border-red-500/30"
          />
          <StatsCard
            title="Disk Usage"
            value={`${stats.disk_usage}%`}
            // Disk usually doesn't have a "peak" in the same way, maybe show used/total
            subValue={`${stats.disk_used_gb}/${stats.disk_total_gb} GB`}
            icon={HardDrive}
            iconColor="#facc15" // yellow-400
            borderColor="border-yellow-500/30"
          />
        </View>

        <View className="mt-4 mb-4">
          <Text className="text-white text-lg font-bold mb-4 ml-1">Network Traffic</Text>
          <View className="flex-row justify-between">
            <StatsCard
              title="Download"
              value={formatSpeed(stats.net_recv_speed)}
              subValue={peaks?.net_down_peak ? `${(peaks.net_down_peak.value / 1024).toFixed(1)} MB/s` : undefined}
              icon={ArrowDown}
              iconColor="#4ade80" // green-400
              borderColor="border-green-500/30"
            />
            <StatsCard
              title="Upload"
              value={formatSpeed(stats.net_sent_speed)}
              subValue={peaks?.net_up_peak ? `${(peaks.net_up_peak.value / 1024).toFixed(1)} MB/s` : undefined}
              icon={ArrowUp}
              iconColor="#60a5fa" // blue-400
              borderColor="border-blue-500/30"
            />
          </View>
        </View>

        <View className="items-center mt-4">
          <Text className="text-gray-600 text-xs">Connected to: 10.187.17.191</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
