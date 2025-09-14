import { FiltersPeople } from '@/components/search/people/Filters'
import { ResultsPeople } from '@/components/search/people/Results'

export default function PeopleSearchPage() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="col-span-1">
        <FiltersPeople />
      </div>
      <div className="col-span-3">
        <ResultsPeople />
      </div>
    </div>
  )
}
