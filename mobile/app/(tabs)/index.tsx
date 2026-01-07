import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, RefreshControl, View, Text, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Cpu, Thermometer, HardDrive, ArrowDown, ArrowUp, Activity } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { getStats, getPeaks, getHistory } from '@/services/api';
import StatsCard from '@/components/StatsCard';

export default function DashboardScreen() {
    const [stats, setStats] = useState<any>(null);
    const [peaks, setPeaks] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        const [currentData, peaksData, historyData] = await Promise.all([
            getStats(),
            getPeaks(),
            getHistory()
        ]);
        if (currentData) setStats(currentData);
        if (peaksData) setPeaks(peaksData);
        if (historyData) setHistory(historyData);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 1000); // Poll every 1s for real-time feel
        return () => clearInterval(interval);
    }, []);

    if (!stats) {
        return (
            <View className="flex-1 bg-background justify-center items-center">
                <Activity size={48} color="#60a5fa" />
                <Text className="text-gray-400 mt-4">Connecting to LiquidMonitor...</Text>
            </View>
        );
    }

    // Format network speed
    const formatSpeed = (val: number | undefined | null) => {
        if (val === undefined || val === null) return '0.0 KB/s';
        if (val > 1024) return `${(val / 1024).toFixed(1)} MB/s`;
        return `${Number(val).toFixed(1)} KB/s`;
    };

    // Prepare Chart Data (Last 24h - Simplified)
    // Take last 6 points for readability on mobile
    const chartLabels = history.slice(-6).map((h: any) => {
        // Safe Date parsing for Android
        const dateStr = h.timestamp.endsWith('Z') ? h.timestamp : h.timestamp + 'Z';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "00:00"; // Fallback
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const cpuData = history.slice(-6).map((h: any) => parseFloat(h.cpu_usage) || 0); // Ensure number
    // const ramData = history.slice(-6).map((h: any) => h.ram_usage);

    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar barStyle="light-content" />
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
            >
                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-3xl font-bold text-white">LiquidMonitor</Text>
                    <View className="flex-row items-center bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                        <View className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <Text className="text-green-400 text-xs font-bold tracking-wider">CANLI</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="flex-row flex-wrap justify-between">
                    <StatsCard
                        title="CPU Usage"
                        value={`${stats.cpu_usage}%`}
                        subValue={peaks?.cpu_peak ? `${peaks.cpu_peak.value}%` : undefined}
                        timestamp={peaks?.cpu_peak ? peaks.cpu_peak.timestamp : undefined}
                        icon={Cpu}
                        iconColor="#60a5fa"
                        borderColor="border-blue-500/30"
                    />
                    <StatsCard
                        title="RAM Usage"
                        value={`${stats.ram_usage}%`}
                        subValue={peaks?.ram_peak ? `${peaks.ram_peak.value}%` : undefined}
                        timestamp={peaks?.ram_peak ? peaks.ram_peak.timestamp : undefined}
                        icon={Zap}
                        iconColor="#c084fc"
                        borderColor="border-purple-500/30"
                    />
                    <StatsCard
                        title="Temperature"
                        value={`${stats.cpu_temp}°C`}
                        subValue={peaks?.temp_peak ? `${peaks.temp_peak.value}°C` : undefined}
                        timestamp={peaks?.temp_peak ? peaks.temp_peak.timestamp : undefined}
                        icon={Thermometer}
                        iconColor="#f87171"
                        borderColor="border-red-500/30"
                    />
                    <StatsCard
                        title="Disk Usage"
                        value={`${stats.disk_usage}%`}
                        subValue={`${stats.disk_used_gb}/${stats.disk_total_gb} GB`}
                        icon={HardDrive}
                        iconColor="#facc15"
                        borderColor="border-yellow-500/30"
                    />
                </View>

                {/* Network Section */}
                <View className="mt-4 mb-6">
                    <Text className="text-white text-lg font-bold mb-4 ml-1">Network Traffic</Text>
                    <View className="flex-row justify-between">
                        <StatsCard
                            title="Download"
                            value={formatSpeed(stats.net_recv_speed)}
                            subValue={peaks?.net_down_peak ? `${(peaks.net_down_peak.value / 1024).toFixed(1)} MB/s` : undefined}
                            timestamp={peaks?.net_down_peak ? peaks.net_down_peak.timestamp : undefined}
                            icon={ArrowDown}
                            iconColor="#4ade80"
                            borderColor="border-green-500/30"
                        />
                        <StatsCard
                            title="Upload"
                            value={formatSpeed(stats.net_sent_speed)}
                            subValue={peaks?.net_up_peak ? `${(peaks.net_up_peak.value / 1024).toFixed(1)} MB/s` : undefined}
                            timestamp={peaks?.net_up_peak ? peaks.net_up_peak.timestamp : undefined}
                            icon={ArrowUp}
                            iconColor="#60a5fa"
                            borderColor="border-blue-500/30"
                        />
                    </View>
                    {/* 24h Totals */}
                    <View className="flex-row justify-between mt-2 px-2">
                        <Text className="text-gray-500 text-xs">Total Down (24h): <Text className="text-green-400 font-mono">{peaks?.net_total_down ? ((peaks.net_total_down * 5) / (1024 * 1024)).toFixed(2) : '0.00'} GB</Text></Text>
                        <Text className="text-gray-500 text-xs">Total Up (24h): <Text className="text-blue-400 font-mono">{peaks?.net_total_up ? ((peaks.net_total_up * 5) / (1024 * 1024)).toFixed(2) : '0.00'} GB</Text></Text>
                    </View>
                </View>

                {/* History Chart */}
                {history.length > 0 && (
                    <View className="mb-6 bg-glass border border-glassBorder rounded-2xl p-4">
                        <Text className="text-white text-lg font-bold mb-4">CPU History (Last 24h)</Text>
                        <LineChart
                            data={{
                                labels: chartLabels,
                                datasets: [
                                    {
                                        data: cpuData
                                    }
                                ]
                            }}
                            width={Dimensions.get("window").width - 64} // from react-native
                            height={220}
                            yAxisSuffix="%"
                            yAxisInterval={1} // optional, defaults to 1
                            chartConfig={{
                                backgroundColor: "transparent",
                                backgroundGradientFrom: "#1e1e1e", // transparent hack usually via opacity
                                backgroundGradientFromOpacity: 0,
                                backgroundGradientTo: "#1e1e1e",
                                backgroundGradientToOpacity: 0,
                                decimalPlaces: 0, // optional, defaults to 2dp
                                color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                style: {
                                    borderRadius: 16
                                },
                                propsForDots: {
                                    r: "4",
                                    strokeWidth: "2",
                                    stroke: "#60a5fa"
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                        />
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}
