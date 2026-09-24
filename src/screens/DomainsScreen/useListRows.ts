// src/screens/DomainsScreen/useListRows.ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useClaims } from '@/client/queries';
import { useNow } from '@/client/useNow';
import type { ClaimDTO } from '@/lib/claims/dto';
import { activeFilter, isSort, type ListRow, type ListSort } from '@/lib/claims/listView';
import { claimRowView } from '@/lib/claims/row';

/**
 * The claims with their row views, and the filter and sort from the URL. The URL holds them, as
 * before the rebuild, so a reload or a shared link keeps the view.
 */
export const useListRows = () => {
  const { data: claims, mutate } = useClaims();
  const now = useNow();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const rows = useMemo<ListRow<ClaimDTO>[] | null>(
    () =>
      claims === undefined || now === null
        ? null
        : claims.map((claim) => ({ claim, view: claimRowView(claim, now) })),
    [claims, now],
  );

  const filter = rows === null ? null : activeFilter(rows, params.get('status'));
  const sortParam = params.get('sort');
  const sort: ListSort = isSort(sortParam) ? sortParam : 'attention';

  const set = (key: 'status' | 'sort', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const query = next.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
  };

  return { claims, rows, filter, sort, set, refresh: mutate };
};
