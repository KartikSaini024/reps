import { type ReactNode, useState } from 'react';
import { Text as RNText, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, Spacing } from '@/theme';

export interface ReorderableListProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  /** Fixed row height in dp — every row must be exactly this tall. */
  rowHeight: number;
  /** Row content WITHOUT the drag handle; it fills the remaining width. */
  renderRow: (item: T) => ReactNode;
  onReorder: (from: number, to: number) => void;
  /** Called when a drag starts/ends so hosts can lock scrolling. */
  onDragStateChange?: (dragging: boolean) => void;
  emptyMessage?: string;
}

/**
 * Minimal long-press drag-to-reorder list built on Gesture Handler +
 * Reanimated (the mandated stack; no third-party reorder lib). Rows are
 * fixed-height; hold the handle ~250ms, drag, drop. Log register: the
 * active row tracks the finger on the UI thread; siblings reflow as plain
 * state changes — no spring theatre.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  rowHeight,
  renderRow,
  onReorder,
  onDragStateChange,
  emptyMessage,
}: ReorderableListProps<T>) {
  const dragY = useSharedValue(0);
  const slot = useSharedValue(-1);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  if (items.length === 0 && emptyMessage) {
    return (
      <View style={{ padding: Spacing[4] }}>
        <RNText style={{ color: colors.faint, fontSize: 13, textAlign: 'center' }}>
          {emptyMessage}
        </RNText>
      </View>
    );
  }

  return (
    <View>
      {items.map((item, index) => (
        <DragRow
          key={keyOf(item)}
          index={index}
          count={items.length}
          rowHeight={rowHeight}
          isActive={draggingKey === keyOf(item)}
          dragY={dragY}
          slot={slot}
          onReorder={onReorder}
          onDragStateChange={onDragStateChange}
          onDragStart={() => setDraggingKey(keyOf(item))}
          onDragEnd={() => setDraggingKey(null)}
        >
          {renderRow(item)}
        </DragRow>
      ))}
    </View>
  );
}

function DragRow({
  index,
  count,
  rowHeight,
  isActive,
  dragY,
  slot,
  onReorder,
  onDragStateChange,
  onDragStart,
  onDragEnd,
  children,
}: {
  index: number;
  count: number;
  rowHeight: number;
  isActive: boolean;
  dragY: SharedValue<number>;
  slot: SharedValue<number>;
  onReorder: (from: number, to: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  children: ReactNode;
}) {
  const gesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onStart(() => {
      slot.value = index;
      dragY.value = 0;
      runOnJS(onDragStart)();
      if (onDragStateChange) {
        runOnJS(onDragStateChange)(true);
      }
    })
    .onChange((event) => {
      dragY.value += event.changeY;
      const nextSlot = clampSlot(index + Math.round(dragY.value / rowHeight), count);
      if (nextSlot !== slot.value) {
        const from = slot.value;
        const to = nextSlot;
        dragY.value -= (nextSlot - slot.value) * rowHeight;
        slot.value = nextSlot;
        runOnJS(onReorder)(from, to);
      }
    })
    .onEnd(() => {
      dragY.value = withTiming(0, { duration: 120 });
      slot.value = -1;
      runOnJS(onDragEnd)();
      if (onDragStateChange) {
        runOnJS(onDragStateChange)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isActive ? dragY.value : 0 }],
    zIndex: isActive ? 10 : 0,
    elevation: isActive ? 10 : 0,
  }));

  return (
    <Animated.View
      style={[
        {
          height: rowHeight,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 2,
          borderBottomColor: colors.rule,
          backgroundColor: colors.panel,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={gesture}>
        <View
          accessibilityRole="button"
          accessibilityLabel="Reorder — hold and drag"
          style={{
            width: 48,
            height: rowHeight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RNText style={{ color: colors.faint, fontSize: 18 }}>≡</RNText>
        </View>
      </GestureDetector>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
}

function clampSlot(slot: number, count: number): number {
  return Math.max(0, Math.min(count - 1, slot));
}
