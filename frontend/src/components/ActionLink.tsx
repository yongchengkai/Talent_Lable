import React from 'react';
import { Tooltip } from 'antd';

interface ActionLinkProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  danger?: boolean;
  success?: boolean;
}

/**
 * 统一的操作链接组件
 * - 可操作时：正常颜色 + 可点击
 * - 不可操作时：灰色 + not-allowed + Tooltip 显示原因
 */
const ActionLink: React.FC<ActionLinkProps> = ({ children, onClick, disabled, disabledReason, danger, success }) => {
  if (disabled) {
    return (
      <Tooltip title={disabledReason || '当前状态不可操作'}>
        <a className="action-link" style={{ color: 'rgba(255,255,255,0.2)', cursor: 'not-allowed' }}>
          {children}
        </a>
      </Tooltip>
    );
  }

  let className = 'action-link';
  if (danger) className += ' action-link-danger';
  if (success) className += ' action-link-success';

  return (
    <a className={className} onClick={onClick}>
      {children}
    </a>
  );
};

export default ActionLink;
