import { useState } from 'react';
import { View, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/src/services/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    // Validasyonlar
    if (!email || !password || !confirmPassword || !username) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Lütfen geçerli bir email adresi giriniz');
      return;
    }

    // Username kontrolü (en az 3 karakter)
    if (username.trim().length < 3) {
      Alert.alert('Hata', 'Kullanıcı adı en az 3 karakter olmalıdır');
      return;
    }

    // Şifre kontrolü
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);

    try {
      // 1. Kullanıcıyı Supabase Auth'a kaydet
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setLoading(false);
        Alert.alert('Kayıt Hatası', authError.message);
        return;
      }

      if (!authData.user) {
        setLoading(false);
        Alert.alert('Hata', 'Kullanıcı oluşturulamadı');
        return;
      }

      // 2. Profiles tablosuna kullanıcıyı 50 kredi ile ekle
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username.trim(),
          credits: 50, // Başlangıç kredisi
          prompts_shared_count: 0,
          is_premium: false,
        });

      if (profileError) {
        // Profil oluşturma hatası - kullanıcıyı bilgilendir
        console.error('Profil oluşturma hatası:', profileError);
        // Auth kullanıcısını sil (opsiyonel - Supabase'de cascade delete varsa gerekmez)
        Alert.alert(
          'Uyarı',
          'Hesap oluşturuldu ancak profil kaydı tamamlanamadı. Lütfen giriş yapıp tekrar deneyin.'
        );
        setLoading(false);
        router.replace('/auth/login');
        return;
      }

      setLoading(false);

      // 3. Başarılı kayıt - kullanıcıyı gallery'e yönlendir
      Alert.alert(
        'Başarılı!',
        'Kayıt başarılı! 50 kredi ile başlıyorsunuz. Hoş geldiniz!',
        [
          {
            text: 'Tamam',
            onPress: () => {
              // Session varsa direkt gallery'e yönlendir
              if (authData.session) {
                router.replace('/(tabs)/gallery');
              } else {
                // Email doğrulama gerekliyse login'e yönlendir
                Alert.alert(
                  'Email Doğrulama',
                  'Email doğrulama linki gönderildi. Lütfen email adresinizi kontrol edin.',
                  [
                    {
                      text: 'Tamam',
                      onPress: () => router.replace('/auth/login'),
                    },
                  ]
                );
              }
            },
          },
        ]
      );
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Hata', error.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Kayıt Ol
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Yeni hesap oluşturun ve 50 kredi kazanın!
          </Text>

          <TextInput
            label="Kullanıcı Adı"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            autoCapitalize="none"
            autoComplete="username"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="newPassword"
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <TextInput
            label="Şifre Tekrar"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="password"
            textContentType="newPassword"
            style={styles.input}
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Kayıt Ol
          </Button>

          <View style={styles.linkContainer}>
            <Text variant="bodyMedium" style={styles.linkText}>
              Zaten hesabınız var mı?{' '}
            </Text>
            <Button
              mode="text"
              onPress={() => router.push('/auth/login')}
              style={styles.linkButton}
              compact
            >
              Giriş Yapın
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    opacity: 0.7,
  },
  linkButton: {
    marginLeft: -10,
  },
});

