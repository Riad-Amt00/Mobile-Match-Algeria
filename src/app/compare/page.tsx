import CompareContent from './compare-content'

interface Props {
  searchParams: Promise<{ ids?: string | string[]; from?: string | string[] }>
}

export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams
  const ids = Array.isArray(params.ids) ? params.ids[0] : (params.ids || '')
  const from = Array.isArray(params.from) ? params.from[0] : (params.from || '')
  return (
    <CompareContent
      initialIds={ids}
      fromRecommend={from === 'recommend'}
      fromSaved={from === 'saved'}
    />
  )
}
