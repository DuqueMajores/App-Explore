import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "./AuthContext";
import { router } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Tem certeza que deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sair", 
          style: "destructive", 
          onPress: async () => {
            await signOut();
            router.replace("/");
          } 
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.containerCenter}>
        <MaterialIcons name="account-circle" size={80} color="#DDD" />
        <Text style={styles.message}>Você não está logado.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/login")}>
          <Text style={styles.loginButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Configurações</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="bookmark" size={22} color="#4169E1" />
          <Text style={styles.menuItemText}>Notícias Salvas</Text>
          <MaterialIcons name="chevron-right" size={22} color="#CCC" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <MaterialIcons name="notifications" size={22} color="#4169E1" />
          <Text style={styles.menuItemText}>Notificações</Text>
          <MaterialIcons name="chevron-right" size={22} color="#CCC" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <MaterialIcons name="logout" size={22} color="#E63946" />
          <Text style={[styles.menuItemText, { color: "#E63946" }]}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 20 },
  header: { alignItems: "center", padding: 40, backgroundColor: "#F8F9FA", paddingTop: 60 },
  backButton: { position: 'absolute', top: 50, left: 20 },
  avatarLarge: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: "#4169E1", 
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  avatarText: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: "800", color: '#1A1A1A' },
  userEmail: { color: "#666", fontSize: 16, marginTop: 5 },
  menuSection: { padding: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 15 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15 
  },
  menuItemText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#444' },
  divider: { height: 1, backgroundColor: "#F0F0F0" },
  message: { fontSize: 18, color: '#666', marginTop: 20, marginBottom: 30 },
  loginButton: { backgroundColor: '#4169E1', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 12 },
  loginButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
