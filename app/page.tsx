import AtlasApp from '@/components/AtlasApp';
import { loadAtlasData } from '@/lib/data/load';

export default async function Page() {
  const data = await loadAtlasData();
  return <AtlasApp data={data} />;
}
