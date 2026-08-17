import { Text } from '@/components/text';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="label" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </Text>
  );
}
