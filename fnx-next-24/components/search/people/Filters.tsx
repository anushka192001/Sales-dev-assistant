'use client'

import { Card } from '@/components/ui/card'

export function FiltersPeople() {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-semibold mb-4">Filters</h2>
      {/* Add your filter controls here */}
      <div className="space-y-4">
        {/* Example filter sections */}
        <div>
          <h3 className="font-medium mb-2">Location</h3>
          {/* Location filters */}
        </div>
        <div>
          <h3 className="font-medium mb-2">Job Title</h3>
          {/* Job title filters */}
        </div>
        <div>
          <h3 className="font-medium mb-2">Company</h3>
          {/* Company filters */}
        </div>
      </div>
    </Card>
  )
} 