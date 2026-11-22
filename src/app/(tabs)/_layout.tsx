import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Home, MessageCircle, User } from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { colors, font } from '@/lib/theme';

export default function TabsLayout() {
  const { status } = useAuth();
  if (status === 'signedOut') return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.blue,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
      tabBarStyle: { borderTopColor: colors.border, backgroundColor: '#fff', height: undefined },
    }}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats', tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
