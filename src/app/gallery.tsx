import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { PixelRatio, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Marquee } from '@/components/marquee';
import { Panel } from '@/components/panel';
import { StepBar } from '@/components/step-bar';
import { Text } from '@/components/text';
import { type ColorToken, colors, PIXEL_SCALE, Spacing, type TextVariant } from '@/theme';

const COLOR_TOKENS: ColorToken[] = [
  'void',
  'panel',
  'rule',
  'edge',
  'coin',
  'pr',
  'data',
  'done',
  'ink',
  'faint',
];

const TYPE_VARIANTS: TextVariant[] = [
  'marquee',
  'title',
  'dataXL',
  'dataL',
  'body',
  'label',
  'micro',
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing[3] }}>
      <Text variant="label" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Swatch({ token }: { token: ColorToken }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
      <View
        style={{
          width: 24,
          height: 24,
          backgroundColor: colors[token],
          borderWidth: 2,
          borderColor: colors.edge,
        }}
      />
      <Text variant="dataL">{token}</Text>
      <Text variant="micro">{colors[token]}</Text>
    </View>
  );
}

/**
 * Dev-only component gallery. Reachable from the Profile tab in development
 * builds; redirects home in production.
 */
export default function Gallery() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: Spacing[6] }}>
        <Marquee label="Gallery" />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />

        <Section title="Colour tokens">
          <View style={{ gap: Spacing[2] }}>
            {COLOR_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </View>
        </Section>

        <Section title="Type scale">
          <View style={{ gap: Spacing[2] }}>
            {TYPE_VARIANTS.map((variant) => (
              <Text key={variant} variant={variant}>
                {variant} — The quick brown fox 0123
              </Text>
            ))}
          </View>
        </Section>

        <Section title="Spacing (4dp base)">
          <View style={{ gap: Spacing[1] }}>
            {([1, 2, 4, 6, 8, 12] as const).map((step) => (
              <View
                key={step}
                style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}
              >
                <View style={{ width: Spacing[step], height: 8, backgroundColor: colors.data }} />
                <Text variant="dataL">
                  Spacing[{step}] = {Spacing[step]}dp
                </Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Panel — shadow visible on --rule surface">
          <View style={{ backgroundColor: colors.rule, padding: Spacing[4], gap: Spacing[4] }}>
            <Panel style={{ padding: Spacing[3] }}>
              <Text variant="body">Panel on --rule</Text>
            </Panel>
            <Panel style={{ padding: Spacing[3] }}>
              <Text variant="title">Title inside</Text>
              <Text variant="micro">micro metadata</Text>
            </Panel>
          </View>
          <Panel style={{ padding: Spacing[3] }}>
            <Text variant="body">Panel on --void</Text>
          </Panel>
        </Section>

        <Section title="Buttons — normal / disabled">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] }}>
            <Button label="Primary" onPress={() => {}} />
            <Button label="Secondary" variant="secondary" onPress={() => {}} />
            <Button label="Ghost" variant="ghost" onPress={() => {}} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] }}>
            <Button label="Disabled" disabled />
            <Button label="Disabled" variant="secondary" disabled />
            <Button label="Disabled" variant="ghost" disabled />
          </View>
        </Section>

        <Section title="StepBar — segmented progress">
          <View style={{ gap: Spacing[3] }}>
            <StepBar value={0.35} />
            <StepBar value={0.7} />
            <StepBar value={1} />
            <StepBar count={5} value={0.6} height={4} />
          </View>
        </Section>

        <Section title="Tabular figures — dataL column">
          <View style={{ gap: Spacing[1] }}>
            <Text variant="dataL">8 × 82.5</Text>
            <Text variant="dataL">12 × 7.25</Text>
            <Text variant="dataL">8 × 102.5</Text>
          </View>
        </Section>

        <Section title="Device">
          <Text variant="dataL">PIXEL_SCALE = {PIXEL_SCALE.toFixed(3)}</Text>
          <Text variant="dataL">PixelRatio = {PixelRatio.get()}</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
