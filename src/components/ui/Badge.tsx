import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { colors } from '@/lib/theme/tokens';

/**
 * A neutral, non-semantic pill: district, tenure type, photo count.
 *
 * Badge has no tone or status prop, and never will. Verification state belongs to
 * `StatusPill` alone — if a badge could be coloured green, a decorative badge would
 * eventually read as "this title is verified". ui-registry.md "Badge / pill".
 */
const BASE = 'flex-row items-center gap-1 self-start rounded-full bg-surface-2 px-3 py-1';

export interface BadgeProps {
  label: string;
  icon?: LucideIcon;
  testID?: string;
}

export function Badge({ label, icon: Icon, testID }: BadgeProps) {
  return (
    <View testID={testID} accessibilityRole="text" className={cn(BASE)}>
      {Icon && <Icon size={12} color={colors.ink[600]} />}
      <Text className="text-xs font-medium text-ink-600">{label}</Text>
    </View>
  );
}
