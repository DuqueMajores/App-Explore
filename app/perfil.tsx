import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "./AuthContext";
import { router } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair da sua conta?",
      [
        { 
          text: "Cancelar", 
          style: "cancel" 
        },
        { 
          text: "Sair", 
          style: "destructive", 
          onPress: async () => {
            try {
              await signOut();
              Alert.alert("Logout", "Você saiu da sua conta com sucesso."); 
              router.replace("/login");
            } catch (error: any) {
              Alert.alert("Erro", error.message || "Erro ao fazer logout");
            }
          } 
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.containerCenter}>
        <MaterialIcons name="lock" size={60} color="#DDD" />
        <Text style={styles.notLoggedText}>Você não está logado.</Text>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push("/login")}
        >
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
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <MaterialIcons name="verified-user" size={24} color="#4169E1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>Conta Ativa</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="calendar-today" size={24} color="#4169E1" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Membro desde</Text>
            <Text style={styles.infoValue}>
              {new Date().toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
        <MaterialIcons name="logout" size={22} color="#E63946" />
        <Text style={styles.logoutText}>Sair da Conta</Text>
        <MaterialIcons name="chevron-right" size={22} color="#E63946" />
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Versão 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  containerCenter: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: "#F8F9FA",
  },
  header: { 
    paddingTop: 50, 
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: { 
    padding: 8,
  },
  profileSection: { 
    alignItems: "center", 
    padding: 40, 
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 20,
    elevation: 2,
  },
  avatarLarge: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: "#4169E1", 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: { 
    color: '#FFF', 
    fontSize: 40, 
    fontWeight: 'bold' 
  },
  userName: { 
    fontSize: 24, 
    fontWeight: "800", 
    color: "#212529",
    marginBottom: 4,
  },
  userEmail: { 
    color: "#666", 
    fontSize: 14,
    marginBottom: 4,
  },
  notLoggedText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: "#4169E1",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  loginButtonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212529",
  },
  logoutItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    elevation: 1,
  },
  logoutText: { 
    marginLeft: 15, 
    fontSize: 16, 
    color: "#E63946", 
    fontWeight: 'bold',
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
