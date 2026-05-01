import { Linking, Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export interface MarkdownProps {
  source: string;
}

interface InlinePart {
  text: string;
  bold?: boolean;
  link?: string;
}

const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
const boldRe = /\*\*([^*]+)\*\*/g;

const parseInline = (line: string): InlinePart[] => {
  const parts: InlinePart[] = [];
  let cursor = 0;
  // Resolve [text](url) first so we don't accidentally break the URL with
  // bold markers. The remaining text passes through bold parsing.
  const linkMatches: { start: number; end: number; text: string; href: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(line)) !== null) {
    linkMatches.push({
      start: m.index,
      end: m.index + m[0].length,
      text: m[1] ?? '',
      href: m[2] ?? '',
    });
  }
  linkRe.lastIndex = 0;

  const pushTextSegment = (segment: string): void => {
    let segCursor = 0;
    let bm: RegExpExecArray | null;
    while ((bm = boldRe.exec(segment)) !== null) {
      if (bm.index > segCursor) parts.push({ text: segment.slice(segCursor, bm.index) });
      parts.push({ text: bm[1] ?? '', bold: true });
      segCursor = bm.index + bm[0].length;
    }
    if (segCursor < segment.length) parts.push({ text: segment.slice(segCursor) });
    boldRe.lastIndex = 0;
  };

  for (const link of linkMatches) {
    if (link.start > cursor) pushTextSegment(line.slice(cursor, link.start));
    parts.push({ text: link.text, link: link.href });
    cursor = link.end;
  }
  if (cursor < line.length) pushTextSegment(line.slice(cursor));
  return parts.length > 0 ? parts : [{ text: line }];
};

const renderInline = (parts: InlinePart[]): React.ReactNode =>
  parts.map((part, idx) => {
    if (part.link) {
      return (
        <Text
          key={idx}
          onPress={() => {
            void Linking.openURL(part.link!);
          }}
          style={{ color: colors.primary, textDecorationLine: 'underline' }}
        >
          {part.text}
        </Text>
      );
    }
    if (part.bold) {
      return (
        <Text key={idx} style={{ fontWeight: '700' }}>
          {part.text}
        </Text>
      );
    }
    return <Text key={idx}>{part.text}</Text>;
  });

// Tiny markdown subset: # / ## / ### headings, paragraphs, bullet lists,
// **bold**, [text](url). Sufficient for the legal/about screens. Falls back
// to plain text for anything it doesn't recognise.
export function Markdown({ source }: MarkdownProps) {
  const blocks = source.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = (): void => {
    if (bulletBuffer.length === 0) return;
    out.push(
      <View key={`bul-${key++}`} className="my-2 gap-1">
        {bulletBuffer.map((item, idx) => (
          <View key={idx} className="flex-row gap-2">
            <Text className="text-text-muted">•</Text>
            <Text className="flex-1 text-base text-text-light">
              {renderInline(parseInline(item))}
            </Text>
          </View>
        ))}
      </View>,
    );
    bulletBuffer = [];
  };

  for (const rawLine of blocks) {
    const line = rawLine.trimEnd();
    if (line.length === 0) {
      flushBullets();
      continue;
    }
    if (line.startsWith('### ')) {
      flushBullets();
      out.push(
        <Text key={`h3-${key++}`} className="mt-4 text-base font-semibold text-text-light">
          {renderInline(parseInline(line.slice(4)))}
        </Text>,
      );
    } else if (line.startsWith('## ')) {
      flushBullets();
      out.push(
        <Text key={`h2-${key++}`} className="mt-5 text-xl font-bold text-text-light">
          {renderInline(parseInline(line.slice(3)))}
        </Text>,
      );
    } else if (line.startsWith('# ')) {
      flushBullets();
      out.push(
        <Text key={`h1-${key++}`} className="mt-2 text-3xl font-bold text-text-light">
          {renderInline(parseInline(line.slice(2)))}
        </Text>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      bulletBuffer.push(line.slice(2));
    } else {
      flushBullets();
      out.push(
        <Text key={`p-${key++}`} className="mt-2 text-base leading-6 text-text-light">
          {renderInline(parseInline(line))}
        </Text>,
      );
    }
  }
  flushBullets();
  return <View>{out}</View>;
}

export interface MarkdownPressableProps {
  label: string;
  onPress: () => void;
}

export function MarkdownLink({ label, onPress }: MarkdownPressableProps) {
  return (
    <Pressable onPress={onPress}>
      <Text className="text-primary underline">{label}</Text>
    </Pressable>
  );
}
