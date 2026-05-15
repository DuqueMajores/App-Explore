import React, { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

type Route = "index" | "perfil" | "rede" | "galeria" | "forum";

interface FloatingMenuProps {
  currentRoute?: Route;
}

const MENU_ITEMS: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: Route;
}[] = [
  { label: "Início",     icon: "home",            route: "index"  },
  { label: "Meu Perfil", icon: "account-circle",  route: "perfil" },
  { label: "Rede",       icon: "groups",          route: "rede"   },
  { label: "Galerias",   icon: "photo-library",   route: "galeria"},
  { label: "Fórum",      icon: "forum",           route: "forum"  },
];

export default function FloatingMenu({ currentRoute }: FloatingMenuProps) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    setOpen(!open);
    Animated.spring(anim, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  const close = () => {
    setOpen(false);
    Animated.spring(anim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  const navigate = (route: Route) => {
    close();
    if (route === currentRoute) return;
    if (route === "index") {
      router.replace("/");
    } else {
      router.push(`/${route}` as any);
    }
  };

  return (
    <>
      {/* Overlay fecha ao tocar fora */}
      {open && (
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Menu expandido */}
      <Animated.View
        pointerEvents={open ? "auto" : "none"}
        style={[
          styles.expandedMenu,
          {
            opacity: anim,
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {MENU_ITEMS.map((item, idx) => {
          const isCurrent = item.route === currentRoute;
          const isLast = idx === MENU_ITEMS.length - 1;
          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuOption,
                isLast && styles.menuOptionLast,
                isCurrent && styles.menuOptionActive,
              ]}
              onPress={() => navigate(item.route)}
              activeOpacity={isCurrent ? 1 : 0.7}
            >
              <MaterialIcons
                name={item.icon}
                size={22}
                color={isCurrent ? "#4169E1" : "#555"}
              />
              <Text
                style={[
                  styles.menuOptionText,
                  isCurrent && styles.menuOptionTextActive,
                ]}
              >
                {item.label}
              </Text>
              {isCurrent && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Botão flutuante */}
      <TouchableOpacity
        style={styles.fab}
        onPress={toggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons
          name={open ? "close" : "menu"}
          size={22}
          color="#4169E1"
        />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 18,
  },
  expandedMenu: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 8,
    zIndex: 20,
    width: 210,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 12,
    borderRadius: 10,
  },
  menuOptionLast: {
    borderBottomWidth: 0,
  },
  menuOptionActive: {
    backgroundColor: "#EEF2FF",
  },
  menuOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  menuOptionTextActive: {
    color: "#4169E1",
    fontWeight: "700",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4169E1",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(65,105,225,0.25)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    zIndex: 20,
    shadowColor: "#4169E1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
});
