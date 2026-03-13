import { createClient } from '@/app/_lib/shared/supabase/server';

/**
 * assemblyId로부터 union_id를 조회
 * SYSTEM_ADMIN처럼 union_id가 없는 사용자가 총회 API를 사용할 때 활용
 */
export async function resolveAssemblyUnionId(assemblyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('assemblies')
    .select('union_id')
    .eq('id', assemblyId)
    .single();

  return data?.union_id || null;
}
