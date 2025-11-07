import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase URL ve Anon Key'i environment variables'dan al
// .env dosyasındaki değerler process.env üzerinden okunur
// Not: .env dosyasını kullanmak için babel-plugin-inline-dotenv paketini yükleyip
// babel.config.js'e eklemeniz gerekebilir. Alternatif olarak değerleri doğrudan buraya yazabilirsiniz.
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL veya Anon Key bulunamadı. Lütfen .env dosyasını kontrol edin veya app.json\'da extra field kullanın.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Kullanıcıyı çıkış yapar
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error('Çıkış yapılırken bir hata oluştu: ' + error.message);
  }
}

/**
 * Bir prompt'u favorilere ekler
 * @param promptId - Favorilenecek prompt'un ID'si
 * @returns Başarılı olup olmadığı
 */
export async function addToFavorites(promptId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    // Önce favori olup olmadığını kontrol et
    const { data: existing } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('prompt_id', promptId)
      .single();

    if (existing) {
      // Zaten favoride, hata verme, sadece true dön
      return true;
    }

    // Favorilere ekle
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      prompt_id: promptId,
    });

    if (error) {
      throw new Error('Favorilere eklenirken hata oluştu: ' + error.message);
    }

    return true;
  } catch (error: any) {
    console.error('Favori ekleme hatası:', error);
    throw error;
  }
}

/**
 * Bir prompt'u favorilerden çıkarır
 * @param promptId - Favorilerden çıkarılacak prompt'un ID'si
 * @returns Başarılı olup olmadığı
 */
export async function removeFromFavorites(promptId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Giriş yapmanız gerekiyor');
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('prompt_id', promptId);

    if (error) {
      throw new Error('Favorilerden çıkarılırken hata oluştu: ' + error.message);
    }

    return true;
  } catch (error: any) {
    console.error('Favori çıkarma hatası:', error);
    throw error;
  }
}

/**
 * Kullanıcının favori prompt ID'lerini getirir
 * @returns Favori prompt ID'lerinin array'i
 */
export async function getUserFavorites(): Promise<string[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('prompt_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Favoriler yüklenirken hata:', error);
      return [];
    }

    return data?.map((fav) => fav.prompt_id) || [];
  } catch (error) {
    console.error('Favoriler yüklenirken beklenmeyen hata:', error);
    return [];
  }
}

/**
 * Bir prompt'un favori olup olmadığını kontrol eder
 * @param promptId - Kontrol edilecek prompt'un ID'si
 * @returns Favori olup olmadığı
 */
export async function isFavorite(promptId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('prompt_id', promptId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, bu normal
      console.error('Favori kontrol hatası:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Favori kontrol beklenmeyen hata:', error);
    return false;
  }
}

