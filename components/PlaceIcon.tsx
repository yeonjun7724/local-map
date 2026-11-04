import { createElement } from 'react';
import { categoryIcons } from '@/lib/icons';

export default function PlaceIcon({ name, color }: { name: string; color: string }) {
  const nodes = categoryIcons[name];
  if (!nodes) return <span aria-hidden="true">{name}</span>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {nodes.map(([tag, attrs], index) => createElement(tag, { ...attrs, key: index }))}
  </svg>;
}
