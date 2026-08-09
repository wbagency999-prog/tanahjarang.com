import type { Metadata } from 'next';
import PipelineDashboard from './PipelineDashboard';

export const metadata: Metadata = {
  title: 'Pipeline Dashboard | Warta Nusantara',
  description: 'Editorial dashboard untuk review dan publish artikel',
};

export default function PipelinePage() {
  return <PipelineDashboard />;
}
