import React from 'react';
import { View, Text } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface StatsCardProps {
    title: string;
    value: string;
    subValue?: string; // e.g. Peak
    icon?: LucideIcon;
    iconColor?: string;
    borderColor?: string;
}

export default function StatsCard({ title, value, subValue, icon: Icon, iconColor = '#60a5fa', borderColor = 'border-blue-500/20' }: StatsCardProps) {
    return (
        <View className={`w-[48%] mb-4 p-4 rounded-2xl border ${borderColor} bg-glass active:opacity-90`}>
            <View className="flex-row justify-between items-start mb-2">
                <Text className="text-gray-400 text-xs font-medium uppercase tracking-wider">{title}</Text>
                {Icon && (
                    <View className="bg-white/5 p-1.5 rounded-lg">
                        <Icon size={16} color={iconColor} />
                    </View>
                )}
            </View>

            <Text className="text-white text-lg font-bold mb-1 shadow-sm">{value}</Text>

            {subValue && (
                <View className="flex-row items-center border-t border-white/10 pt-2 mt-1">
                    <Text className="text-gray-500 text-[10px]">Pik: </Text>
                    <Text className="text-gray-300 text-[10px] font-mono">{subValue}</Text>
                </View>
            )}
        </View>
    );
}
