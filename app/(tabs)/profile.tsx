import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, Card, Avatar, Chip } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/src/services/supabase';
import PromptCard from '@/components/PromptCard';

interface Prompt {
  id: string;
  user_id: string;
  prompt_text: string;
  image_url: string | null;
  likes_count: number;
  date_created: string;
}

interface ProfileData {
  credits: number;
  prompts_shared_count: number;
  is_premium: boolean;
  username: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userPrompts, setUserPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadUserProfile = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/auth/login');
        return;
      }

      setUser(user);

      // Profil bilgilerini çek
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits, prompts_shared_count, is_premium, username')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profil yükleme hatası:', profileError);
        return;
      }

      if (profile) {
        setProfileData({
          credits: profile.credits,
          prompts_shared_count: profile.prompts_shared_count,
          is_premium: profile.is_premium,
          username: profile.username,
        });
      }

      // Kullanıcının prompt'larını çek
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('date_created', { ascending: false });

      if (promptsError) {
        console.error('Prompt yükleme hatası:', promptsError);
      } else if (prompts) {
        setUserPrompts(prompts as Prompt[]);
      }

      // Favorileri yükle
      const { data: favorites } = await supabase
        .from('favorites')
        .select('prompt_id')
        .eq('user_id', user.id);

      if (favorites) {
        setFavoriteIds(new Set(favorites.map((fav) => fav.prompt_id)));
      }
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserProfile();
  }, [loadUserProfile]);

  const handleLike = async (promptId: string) => {
    const isLiked = favoriteIds.has(promptId);

    try {
      if (isLiked) {
        // Favoriden çıkar
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user?.id)
          .eq('prompt_id', promptId);

        if (!error) {
          setFavoriteIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(promptId);
            return newSet;
          });

          // Likes count'u azalt
          const prompt = userPrompts.find((p) => p.id === promptId);
          if (prompt) {
            const newLikesCount = Math.max(0, prompt.likes_count - 1);
            await supabase
              .from('prompts')
              .update({ likes_count: newLikesCount })
              .eq('id', promptId);

            setUserPrompts((prev) =>
              prev.map((p) => (p.id === promptId ? { ...p, likes_count: newLikesCount } : p))
            );
          }
        }
      } else {
        // Favoriye ekle
        const { error } = await supabase.from('favorites').insert({
          user_id: user?.id,
          prompt_id: promptId,
        });

        if (!error) {
          setFavoriteIds((prev) => new Set(prev).add(promptId));

          // Likes count'u artır
          const prompt = userPrompts.find((p) => p.id === promptId);
          if (prompt) {
            const newLikesCount = prompt.likes_count + 1;
            await supabase
              .from('prompts')
              .update({ likes_count: newLikesCount })
              .eq('id', promptId);

            setUserPrompts((prev) =>
              prev.map((p) => (p.id === promptId ? { ...p, likes_count: newLikesCount } : p))
            );
          }
        }
      }
    } catch (error) {
      console.error('Favorileme hatası:', error);
    }
  };

  if (loading) {
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={profileData?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
        />
        <Text variant="headlineSmall" style={styles.username}>
          {profileData?.username || 'Kullanıcı'}
        </Text>
        <Text variant="bodyMedium" style={styles.email}>
          {user?.email || ''}
        </Text>
        {profileData?.is_premium && (
          <Chip icon="star" style={styles.premiumChip} textStyle={styles.premiumChipText}>
            Premium Üye
          </Chip>
        )}
      </View>

      {/* İstatistikler */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            İstatistikler
          </Text>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Kredi:</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {profileData?.credits ?? 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Paylaşılan Prompt:</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {profileData?.prompts_shared_count ?? 0}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text variant="bodyLarge">Toplam Prompt:</Text>
            <Text variant="bodyLarge" style={styles.statValue}>
              {userPrompts.length}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Benim Prompt'larım */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Benim Prompt'larım
          </Text>
          {userPrompts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Henüz prompt paylaşmadınız
              </Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                "Oluştur" sekmesinden yeni prompt'lar oluşturabilirsiniz
              </Text>
            </View>
          ) : (
            <View style={styles.promptsContainer}>
              {userPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  id={prompt.id}
                  promptText={prompt.prompt_text}
                  imageUrl={prompt.image_url}
                  likesCount={prompt.likes_count}
                  dateCreated={prompt.date_created}
                  onLike={handleLike}
                  isLiked={favoriteIds.has(prompt.id)}
                />
              ))}
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  username: {
    marginTop: 15,
    fontWeight: 'bold',
  },
  email: {
    marginTop: 5,
    opacity: 0.7,
  },
  premiumChip: {
    marginTop: 12,
    backgroundColor: '#fff3e0',
  },
  premiumChipText: {
    color: '#f57c00',
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    marginTop: 10,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 4,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.7,
    marginBottom: 8,
  },
  emptyHint: {
    opacity: 0.5,
    textAlign: 'center',
  },
  promptsContainer: {
    marginTop: 8,
  },
});
