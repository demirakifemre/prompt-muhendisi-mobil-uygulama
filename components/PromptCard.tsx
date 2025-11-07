import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Image, Dimensions } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { useState } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // 16px margin on each side

interface PromptCardProps {
  id: string;
  promptText: string;
  imageUrl: string | null;
  likesCount: number;
  dateCreated: string;
  onLike?: (id: string) => void;
  isLiked?: boolean;
}

export default function PromptCard({
  id,
  promptText,
  imageUrl,
  likesCount,
  dateCreated,
  onLike,
  isLiked = false,
}: PromptCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    if (isFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(flipAnimation, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Bugün';
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays < 7) {
      return `${diffDays} gün önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardTouchable}>
        {/* Front Side - Image */}
        <Animated.View
          style={[
            styles.cardSide,
            styles.cardFront,
            frontAnimatedStyle,
            isFlipped && styles.cardHidden,
          ]}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text variant="bodyLarge" style={styles.placeholderText}>
                    Görsel Yok
                  </Text>
                </View>
              )}
              <View style={styles.frontOverlay}>
                <View style={styles.frontInfo}>
                  <Text variant="titleMedium" style={styles.frontTitle} numberOfLines={2}>
                    Prompt Detayları
                  </Text>
                  <Text variant="bodySmall" style={styles.frontDate}>
                    {formatDate(dateCreated)}
                  </Text>
                </View>
                <View style={styles.likesContainer}>
                  <IconButton
                    icon={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    iconColor={isLiked ? '#f44336' : '#fff'}
                    onPress={(e) => {
                      e.stopPropagation();
                      onLike?.(id);
                    }}
                  />
                  <Text variant="bodySmall" style={styles.likesText}>
                    {likesCount}
                  </Text>
                </View>
              </View>
              <View style={styles.flipHint}>
                <Text variant="bodySmall" style={styles.flipHintText}>
                  Dokunarak çevir
                </Text>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        {/* Back Side - Prompt Text */}
        <Animated.View
          style={[
            styles.cardSide,
            styles.cardBack,
            backAnimatedStyle,
            !isFlipped && styles.cardHidden,
          ]}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.backHeader}>
                <Text variant="titleLarge" style={styles.backTitle}>
                  Prompt Metni
                </Text>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    flipCard();
                  }}
                />
              </View>
              <View style={styles.promptTextContainer}>
                <Text variant="bodyLarge" style={styles.promptText}>
                  {promptText}
                </Text>
              </View>
              <View style={styles.backFooter}>
                <Text variant="bodySmall" style={styles.backDate}>
                  {formatDate(dateCreated)}
                </Text>
                <View style={styles.backLikesContainer}>
                  <IconButton
                    icon={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    iconColor={isLiked ? '#f44336' : '#666'}
                    onPress={(e) => {
                      e.stopPropagation();
                      onLike?.(id);
                    }}
                  />
                  <Text variant="bodySmall" style={styles.backLikesText}>
                    {likesCount}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  cardTouchable: {
    width: '100%',
  },
  card: {
    elevation: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardSide: {
    backfaceVisibility: 'hidden',
    width: '100%',
  },
  cardFront: {
    position: 'absolute',
    width: '100%',
  },
  cardBack: {
    position: 'absolute',
    width: '100%',
  },
  cardHidden: {
    opacity: 0,
  },
  cardContent: {
    padding: 0,
    minHeight: 300,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    opacity: 0.5,
  },
  frontOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frontInfo: {
    flex: 1,
  },
  frontTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  frontDate: {
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesText: {
    color: '#fff',
    marginLeft: -8,
  },
  flipHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flipHintText: {
    color: '#fff',
    fontSize: 10,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  promptTextContainer: {
    padding: 16,
    minHeight: 200,
    justifyContent: 'center',
  },
  promptText: {
    lineHeight: 24,
    textAlign: 'left',
  },
  backFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backDate: {
    opacity: 0.6,
  },
  backLikesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backLikesText: {
    marginLeft: -8,
  },
});

