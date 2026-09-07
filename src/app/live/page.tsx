import type { Metadata } from 'next';
import Workspace from '@/components/Workspace';
export const metadata: Metadata = { title: 'NEXUS — Live Observatory' };
export default function LivePage() {
  return <Workspace />;
}
