'use client'

import { Card } from '@/components/ui/card'

export function ResultsPeople() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Search Results</h2>
        <div className="text-sm text-gray-500">
          Showing 0 results
        </div>
      </div>
      
      <div className="grid gap-4">
        {/* Example result card */}
        <Card className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-medium">John Doe</h3>
              <p className="text-sm text-gray-500">Software Engineer at Example Corp</p>
              <p className="text-sm text-gray-500">San Francisco, CA</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 