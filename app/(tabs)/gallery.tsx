import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, Menu, Button, Chip } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/services/supabase';
import PromptCard from '@/components/PromptCard';

type SortOption = 'newest' | 'popular';

interface Prompt {
  id: string;
  user_id: string;
  prompt_text: string;
  image_url: string | null;
  likes_count: number;
  date_created: string;
}

export default function GalleryScreen() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [menuVisible, setMenuVisible] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Favorileri yükle
  const loadFavorites = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('favorites')
      .select('prompt_id')
      .eq('user_id', user.id);

    if (data) {
      setFavoriteIds(new Set(data.map((fav) => fav.prompt_id)));
    }
  }, []);

  // Prompt'ları yükle
  const loadPrompts = useCallback(async () => {
    try {
      let query = supabase
        .from('prompts')
        .select('*')
        .order('date_created', { ascending: false });

      // Sıralama seçeneğine göre sorguyu ayarla
      if (sortBy === 'popular') {
        query = supabase
          .from('prompts')
          .select('*')
          .order('likes_count', { ascending: false });
      } else {
        query = supabase
          .from('prompts')
          .select('*')
          .order('date_created', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Prompt yükleme hatası:', error);
        return;
      }

      if (data) {
        setPrompts(data as Prompt[]);
      }
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sortBy]);

  useEffect(() => {
    loadPrompts();
    loadFavorites();
  }, [loadPrompts, loadFavorites]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPrompts();
    loadFavorites();
  }, [loadPrompts, loadFavorites]);

  const handleLike = async (promptId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Kullanıcı giriş yapmamış, favorileme yapamaz
      return;
    }

    const isLiked = favoriteIds.has(promptId);

    if (isLiked) {
      // Favoriden çıkar
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('prompt_id', promptId);

      if (!error) {
        setFavoriteIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(promptId);
          return newSet;
        });

        // Likes count'u azalt
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          const newLikesCount = Math.max(0, prompt.likes_count - 1);
          await supabase
            .from('prompts')
            .update({ likes_count: newLikesCount })
            .eq('id', promptId);

          setPrompts((prev) =>
            prev.map((p) => (p.id === promptId ? { ...p, likes_count: newLikesCount } : p))
          );
        }
      }
    } else {
      // Favoriye ekle
      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        prompt_id: promptId,
      });

      if (!error) {
        setFavoriteIds((prev) => new Set(prev).add(promptId));

        // Likes count'u artır
        const prompt = prompts.find((p) => p.id === promptId);
        if (prompt) {
          const newLikesCount = prompt.likes_count + 1;
          await supabase
            .from('prompts')
            .update({ likes_count: newLikesCount })
            .eq('id', promptId);

          setPrompts((prev) =>
            prev.map((p) => (p.id === promptId ? { ...p, likes_count: newLikesCount } : p))
          );
        }
      }
    }
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'newest':
        return 'En Yeni';
      case 'popular':
        return 'En Popüler';
      default:
        return 'En Yeni';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Prompt'lar yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header ve Sıralama */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text variant="headlineSmall" style={styles.title}>
            Prompt Galerisi
          </Text>
        </View>
        <View style={styles.sortContainer}>
          <Text variant="bodyMedium" style={styles.sortLabel}>
            Sırala:
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Chip
                icon="sort"
                onPress={() => setMenuVisible(true)}
                style={styles.sortChip}
                textStyle={styles.sortChipText}
              >
                {getSortLabel(sortBy)}
              </Chip>
            }
          >
            <Menu.Item
              onPress={() => {
                setSortBy('newest');
                setMenuVisible(false);
              }}
              title="En Yeni"
              leadingIcon={sortBy === 'newest' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => {
                setSortBy('popular');
                setMenuVisible(false);
              }}
              title="En Popüler"
              leadingIcon={sortBy === 'popular' ? 'check' : undefined}
            />
          </Menu>
        </View>
      </View>

      {/* Prompt Listesi */}
      {prompts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Henüz prompt yok
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            İlk prompt'u oluşturmak için "Oluştur" sekmesine gidin
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {prompts.map((prompt) => (
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
        </ScrollView>
      )}
    </View>
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
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    opacity: 0.7,
  },
  sortChip: {
    backgroundColor: '#e3f2fd',
  },
  sortChipText: {
    color: '#1976d2',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginBottom: 8,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.5,
  },
});
