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
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAuth = async () => {
    // Limpar mensagem de erro anterior
    setErrorMessage("");

    // Validações básicas
    if (!email || !password || (!isLogin && !name)) {
      const msg = "Por favor, preencha todos os campos.";
      setErrorMessage(msg);
      Alert.alert("Campos Obrigatórios", msg);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        Alert.alert("Sucesso", "Bem-vindo! Você está entrando...");
      } else {
        await signUp(name, email, password); 
        Alert.alert("Sucesso", "Conta criada com sucesso! Bem-vindo!");
      }
      // Aguardar um pouco antes de navegar para melhor UX
      setTimeout(() => {
        router.replace("/");
      }, 500);
    } catch (error: any) {
      const errorMsg = error.message || "Erro desconhecido na autenticação";
      setErrorMessage(errorMsg);
      Alert.alert("Erro na Autenticação", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage("");
    setName("");
    setEmail("");
    setPassword("");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>{isLogin ? "Bem-vindo" : "Criar Conta"}</Text>
      <Text style={styles.subtitle}>
        {isLogin 
          ? "Entre com sua conta para continuar" 
          : "Crie uma nova conta para começar"}
      </Text>

      {errorMessage && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#E63946" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}
      
      {!isLogin && (
        <View style={styles.inputContainer}>
          <MaterialIcons name="person" size={20} color="#999" style={styles.inputIcon} />
          <TextInput 
            style={styles.input} 
            placeholder="Nome completo" 
            value={name} 
            onChangeText={setName}
            editable={!loading}
            placeholderTextColor="#CCC"
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
          editable={!loading}
          placeholderTextColor="#CCC"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={20} color="#999" style={styles.inputIcon} />
        <TextInput 
          style={styles.input} 
          placeholder="Senha (mín. 6 caracteres)" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry={!showPassword}
          editable={!loading}
          placeholderTextColor="#CCC"
        />
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          disabled={loading}
        >
          <MaterialIcons 
            name={showPassword ? "visibility" : "visibility-off"} 
            size={20} 
            color="#999" 
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.passwordHint}>
        A senha deve ter no mínimo 6 caracteres
      </Text>
      
      <TouchableOpacity 
        style={[styles.authButton, loading && styles.authButtonDisabled]} 
        onPress={handleAuth} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>
            {isLogin ? "Entrar" : "Cadastrar"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={toggleAuthMode}
        disabled={loading}
      >
        <Text style={styles.switchText}>
          {isLogin ? "Não tem conta? Criar conta" : "Já tem conta? Fazer login"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    padding: 30, 
    backgroundColor: "#F8F9FA" 
  },
  backButton: { 
    position: 'absolute', 
    top: 50, 
    left: 20,
    padding: 8,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "800", 
    marginBottom: 8,
    color: "#212529",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#E63946",
  },
  errorText: {
    color: "#E63946",
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  inputContainer: { 
    backgroundColor: "#FFF", 
    borderRadius: 12, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: "#EEE", 
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  passwordHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
    marginLeft: 5,
  },
  authButton: { 
    backgroundColor: "#4169E1", 
    padding: 18, 
    borderRadius: 12, 
    alignItems: "center",
    marginBottom: 15,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  buttonText: { 
    color: "#FFF", 
    fontWeight: "700",
    fontSize: 16,
  },
  switchButton: { 
    marginTop: 10, 
    alignItems: "center",
    padding: 10,
  },
  switchText: { 
    color: "#4169E1", 
    fontWeight: "700",
    fontSize: 14,
  }
});
