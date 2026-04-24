import React, { useRef, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';
import EmbeddedRenderer from './EmbeddedRenderer';

interface Props {
  content: string;
  isStreaming?: boolean;
  isDark?: boolean;
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

/**
 * 流式输出时用 pre-wrap 纯文本渲染（性能好），
 * 流结束后切换到 ReactMarkdown 完整渲染。
 */
const MessageContent: React.FC<Props> = ({ content, isStreaming, isDark = false, onNavigate }) => {
  const [streamDone, setStreamDone] = useState(!isStreaming);
  const prevStreamingRef = useRef(isStreaming);
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      setStreamDone(true);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const isRichBlockClass = (className?: string) =>
    className === 'language-chart' || className === 'language-embedded';

  const components = useMemo(() => ({
    pre({ children }: { children?: React.ReactNode }) {
      const childArray = React.Children.toArray(children);
      if (childArray.length === 1 && React.isValidElement(childArray[0])) {
        const node = childArray[0] as React.ReactElement<{ className?: string }>;
        if (isRichBlockClass(node.props.className)) {
          return <div className="ai-rich-block">{node}</div>;
        }
      }
      return <pre>{children}</pre>;
    },
    code({ className, children }: { className?: string; children?: React.ReactNode }) {
      if (className === 'language-chart') {
        return <ChartRenderer code={String(children).trim()} isDark={isDark} />;
      }
      if (className === 'language-embedded') {
        return <EmbeddedRenderer code={String(children).trim()} onNavigate={(...args) => onNavigateRef.current?.(...args)} />;
      }
      return <code className={className}>{children}</code>;
    },
  }), [isDark]);

  if (!streamDone) {
    return (
      <>
        <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        {isStreaming && <span style={{ animation: 'blink 1s infinite', color: isDark ? '#0ea5e9' : undefined }}>|</span>}
      </>
    );
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
};

export default MessageContent;
