import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';

interface Props {
  content: string;
  isStreaming?: boolean;
  isDark?: boolean;
}

/**
 * 流式输出时用 pre-wrap 纯文本渲染（性能好），
 * 流结束后切换到 ReactMarkdown 完整渲染。
 */
const MessageContent: React.FC<Props> = ({ content, isStreaming, isDark = false }) => {
  const [streamDone, setStreamDone] = useState(!isStreaming);
  const prevStreamingRef = useRef(isStreaming);

  useEffect(() => {
    // 检测 isStreaming 从 true 变为 false 的瞬间
    if (prevStreamingRef.current && !isStreaming) {
      setStreamDone(true);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // 非流式消息（历史消息）直接用 Markdown 渲染
  // 流式进行中用纯文本，流结束后切换到 Markdown
  if (!streamDone) {
    return (
      <>
        <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        {isStreaming && <span style={{ animation: 'blink 1s infinite', color: isDark ? '#0ea5e9' : undefined }}>|</span>}
      </>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }) {
          if (className === 'language-chart') {
            return <ChartRenderer code={String(children).trim()} isDark={isDark} />;
          }
          return <code className={className}>{children}</code>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MessageContent;
