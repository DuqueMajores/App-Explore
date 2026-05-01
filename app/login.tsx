import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
      }
      router.replace("/");
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>{isLogin ? "Bem-vindo de volta" : "Crie sua conta"}</Text>
      <Text style={styles.subtitle}>
        {isLogin ? "Faça login para acessar seu perfil" : "Cadastre-se para salvar suas notícias favoritas"}
      </Text>
      
      {!isLogin && (
        <View style={styles.inputContainer}>
          <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Nome Completo" 
            value={name}
            onChangeText={setName}
          />
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="email" size={20} color="#999" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="E-mail" 
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={20} color="#999" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Senha" 
          value={password}
          onChangeText={setPassword}
          secureTextEntry 
        />
      </View>
      
      <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? "Entrar" : "Cadastrar"}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={() => setIsLogin(!isLogin)}
      >
        <Text style={styles.switchText}>
          {isLogin ? "Não tem uma conta? " : "Já tem uma conta? "}
          <Text style={styles.switchTextBold}>{isLogin ? "Cadastre-se" : "Faça login"}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "#F8F9FA" },
  backButton: { position: 'absolute', top: 50, left: 20, padding: 10 },
  title: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFF", 
    borderRadius: 12, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EEE",
    paddingHorizontal: 15
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16 },
  authButton: { 
    backgroundColor: "#4169E1", 
    padding: 18, 
    borderRadius: 12, 
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#4169E1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  buttonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  switchButton: { marginTop: 25, alignItems: "center" },
  switchText: { color: "#666", fontSize: 15 },
  switchTextBold: { color: "#4169E1", fontWeight: "700" }
});
