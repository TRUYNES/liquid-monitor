import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Server, ArrowRight } from 'lucide-react-native';
import { setApiBaseUrl } from '@/services/api';

export default function ConnectScreen() {
    const [url, setUrl] = useState('https://');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleConnect = async () => {
        if (!url.startsWith('http')) {
            Alert.alert('Geçersiz URL', 'Lütfen http:// veya https:// ile başlayan bir adres girin.');
            return;
        }

        setLoading(true);
        try {
            // Save URL
            await AsyncStorage.setItem('server_url', url);
            // Update API instance
            setApiBaseUrl(url);

            // Navigate to dashboard
            router.replace('/(tabs)');
        } catch (error) {
            Alert.alert('Hata', 'Ayarlar kaydedilemedi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background justify-center px-6">
            <StatusBar barStyle="light-content" />

            <View className="items-center mb-10">
                <View className="w-20 h-20 bg-blue-500/20 rounded-full items-center justify-center mb-4 border border-blue-500/30 shadow-lg shadow-blue-500/20">
                    <Server size={40} color="#60a5fa" />
                </View>
                <Text className="text-3xl font-bold text-white mb-2">LiquidMonitor</Text>
                <Text className="text-gray-400 text-center">İzlemek istediğiniz sunucu adresini girin.</Text>
            </View>

            <View className="bg-glass border border-glassBorder rounded-2xl p-4 mb-6">
                <Text className="text-gray-400 text-xs uppercase mb-2 ml-1">Sunucu Adresi (URL)</Text>
                <TextInput
                    className="bg-white/5 text-white p-4 rounded-xl border border-white/10 text-lg"
                    placeholder="https://example.com"
                    placeholderTextColor="#666"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                />
            </View>

            <TouchableOpacity
                onPress={handleConnect}
                disabled={loading}
                className={`flex-row items-center justify-center p-4 rounded-xl ${loading ? 'bg-blue-500/50' : 'bg-blue-600 active:bg-blue-700'}`}
            >
                <Text className="text-white font-bold text-lg mr-2">
                    {loading ? 'Bağlanıyor...' : 'Bağlan'}
                </Text>
                {!loading && <ArrowRight size={20} color="#fff" />}
            </TouchableOpacity>

        </SafeAreaView>
    );
}
