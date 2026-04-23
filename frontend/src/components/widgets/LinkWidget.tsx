import React from 'react';
import { Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';

interface Props {
  page: string;
  filters?: Record<string, string>;
  label?: string;
  onNavigate?: (page: string, filters?: Record<string, string>) => void;
}

const LinkWidget: React.FC<Props> = ({ page, filters, label, onNavigate }) => {
  return (
    <div style={{ margin: '8px 0' }}>
      <Button
        type="default"
        size="small"
        onClick={() => onNavigate?.(page, filters)}
        style={{
          borderColor: 'rgba(14, 165, 233, 0.3)',
          color: '#0ea5e9',
          background: 'rgba(14, 165, 233, 0.06)',
          borderRadius: 6,
          fontSize: 12,
        }}
      >
        {label || '查看详情'} <RightOutlined style={{ fontSize: 10 }} />
      </Button>
    </div>
  );
};

export default LinkWidget;
