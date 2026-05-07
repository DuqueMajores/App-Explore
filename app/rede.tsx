import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function RedeScreen() {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        (async () => {
            const raw = await AsyncStorage.getItem('@App:users');
            setUsers(raw ? JSON.parse(raw) : []);
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter((u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        );
    }, [users, search]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Rede</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color="#999" />
                <TextInput
                    style={styles.input}
                    placeholder="Pesquisar usuários..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.email}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => router.push({ pathname: '/perfil', params: { viewUserEmail: item.email } })}
                    >
                        <MaterialIcons name="account-circle" size={42} color="#4169E1" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.email}>{item.email}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#F8F9FA', padding:16 },
  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  title:{ fontSize:22, fontWeight:'700' },
  searchBox:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF', borderRadius:12, paddingHorizontal:12, marginBottom:16 },
  input:{ flex:1, padding:12 },
  card:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF', padding:14, borderRadius:14, marginBottom:10 },
  name:{ fontSize:16, fontWeight:'700' },
  email:{ fontSize:13, color:'#666', marginTop:2 }
});
