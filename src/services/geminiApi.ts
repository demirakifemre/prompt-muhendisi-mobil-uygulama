import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API anahtarını environment variables'dan al
const geminiApiKey = process.env.GEMINI_API_KEY || '';

if (!geminiApiKey) {
  console.warn(
    'Gemini API Key bulunamadı. Lütfen .env dosyasına GEMINI_API_KEY ekleyin.'
  );
}

// Gemini AI client'ı oluştur
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

/**
 * Görseli Base64 formatına çevirir
 * @param imageUri - Görselin URI'si (file:// veya http://)
 * @returns Base64 string
 */
async function convertImageToBase64(imageUri: string): Promise<string> {
  try {
    // Eğer zaten bir URL ise (http/https), fetch ile al
    if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // data:image/jpeg;base64, formatından sadece base64 kısmını al
          const base64Data = base64String.split(',')[1] || base64String;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Local file ise (file://) - React Native için fetch kullan
    // Expo ImagePicker file:// URI döndürür, bunu fetch ile okuyabiliriz
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // data:image/jpeg;base64, formatından sadece base64 kısmını al
        const base64Data = base64String.split(',')[1] || base64String;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Görsel Base64 çevirme hatası:', error);
    throw new Error('Görsel işlenirken bir hata oluştu.');
  }
}

/**
 * Görselin MIME type'ını belirler
 * @param imageUri - Görselin URI'si
 * @returns MIME type (image/jpeg, image/png, vb.)
 */
function getImageMimeType(imageUri: string): string {
  const extension = imageUri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // Default
  }
}

/**
 * Görseli Gemini API'ye göndererek yüksek kaliteli prompt üretir
 * @param imageUri - Yüklenen görselin URI'si (file:// veya http://)
 * @param description - İsteğe bağlı kullanıcı açıklaması
 * @returns Üretilen prompt metni
 */
export async function generatePromptFromImage(
  imageUri: string,
  description?: string
): Promise<string> {
  try {
    if (!genAI) {
      throw new Error(
        'Gemini API anahtarı bulunamadı. Lütfen .env dosyasını kontrol edin.'
      );
    }

    // Gemini 2.5 Flash modelini kullan (görsel analizi için optimize edilmiş)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Görseli Base64'e çevir
    const imageBase64 = await convertImageToBase64(imageUri);
    const mimeType = getImageMimeType(imageUri);

    // Yüksek kaliteli prompt üretmek için system instruction
    const systemInstruction = 
      'Sen, usta bir fotoğrafçı ve bir prompt mühendisisin. Sana yüklenen görseli bir sanat eseri gibi en ince detayına kadar analiz et. ' +
      'Işığı (örn: dramatik, yumuşak, stüdyo ışığı), renk paletini, kompozisyonu (örn: altın oran, simetri), objeleri, sanatsal stili (örn: fütüristik, siberpunk, fotorealistik) ve görselin uyandırdığı duyguyu incele. ' +
      'Bu analize dayanarak, bu görseli Midjourney gibi bir yapay zeka modelinde yeniden oluşturabilecek, son derece detaylı ve profesyonel bir prompt üret. ' +
      'Bu prompt\'ta diyafram (f-stop), ISO, lens türü (örn: 85mm f/1.8) gibi teknik detayları görselin tarzına göre tahmin ederek ekle. ' +
      'Sonuna --ar 16:9 --v 6.0 gibi ekstra parametreler ekle. ' +
      'Çıktın sadece bu prompt metni olsun, başka hiçbir açıklama yapma.';

    // Kullanıcı mesajını oluştur
    let userMessage = 'Bu görseli analiz et ve yukarıdaki kriterlere uygun bir prompt metni üret.';
    
    if (description && description.trim()) {
      userMessage += `\n\nKullanıcı açıklaması: ${description.trim()}`;
    }

    // Multimodal içerik oluştur (text + image)
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: userMessage,
    };

    // API çağrısı yap
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [imagePart, textPart],
        },
      ],
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.7, // Yaratıcılık dengesi (0-1 arası)
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024, // Maksimum çıktı uzunluğu
      },
    });

    const response = await result.response;
    const promptText = response.text();

    if (!promptText || promptText.trim().length === 0) {
      throw new Error('Gemini API\'den boş yanıt alındı.');
    }

    return promptText.trim();
  } catch (error: any) {
    console.error('Gemini API hatası:', error);
    
    // Daha anlaşılır hata mesajları
    if (error.message?.includes('API_KEY')) {
      throw new Error(
        'Gemini API anahtarı geçersiz. Lütfen .env dosyasını kontrol edin.'
      );
    }
    
    if (error.message?.includes('QUOTA')) {
      throw new Error(
        'Gemini API kotası aşıldı. Lütfen daha sonra tekrar deneyin.'
      );
    }
    
    if (error.message?.includes('SAFETY')) {
      throw new Error(
        'Görsel içerik güvenlik politikalarına uymuyor. Lütfen farklı bir görsel deneyin.'
      );
    }

    throw new Error(
      error.message || 'Prompt üretilirken bir hata oluştu. Lütfen tekrar deneyin.'
    );
  }
}
