import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getContainers } from '@/services/api';
import { Activity } from 'lucide-react-native';

export default function ServicesScreen() {
  const [containers, setContainers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchContainers = async () => {
    const data = await getContainers();
    // Sort by CPU usage desc (like web)
    if (data && Array.isArray(data)) {
      data.sort((a, b) => b.cpu_percent - a.cpu_percent);
      setContainers(data);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchContainers();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchContainers();
    const interval = setInterval(fetchContainers, 3000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-glass border border-glassBorder p-4 mb-3 rounded-2xl">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-white font-bold text-lg">{item.name}</Text>
        <View className={`px-2 py-1 rounded-full ${item.state === 'running' ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-500/20'}`}>
          <Text className={`text-xs ${item.state === 'running' ? 'text-green-400' : 'text-gray-400'}`}>{item.state}</Text>
        </View>
      </View>

      <View className="flex-row mt-2 space-x-4">
        <View className="flex-1">
          <Text className="text-gray-500 text-xs uppercase">CPU</Text>
          <Text className="text-blue-400 font-mono">{item.cpu_percent.toFixed(1)}%</Text>
        </View>
        <View className="flex-1">
          <Text className="text-gray-500 text-xs uppercase">RAM</Text>
          <Text className="text-purple-400 font-mono">{item.memory_percent.toFixed(1)}%</Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-gray-500 text-xs uppercase">Net I/O</Text>
          <Text className="text-green-400 font-mono text-xs">↓ {(item.net_rx_speed || 0).toFixed(1)} KB/s</Text>
          <Text className="text-blue-400 font-mono text-xs">↑ {(item.net_tx_speed || 0).toFixed(1)} KB/s</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      <View className="px-4 py-2">
        <Text className="text-2xl font-bold text-white mb-4">Active Services</Text>
      </View>
      {containers.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Activity color="#60a5fa" />
          <Text className="text-gray-500 mt-2">Loading services...</Text>
        </View>
      ) : (
        <FlatList
          data={containers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        />
      )}
    </SafeAreaView>
  );
}
