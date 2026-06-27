import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useIntercom } from "@/context/IntercomContext";
import colors from "@/constants/colors";

const C = colors.dark;

export default function IndexScreen() {
  const { isLoading, partner } = useIntercom();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  if (partner) {
    return <Redirect href="/main" />;
  }

  return <Redirect href="/pair" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
