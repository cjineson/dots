import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../themeContext';
import type { AppTheme } from '../theme';
import SongTags from '../components/SongTags';
import FontSizeZoomControl from '../components/FontSizeZoomControl';
import PerformanceCueContent from '../components/PerformanceCueContent';
import {
  createCueDocumentFromText,
  getVisibleCueBlocks,
  parseCueDocument,
} from '../lib/cueDocument';
import {
  clampFontSize,
  DEFAULT_TAG_SIZE,
  MAX_TAG_SIZE,
  MIN_TAG_SIZE,
  TAG_SIZE_STEP,
} from '../lib/fontSize';
import { useScreenAwake } from '../lib/keepAwake';
import {
  AUTO_SCROLL_SLIDER_CURVE,
  AUTO_SCROLL_SPEED_STEP,
  MAX_AUTO_SCROLL_SPEED,
  MIN_AUTO_SCROLL_SPEED,
  SWIPE_DISTANCE,
} from '../lib/settings';
import type { AppSettings } from '../lib/settings';
import type { CueBlock, SetlistItem, Song } from '../types';

type LivePerformanceScreenProps = {
  items: SetlistItem[];
  index: number;
  isEditorPreview?: boolean;
  onGoToDashboard: () => void;
  onExitEditorPreview: () => void;
  onIndexChange: (index: number) => void;
  onFontSizeChange: (songId: string, fontSize: number) => void;
  tagSize: number;
  onTagSizeChange: (tagSize: number, persist: boolean) => void;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
};

export default function LivePerformanceScreen({
  items,
  index,
  isEditorPreview = false,
  onGoToDashboard,
  onExitEditorPreview,
  onIndexChange,
  onFontSizeChange,
  tagSize,
  onTagSizeChange,
  settings,
  onSettingChange,
}: LivePerformanceScreenProps) {
  useScreenAwake(settings.keepAwake);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const item = items[index];
  const song = item?.kind === 'song' ? item.song : undefined;
  const cueDocument = song?.cue_document
    ? parseCueDocument(song.cue_document)
    : createCueDocumentFromText(song?.notes_raw_text ?? '');
  const cueBlocks = getVisibleCueBlocks(cueDocument);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [fontSizeBySong, setFontSizeBySong] = useState<Record<string, number>>({});
  const fontSize =
    song ? fontSizeBySong[song.id] ?? song.font_size ?? theme.typography.box_text_size
      : theme.typography.box_text_size;
  const hasManualFontSize =
    song !== undefined && (
      fontSizeBySong[song.id] !== undefined ||
      song.font_size !== undefined && song.font_size !== theme.typography.box_text_size
    );
  const availableWidth = Math.max(0, boxSize.width - theme.layout.box_padding * 2);
  const availableHeight = Math.max(0, boxSize.height - theme.layout.box_padding * 2);
  const songFontScale = fontSize / theme.typography.box_text_size;
  const [panel, setPanel] = useState<'zoom' | 'tags' | 'crawl' | null>(null);
  const crawlOpen = panel === 'crawl';
  const [crawling, setCrawling] = useState(false);
  const [crawlSpeed, setCrawlSpeed] = useState(settings.autoScrollSpeed);
  const crawlSpeedRef = useRef(crawlSpeed);
  crawlSpeedRef.current = crawlSpeed;
  const cueScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const cueScrollY = useRef(0);
  const cueContentHeight = useRef(0);
  const cueViewportHeight = useRef(0);
  const crawlY = useRef(0);

  useEffect(() => {
    setCrawling(false);
    cueScrollY.current = 0;
  }, [index]);

  useEffect(() => {
    if (!crawling) {
      return undefined;
    }
    crawlY.current = cueScrollY.current;
    const timer = setInterval(() => {
      const maxY = Math.max(0, cueContentHeight.current - cueViewportHeight.current);
      crawlY.current = Math.min(maxY, crawlY.current + (crawlSpeedRef.current * 50) / 1000);
      cueScrollRef.current?.scrollTo({ y: crawlY.current, animated: false });
      if (crawlY.current >= maxY) {
        setCrawling(false);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [crawling]);

  const zoomOpen = panel === 'zoom';
  const tagsOpen = panel === 'tags';

  const baseSizeForBlock = (block: CueBlock) =>
    (block.font_size ?? theme.typography.box_text_size) * songFontScale;

  const fitsAtScale = (scale: number) => {
    const contentHeight = cueBlocks.reduce((total, block) => {
      const size = baseSizeForBlock(block) * scale;
      if (block.type === 'table') {
        const columnWidth = availableWidth / block.rows[0].length;
        const tableHeight = block.rows.reduce((height, row) => {
          const rowLines = Math.max(
            ...row.map((cell) => Math.max(1, Math.ceil(cell.length / Math.max(1, columnWidth / (size * 0.55))))),
          );
          return height + rowLines * size * 1.35;
        }, 0);
        return total + tableHeight + 8;
      }
      const renderedLines = block.text.split(/\r?\n/).reduce(
        (count, line) =>
          count + Math.max(1, Math.ceil(line.length / Math.max(1, availableWidth / (size * 0.55)))),
        0,
      );
      return total + renderedLines * size * 1.25 + (block.type === 'section' ? 12 : 4);
    }, 0);
    return contentHeight <= availableHeight;
  };

  let lowScale = 0;
  let highScale = 1;
  if (
    !hasManualFontSize &&
    availableWidth > 0 &&
    availableHeight > 0 &&
    !fitsAtScale(1)
  ) {
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const middleScale = (lowScale + highScale) / 2;
      if (fitsAtScale(middleScale)) {
        lowScale = middleScale;
      } else {
        highScale = middleScale;
      }
    }
  } else {
    lowScale = 1;
  }
  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          settings.swipeMode !== 'off' &&
          Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderRelease: (_, gesture) => {
          if (settings.swipeMode === 'off') {
            return;
          }
          const distance = SWIPE_DISTANCE[settings.swipeMode];
          if (gesture.dx <= -distance && index < items.length - 1) {
            onIndexChange(index + 1);
          } else if (gesture.dx >= distance && index > 0) {
            onIndexChange(index - 1);
          }
        },
      }),
    [index, items.length, onIndexChange, settings.swipeMode],
  );

  const handleBoxLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBoxSize((current) =>
      Math.abs(current.width - width) > 1 || Math.abs(current.height - height) > 1
        ? { width, height }
        : current,
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        {isEditorPreview ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to song editor"
            onPress={onExitEditorPreview}
            style={styles.backToEditButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.accent_highlight} />
            <Text style={styles.backToEditText}>Back to edit</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Dashboard"
            onPress={onGoToDashboard}
            hitSlop={8}
            style={styles.dashboardButton}
          >
            <Image
              source={require('../../assets/branding/gigbox-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="GigBox"
            />
          </Pressable>
        )}
        <View style={styles.performanceHeading}>
          <Text numberOfLines={1} style={styles.songTitle}>
            {song?.title ?? 'Break'}
          </Text>
          {settings.showPosition && !isEditorPreview && items.length > 1 && (
            <Text style={styles.positionText}>
              {index + 1} of {items.length}
            </Text>
          )}
        </View>
        <View style={styles.performanceTags}>
          <SongTags
            tags={song?.tags}
            compact
            wrapCompact
            scale={tagSize / DEFAULT_TAG_SIZE}
          />
        </View>
        {song && !isEditorPreview && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tagsOpen ? 'Hide tag size control' : 'Show tag size control'}
              accessibilityState={{ expanded: tagsOpen }}
              onPress={() => setPanel(tagsOpen ? null : 'tags')}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={tagsOpen ? 'tag-off-outline' : 'tag-outline'}
                size={30}
                color={theme.colors.accent_highlight}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={crawlOpen ? 'Hide crawl controls' : 'Show crawl controls'}
              accessibilityState={{ expanded: crawlOpen }}
              onPress={() => setPanel(crawlOpen ? null : 'crawl')}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="tortoise"
                size={30}
                color={theme.colors.accent_highlight}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={zoomOpen ? 'Hide zoom controls' : 'Show zoom controls'}
              accessibilityState={{ expanded: zoomOpen }}
              onPress={() => setPanel(zoomOpen ? null : 'zoom')}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name={zoomOpen ? 'magnify-close' : 'magnify-plus-outline'}
                size={30}
                color={theme.colors.accent_highlight}
              />
            </Pressable>
          </>
        )}
      </View>

      {song && !isEditorPreview && tagsOpen && (
        <FontSizeZoomControl
          size={settings.barSize}
          label="Tag size"
          value={tagSize}
          min={MIN_TAG_SIZE}
          max={MAX_TAG_SIZE}
          step={TAG_SIZE_STEP}
          onValueChange={onTagSizeChange}
        />
      )}

      {song && !isEditorPreview && crawlOpen && (
        <View style={styles.crawlPanel}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={crawling ? 'Pause crawl' : 'Start crawl'}
            onPress={() => setCrawling((current) => !current)}
            style={styles.crawlPlayButton}
          >
            <MaterialCommunityIcons
              name={crawling ? 'pause' : 'play'}
              size={30}
              color={theme.colors.accent_highlight}
            />
          </Pressable>
          <View style={styles.crawlSlider}>
            <FontSizeZoomControl
              size={settings.barSize}
              label="Crawl speed (pts/sec)"
              value={crawlSpeed}
              min={MIN_AUTO_SCROLL_SPEED}
              max={MAX_AUTO_SCROLL_SPEED}
              step={AUTO_SCROLL_SPEED_STEP}
              curve={AUTO_SCROLL_SLIDER_CURVE}
              decreaseIcon="tortoise"
              increaseIcon="rabbit"
              decreaseLabel="Slower"
              increaseLabel="Faster"
              onValueChange={(next, persist) => {
                setCrawlSpeed(next);
                if (persist) {
                  onSettingChange('autoScrollSpeed', next);
                }
              }}
            />
          </View>
        </View>
      )}

      {song && !isEditorPreview && zoomOpen && (
        <FontSizeZoomControl
          size={settings.barSize}
          label="Song text size"
          value={fontSize}
          onValueChange={(nextFontSize, persist) => {
            const updatedFontSize = clampFontSize(nextFontSize);
            setFontSizeBySong((current) => ({
              ...current,
              [song.id]: updatedFontSize,
            }));
            if (persist) {
              onFontSizeChange(song.id, updatedFontSize);
            }
          }}
        />
      )}

      <View style={styles.boxGestureArea} {...swipeResponder.panHandlers}>
        <View onLayout={handleBoxLayout} style={[styles.box, { backgroundColor: theme.colors.surface_card }]}>
          {item?.kind === 'break' ? (
            <View style={styles.breakContent}>
              <MaterialCommunityIcons
                name="coffee"
                size={52}
                color={theme.colors.accent_highlight}
              />
              <Text style={styles.breakTitle}>BREAK</Text>
              {item.duration_minutes !== undefined && (
                <Text style={styles.breakDuration}>{item.duration_minutes} minutes</Text>
              )}
            </View>
          ) : (
          <ScrollView
            ref={cueScrollRef}
            contentContainerStyle={styles.cueBlocks}
            scrollEventThrottle={32}
            onScroll={(event) => {
              cueScrollY.current = event.nativeEvent.contentOffset.y;
            }}
            onScrollBeginDrag={() => setCrawling(false)}
            onContentSizeChange={(_, height) => {
              cueContentHeight.current = height;
            }}
            onLayout={(event) => {
              cueViewportHeight.current = event.nativeEvent.layout.height;
            }}
          >
            <PerformanceCueContent
              blocks={cueBlocks}
              fontScale={songFontScale * lowScale}
            />
          </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  crawlPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crawlPlayButton: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crawlSlider: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    gap: 10,
    marginBottom: 10,
  },
  positionText: {
    color: theme.colors.text_secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  dashboardButton: {
    width: 112,
    minHeight: 52,
    justifyContent: 'center',
  },
  backToEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: 6,
  },
  backToEditText: {
    color: theme.colors.accent_highlight,
    fontSize: 15,
    fontWeight: '700',
  },
  logo: {
    width: 108,
    height: 31,
  },
  songTitle: {
    color: theme.colors.text_primary,
    fontSize: 18,
    fontWeight: theme.typography.font_weight_bold,
  },
  performanceHeading: {
    flex: 1,
    minWidth: 0,
  },
  performanceTags: {
    maxWidth: 220,
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  breakContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  breakTitle: {
    color: theme.colors.accent_highlight,
    fontSize: 32,
    fontWeight: theme.typography.font_weight_bold,
  },
  breakDuration: {
    color: theme.colors.text_secondary,
    fontSize: 20,
  },
  boxGestureArea: {
    flex: 1,
  },
  box: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border_contrast,
    borderRadius: 16,
    padding: theme.layout.box_padding,
  },
  cueBlocks: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
});
