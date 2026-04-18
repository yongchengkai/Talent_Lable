import React, { useState, useEffect } from 'react';
import { Select, Tag } from 'antd';
import { tagApi, categoryApi } from '@/services/api';

interface TagPickerSelectProps {
  value?: number[];
  onChange?: (value: number[]) => void;
  placeholder?: string;
}

/** 标签多选组件，按类目分组，显示标签名+类目 */
const TagPickerSelect: React.FC<TagPickerSelectProps> = ({ value = [], onChange, placeholder = '选择输出标签' }) => {
  const [tags, setTags] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [tagRes, catRes]: any[] = await Promise.all([
          tagApi.page({ current: 1, size: 500, status: 'ACTIVE' }),
          categoryApi.listActive(),
        ]);
        setTags(tagRes.data?.records || []);
        setCategories(catRes.data || []);
      } catch {}
    };
    load();
  }, []);

  const catMap = Object.fromEntries(categories.map((c: any) => [c.id, c.categoryName]));

  // 按类目分组
  const grouped: Record<string, any[]> = {};
  for (const tag of tags) {
    const catName = catMap[tag.categoryId] || '未分类';
    if (!grouped[catName]) grouped[catName] = [];
    grouped[catName].push(tag);
  }

  const options = Object.entries(grouped).map(([catName, catTags]) => ({
    label: catName,
    options: catTags.map(t => ({
      label: t.tagName,
      value: t.id,
      tagCode: t.tagCode,
    })),
  }));

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      optionFilterProp="label"
      style={{ width: '100%' }}
      options={options}
      tagRender={({ label, closable, onClose }) => (
        <Tag color="cyan" closable={closable} onClose={onClose} style={{ margin: 2 }}>{label}</Tag>
      )}
      maxTagCount="responsive"
    />
  );
};

/** 只读展示标签列表 */
export const TagDisplay: React.FC<{ tagIds?: number[] }> = ({ tagIds }) => {
  const [tags, setTags] = useState<any[]>([]);

  useEffect(() => {
    if (!tagIds || tagIds.length === 0) return;
    const load = async () => {
      try {
        const res: any = await tagApi.page({ current: 1, size: 500, status: 'ACTIVE' });
        const allTags = res.data?.records || [];
        setTags(allTags.filter((t: any) => tagIds.includes(t.id)));
      } catch {}
    };
    load();
  }, [tagIds]);

  if (!tagIds || tagIds.length === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>未配置</span>;
  if (tags.length === 0) return <span style={{ color: 'rgba(255,255,255,0.3)' }}>加载中...</span>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {tags.map(t => <Tag key={t.id} color="cyan">{t.tagName}</Tag>)}
    </div>
  );
};

export default TagPickerSelect;
