import { AlertTriangle, Clock, Info, ShieldCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { statusTokens, type VerificationStatus } from '@/lib/theme/tokens';

/**
 * The single place a verification status becomes pixels.
 *
 * Three rules this component exists to enforce, from ui-registry.md and AGENTS.md 5.5:
 *   1. Colour is never the only signal — surface, icon and text label always ship together.
 *   2. The status -> colour mapping is fixed and comes from `statusTokens`. Callers choose
 *      a status, never a colour.
 *   3. There is no icon-only variant. A green shield with no word next to it is exactly how
 *      a user comes to believe an unverified title was checked.
 */

/** Icon components, keyed by status. Names match `statusTokens[status].icon` exactly. */
const ICON: Record<VerificationStatus, LucideIcon> = {
  verified: ShieldCheck,
  pending: Clock,
  flagged: AlertTriangle,
  neutral: Info,
};

/** Literal Tailwind classes mirroring `statusTokens[status].surface / .content`. */
const SURFACE: Record<VerificationStatus, string> = {
  verified: 'bg-verified-50',
  pending: 'bg-caution-50',
  flagged: 'bg-danger-50',
  neutral: 'bg-brand-50',
};

const CONTENT: Record<VerificationStatus, string> = {
  verified: 'text-verified-600',
  pending: 'text-caution-600',
  flagged: 'text-danger-600',
  neutral: 'text-brand-600',
};

const BASE = 'flex-row items-center gap-1 self-start rounded-full px-3 py-1';

export interface StatusPillProps {
  status: VerificationStatus;
  /**
   * Refines the wording only — "Pending registry check" rather than "Pending".
   * It must never contradict `status`; the colour and icon are fixed regardless.
   */
  label?: string;
  testID?: string;
}

export function StatusPill({ status, label, testID }: StatusPillProps) {
  const token = statusTokens[status];
  const Icon = ICON[status];
  const text = label ?? token.label;

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${text}`}
      className={cn(BASE, SURFACE[status])}
    >
      <Icon size={12} color={token.content} />
      <Text className={cn('text-xs font-medium', CONTENT[status])}>{text}</Text>
    </View>
  );
}
