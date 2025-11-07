import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Switch, List, Button, Divider } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { logout } from '@/src/services/supabase';
import { useColorScheme } from '@/components/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme_preference';

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Kaydedilmiş tema tercihini yükle
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Tema tercihi yüklenirken hata:', error);
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'dark' : 'light');
      // Tema değişikliği için uygulamayı yeniden başlatmak gerekebilir
      // Şimdilik sadece state'i güncelliyoruz
      Alert.alert(
        'Tema Değiştirildi',
        'Tema değişikliğinin tam olarak uygulanması için uygulamayı yeniden başlatmanız gerekebilir.',
        [{ text: 'Tamam' }]
      );
    } catch (error) {
      console.error('Tema tercihi kaydedilirken hata:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await logout();
              router.replace('/auth/login');
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Çıkış yapılırken bir hata oluştu.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Görünüm Ayarları */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Görünüm
          </Text>
          <List.Item
            title="Koyu Tema"
            description="Uygulamanın görünümünü değiştir"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch value={isDarkMode} onValueChange={handleThemeToggle} disabled={loading} />
            )}
          />
        </Card.Content>
      </Card>

      {/* Dil Ayarları */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Dil
          </Text>
          <List.Item
            title="Türkçe"
            description="Uygulama dili"
            left={(props) => <List.Icon {...props} icon="translate" />}
            right={(props) => <List.Icon {...props} icon="check" />}
            onPress={() => {
              Alert.alert('Bilgi', 'Dil seçimi özelliği yakında eklenecek');
            }}
          />
        </Card.Content>
      </Card>

      {/* Abonelik ve Ödeme */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Abonelik ve Ödeme
          </Text>
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert('Bilgi', 'Kredi satın alma özelliği yakında eklenecek');
            }}
            style={styles.button}
            icon="credit-card"
          >
            Kredi Satın Al
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert('Bilgi', 'Abonelik yönetimi yakında eklenecek');
            }}
            style={styles.button}
            icon="star"
          >
            Abonelik Yönetimi
          </Button>
        </Card.Content>
      </Card>

      {/* Hakkında */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Hakkında
          </Text>
          <List.Item
            title="Versiyon"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <Divider style={styles.divider} />
          <List.Item
            title="Yardım ve Destek"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              Alert.alert('Bilgi', 'Yardım ve destek özelliği yakında eklenecek');
            }}
          />
        </Card.Content>
      </Card>

      {/* Çıkış Yap */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            buttonColor="#d32f2f"
            onPress={handleLogout}
            loading={loading}
            disabled={loading}
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            icon="logout"
          >
            Çıkış Yap
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginTop: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
  divider: {
    marginVertical: 8,
  },
  logoutButton: {
    marginTop: 10,
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
});
