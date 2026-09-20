import { useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Disclosure,
  EmptyState,
  Input,
  Skeleton,
  SkeletonCard,
  SkeletonText,
  StatusPill,
} from '@/components/ui';

/**
 * Step 2 primitive gallery.
 *
 * Every primitive in every state, on one screen. It exists so the components can be checked
 * on a real device in sunlight, and so `/imprint` has something rendered to read rather than
 * source files alone. It is not a product screen and no route will link to it — it is
 * replaced by the first real screen in Step 4.
 */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-ink-900">{title}</Text>
      {children}
    </View>
  );
}

export default function PrimitiveGallery() {
  const [titleNumber, setTitleNumber] = useState('');
  const [nin, setNin] = useState('CM12345');

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-4 py-4 gap-6">
      <View className="gap-2">
        <Text className="text-2xl font-semibold text-ink-900">Primitives</Text>
        <Text className="text-sm text-ink-600">
          Step 2 baseline. Every component below is imprinted in ui-registry.md. If something
          here looks wrong, the registry is wrong too.
        </Text>
      </View>

      <Section title="StatusPill">
        <Text className="text-sm text-ink-600">
          Colour, icon and label always ship together. There is no icon-only variant.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <StatusPill status="verified" />
          <StatusPill status="pending" label="Pending registry check" />
          <StatusPill status="flagged" />
          <StatusPill status="neutral" label="Demo data" />
        </View>
      </Section>

      <Section title="Badge">
        <Text className="text-sm text-ink-600">
          Neutral only. A badge can never express verification state.
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <Badge label="Wakiso" icon={MapPin} />
          <Badge label="Mailo" />
          <Badge label="4 photos" />
        </View>
      </Section>

      <Section title="Button">
        <View className="gap-3">
          <Button label="Request verification" onPress={() => {}} />
          <Button label="Save for later" variant="secondary" onPress={() => {}} />
          <Button label="Cancel escrow" variant="destructive" onPress={() => {}} />
          <Button label="Retry" variant="secondary" icon={RefreshCw} onPress={() => {}} />
          <Button label="Checking title" loading onPress={() => {}} />
          <Button label="Unavailable" disabled onPress={() => {}} />
        </View>
      </Section>

      <Section title="Card">
        <Card title="Plot 42, Nansana" className="gap-3">
          <Text className="text-sm text-ink-600">
            0.25 acres · Freehold · Listed 3 days ago
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <StatusPill status="pending" />
            <Badge label="Wakiso" icon={MapPin} />
          </View>
        </Card>
        <Card
          title="Tappable card"
          onPress={() => {}}
          accessibilityLabel="Open listing, Plot 42 Nansana"
          className="gap-2"
        >
          <Text className="text-sm text-ink-600">Press and hold to see the pressed state.</Text>
        </Card>
      </Section>

      <Section title="Input">
        <Input
          label="Title number"
          value={titleNumber}
          onChangeText={setTitleNumber}
          placeholder="e.g. FRV 1234 Folio 5"
          hint="Printed at the top of the certificate of title."
          autoCapitalize="characters"
        />
        <Input
          label="National ID number"
          value={nin}
          onChangeText={setNin}
          error="A NIN is 14 characters. This one has 7."
          autoCapitalize="characters"
        />
        <Input
          label="Phone number"
          value="+256 700 000 000"
          onChangeText={() => {}}
          editable={false}
          hint="Verified during sign-in."
        />
      </Section>

      <Section title="Skeleton">
        <Text className="text-sm text-ink-600">
          Shown after 300ms, never a spinner. Holds the layout so a slow connection reads as
          working rather than empty.
        </Text>
        <SkeletonCard />
        <View className="gap-3 rounded-xl border border-border bg-surface p-4">
          <Skeleton className="h-4 w-1/3" />
          <SkeletonText lines={3} />
        </View>
      </Section>

      <Section title="EmptyState">
        <Card className="gap-0">
          <EmptyState
            title="No listings in Kabale yet"
            message="Try a nearby district, or clear the filter to see everything available."
            action={{ label: 'Clear filters', onPress: () => {} }}
          />
        </Card>
        <Card className="gap-0">
          <EmptyState
            tone="error"
            title="Could not reach the registry"
            message="Your connection dropped before the check finished. Nothing was verified."
            action={{ label: 'Try again', onPress: () => {} }}
          />
        </Card>
      </Section>

      <Section title="Disclosure">
        <Disclosure title="Encumbrances" summary="1 caveat on record">
          <Text className="text-base text-ink-900">
            Caveat lodged 12 March 2024. A caveat blocks transfer until it is withdrawn or
            lapses.
          </Text>
          <StatusPill status="flagged" label="Blocks transfer" />
        </Disclosure>
        <Disclosure title="Transfer history" summary="3 transfers since 1998" defaultExpanded>
          <Text className="text-base text-ink-900">
            Most recent transfer registered 8 August 2021.
          </Text>
        </Disclosure>
      </Section>
    </ScrollView>
  );
}
