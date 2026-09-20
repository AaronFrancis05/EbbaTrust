import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

import { cn } from '@/lib/cn';

/**
 * Loading placeholder. ui-registry.md rule 4: skeleton, not a spinner, past 300ms.
 *
 * A skeleton keeps the layout stable while the content arrives, so a slow connection looks
 * like it is working rather than broken — and it never briefly shows an empty result card,
 * which in this app would read as "nothing found" for land that does exist.
 *
 * Uses React Native's `Animated` rather than Reanimated: a two-value opacity loop needs
 * nothing more, and it keeps the primitives free of extra native setup. See PLAN.md Step 2.
 */

const DIM = 0.4;
const BRIGHT = 1;
const DURATION = 900;

function usePulse() {
  // Lazy state initialiser rather than a ref: the value is read while rendering.
  const [opacity] = useState(() => new Animated.Value(DIM));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(DIM);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: BRIGHT,
          duration: DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: DIM,
          duration: DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return opacity;
}

export interface SkeletonProps {
  /** Layout only — width, height and radius. Never a colour: the fill is always surface-2. */
  className?: string;
  testID?: string;
}

export function Skeleton({ className, testID }: SkeletonProps) {
  const opacity = usePulse();

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ opacity }}
      className={cn('rounded-md bg-surface-2', className)}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  testID?: string;
}

/** Text placeholder. The last line is short, the way a real paragraph ends. */
export function SkeletonText({ lines = 3, testID }: SkeletonTextProps) {
  return (
    <View testID={testID} accessible accessibilityLabel="Loading" className="gap-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-1/2' : 'w-full')} />
      ))}
    </View>
  );
}

/** Card-shaped placeholder, matching Card's border, radius and padding exactly. */
export function SkeletonCard({ testID }: { testID?: string }) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel="Loading"
      className="gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <Skeleton className="h-5 w-2/3" />
      <SkeletonText lines={2} />
      <Skeleton className="h-6 w-24 rounded-full" />
    </View>
  );
}
