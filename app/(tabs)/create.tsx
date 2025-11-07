import { View, StyleSheet, Alert, ScrollView, Image, Platform } from 'react-native';
import { Text, Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/src/services/supabase';
import { generatePromptFromImage } from '@/src/services/geminiApi';

export default function CreateScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Kullanıcı profil bilgilerini yükle
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('credits, is_premium')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Profil yükleme hatası:', error);
        return;
      }

      if (data) {
        setUserCredits(data.credits);
        setIsPremium(data.is_premium);
      }
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const requestImagePickerPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'İzin Gerekli',
          'Görsel seçmek için galeri erişim izni gereklidir.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestImagePickerPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Görsel seçme hatası:', error);
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu.');
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestImagePickerPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Görsel Seç',
      'Görsel seçmek için bir yöntem seçin',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Galeriden Seç', onPress: pickImage },
        { text: 'Kamera ile Çek', onPress: takePhoto },
      ]
    );
  };

  const uploadImageToStorage = async (imageUri: string): Promise<string | null> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Dosya adı oluştur
      const fileExt = imageUri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `prompts/${fileName}`;

      // Görseli base64'e çevir veya doğrudan yükle
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Supabase Storage'a yükle
      const { data, error } = await supabase.storage
        .from('images') // Storage bucket adı - Supabase'de oluşturmanız gerekiyor
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (error) {
        console.error('Görsel yükleme hatası:', error);
        throw error;
      }

      // Public URL'i al
      const {
        data: { publicUrl },
      } = supabase.storage.from('images').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Storage yükleme hatası:', error);
      throw error;
    }
  };

  const deductCredits = async (userId: string): Promise<void> => {
    // Krediyi düşür
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: userCredits! - 10 })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Kredi düşürme hatası: ' + updateError.message);
    }

    // Transaction kaydı ekle
    const { error: transactionError } = await supabase.from('transactions').insert({
      user_id: userId,
      type: 'SPEND',
      credit_change: -10,
      metadata: { reason: 'prompt_generation' },
    });

    if (transactionError) {
      console.error('Transaction kayıt hatası:', transactionError);
      // Transaction hatası kritik değil, devam edebiliriz
    }

    setUserCredits((prev) => (prev !== null ? prev - 10 : null));
  };

  const handleGeneratePrompt = async () => {
    if (!image) {
      Alert.alert('Hata', 'Lütfen bir görsel seçin');
      return;
    }

    // Kredi kontrolü
    if (!isPremium && (userCredits === null || userCredits < 10)) {
      Alert.alert(
        'Yetersiz Kredi',
        'Prompt üretmek için en az 10 kredi gereklidir. Lütfen kredi satın alın veya abone olun.',
        [
          { text: 'Tamam', style: 'cancel' },
          {
            text: 'Kredi Satın Al',
            onPress: () => router.push('/(tabs)/settings'),
          },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
        router.replace('/auth/login');
        return;
      }

      // 1. Krediyi düşür (premium değilse)
      if (!isPremium) {
        await deductCredits(user.id);
      }

      // 2. Görseli Supabase Storage'a yükle
      let imageUrl: string | null = null;
      try {
        imageUrl = await uploadImageToStorage(image);
      } catch (error) {
        console.error('Görsel yükleme hatası:', error);
        // Görsel yüklenemezse devam et, sadece uyarı ver
        Alert.alert(
          'Uyarı',
          'Görsel yüklenemedi ancak prompt üretimi devam ediyor.'
        );
      }

      // 3. Gemini API'ye gönder ve prompt üret
      const generatedPrompt = await generatePromptFromImage(image, description || undefined);

      // 4. Prompts tablosuna kaydet
      const { error: insertError } = await supabase.from('prompts').insert({
        user_id: user.id,
        prompt_text: generatedPrompt,
        image_url: imageUrl,
        likes_count: 0,
      });

      if (insertError) {
        throw new Error('Prompt kayıt hatası: ' + insertError.message);
      }

      // 5. Sayaç güncelleme ve ödül kontrolü
      // Önce mevcut prompts_shared_count'u al
      const { data: currentProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('prompts_shared_count, credits')
        .eq('id', user.id)
        .single();

      if (profileFetchError) {
        console.error('Profil bilgisi alınamadı:', profileFetchError);
        // Kritik değil, devam et
      } else {
        const newCount = (currentProfile?.prompts_shared_count || 0) + 1;

        // prompts_shared_count'u 1 artır
        const { error: updateCountError } = await supabase
          .from('profiles')
          .update({ prompts_shared_count: newCount })
          .eq('id', user.id);

        if (updateCountError) {
          console.error('Sayaç güncelleme hatası:', updateCountError);
        }

        // Ödül kontrolü: Eğer yeni sayı 3'ün katıysa
        if (newCount > 0 && newCount % 3 === 0) {
          const newCredits = (currentProfile?.credits || 0) + 10;

          // Krediyi artır
          const { error: updateCreditsError } = await supabase
            .from('profiles')
            .update({ credits: newCredits })
            .eq('id', user.id);

          if (updateCreditsError) {
            console.error('Kredi güncelleme hatası:', updateCreditsError);
          } else {
            // Kullanıcı arayüzündeki kredi değerini güncelle
            setUserCredits(newCredits);

            // REWARD transaction kaydı ekle
            const { error: rewardTransactionError } = await supabase
              .from('transactions')
              .insert({
                user_id: user.id,
                type: 'REWARD',
                credit_change: 10,
                metadata: {
                  reason: 'share_reward',
                  prompts_shared: newCount,
                },
              });

            if (rewardTransactionError) {
              console.error('Ödül transaction kayıt hatası:', rewardTransactionError);
            }

            // Ödül mesajını göster
            Alert.alert(
              '🎉 Ödül Kazandınız!',
              `3 prompt paylaştığınız için 10 kredi kazandınız! Toplam krediniz: ${newCredits}`,
              [{ text: 'Harika!' }]
            );
          }
        }
      }

      // 6. Başarılı - galeriye yönlendir
      Alert.alert(
        'Başarılı!',
        'Prompt başarıyla oluşturuldu ve paylaşıldı!',
        [
          {
            text: 'Galeriye Git',
            onPress: () => {
              // Formu temizle
              setImage(null);
              setDescription('');
              router.push('/(tabs)/gallery');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Prompt üretme hatası:', error);
      Alert.alert('Hata', error.message || 'Prompt üretilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            Yeni Prompt Oluştur
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            Görsel yükleyin ve AI ile prompt üretin
          </Text>

          {/* Kredi Bilgisi */}
          <View style={styles.creditsInfo}>
            <Text variant="bodyLarge" style={styles.creditsText}>
              {isPremium ? (
                <Text style={styles.premiumText}>⭐ Premium Üye - Sınırsız Kullanım</Text>
              ) : (
                <>
                  Mevcut Kredi: <Text style={styles.creditsValue}>{userCredits ?? 0}</Text>
                </>
              )}
            </Text>
            <Text variant="bodySmall" style={styles.creditsHint}>
              {isPremium
                ? 'Abone olduğunuz için kredi harcanmayacak'
                : 'Her prompt üretimi 10 kredi harcar'}
            </Text>
          </View>

          {/* Görsel Seçme Alanı */}
          <View style={styles.imageSection}>
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <Button
                  mode="outlined"
                  onPress={() => setImage(null)}
                  style={styles.removeImageButton}
                  icon="close"
                >
                  Kaldır
                </Button>
              </View>
            ) : (
              <View style={styles.uploadArea}>
                <Text variant="bodyLarge" style={styles.uploadIcon}>
                  📷
                </Text>
                <Text variant="bodyMedium" style={styles.uploadText}>
                  Görsel Seçin
                </Text>
                <View style={styles.uploadButtons}>
                  <Button
                    mode="outlined"
                    onPress={pickImage}
                    icon="image"
                    style={styles.uploadButton}
                  >
                    Galeri
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={takePhoto}
                    icon="camera"
                    style={styles.uploadButton}
                  >
                    Kamera
                  </Button>
                </View>
              </View>
            )}
          </View>

          {/* Açıklama Alanı (İsteğe Bağlı) */}
          <TextInput
            label="Açıklama (İsteğe Bağlı)"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Prompt için ek bilgi veya açıklama ekleyin..."
            style={styles.descriptionInput}
          />

          {/* Prompt Üret Butonu */}
          <Button
            mode="contained"
            onPress={handleGeneratePrompt}
            loading={loading}
            disabled={loading || !image || (!isPremium && (userCredits === null || userCredits < 10))}
            style={styles.button}
            contentStyle={styles.buttonContent}
            icon="auto-fix"
          >
            {isPremium ? 'Prompt Üret (Ücretsiz)' : 'Prompt Üret (10 Kredi)'}
          </Button>

          {!isPremium && userCredits !== null && userCredits < 10 && (
            <Text variant="bodySmall" style={styles.warningText}>
              ⚠️ Yetersiz kredi. Lütfen kredi satın alın.
            </Text>
          )}
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
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  card: {
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    marginBottom: 20,
    opacity: 0.7,
  },
  creditsInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  creditsText: {
    fontWeight: 'bold',
  },
  creditsValue: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  premiumText: {
    color: '#f57c00',
    fontWeight: 'bold',
  },
  creditsHint: {
    marginTop: 4,
    opacity: 0.7,
  },
  imageSection: {
    marginBottom: 20,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    minHeight: 200,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadText: {
    marginBottom: 16,
    opacity: 0.7,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  descriptionInput: {
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  warningText: {
    marginTop: 8,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
