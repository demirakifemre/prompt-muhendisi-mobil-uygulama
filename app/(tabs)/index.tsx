import { Redirect } from 'expo-router';

// Bu dosya sadece gallery'e yönlendirme yapar
export default function IndexScreen() {
  return <Redirect href="/(tabs)/gallery" />;
}
