import * as React from 'react'
import { useSearchParams } from 'react-router-dom'

export interface TablePaginationOptions {
  defaultPage?: number
  defaultPageSize?: number
  defaultSortBy?: string
  defaultSortOrder?: 'asc' | 'desc'
  defaultFilters?: Record<string, string>
}

export function useTablePagination(options: TablePaginationOptions = {}) {
  const {
    defaultPage = 1,
    defaultPageSize = 10,
    defaultSortBy = 'created_at',
    defaultSortOrder = 'desc',
    defaultFilters = {},
  } = options

  const [searchParams, setSearchParams] = useSearchParams()

  // Keep a synchronous reference to the latest URLSearchParams so multiple updates
  // in the same event handler (e.g. setFilter + setPage) compose instead of overwriting each other
  const latestParamsRef = React.useRef<URLSearchParams>(new URLSearchParams(searchParams))
  const prevRenderedSearchRef = React.useRef<string>(searchParams.toString())

  const currentSearchStr = searchParams.toString()
  if (prevRenderedSearchRef.current !== currentSearchStr) {
    prevRenderedSearchRef.current = currentSearchStr
    latestParamsRef.current = new URLSearchParams(searchParams)
  }

  // Read current params from URL
  const page = parseInt(searchParams.get('page') || String(defaultPage), 10) || defaultPage
  const pageSize = parseInt(searchParams.get('pageSize') || String(defaultPageSize), 10) || defaultPageSize
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sortBy') || defaultSortBy
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || defaultSortOrder

  // Get additional custom filters from URL
  const filters: Record<string, string> = React.useMemo(() => {
    const result: Record<string, string> = { ...defaultFilters }
    searchParams.forEach((value, key) => {
      if (!['page', 'pageSize', 'search', 'sortBy', 'sortOrder'].includes(key)) {
        result[key] = value
      }
    })
    return result
  }, [searchParams, defaultFilters])

  // Helper to update URL params cleanly
  const updateParams = React.useCallback(
    (updater: (prev: URLSearchParams) => void) => {
      const next = new URLSearchParams(latestParamsRef.current)
      updater(next)
      latestParamsRef.current = next
      setSearchParams(next, { replace: true })
    },
    [setSearchParams]
  )

  const setPage = React.useCallback(
    (newPage: number) => {
      updateParams((params) => {
        if (newPage === defaultPage) {
          params.delete('page')
        } else {
          params.set('page', String(newPage))
        }
      })
    },
    [updateParams, defaultPage]
  )

  const setPageSize = React.useCallback(
    (newSize: number) => {
      updateParams((params) => {
        if (newSize === defaultPageSize) {
          params.delete('pageSize')
        } else {
          params.set('pageSize', String(newSize))
        }
        params.delete('page') // reset to page 1 on page size change
      })
    },
    [updateParams, defaultPageSize]
  )

  const setSearch = React.useCallback(
    (newSearch: string) => {
      updateParams((params) => {
        if (!newSearch) {
          params.delete('search')
        } else {
          params.set('search', newSearch)
        }
        params.delete('page') // reset to page 1 on search change
      })
    },
    [updateParams]
  )

  const toggleSort = React.useCallback(
    (column: string) => {
      updateParams((params) => {
        const currentSortBy = params.get('sortBy') || defaultSortBy
        const currentSortOrder = params.get('sortOrder') || defaultSortOrder

        if (currentSortBy === column) {
          if (currentSortOrder === 'asc') {
            params.set('sortOrder', 'desc')
          } else {
            // Reset to default or flip
            params.set('sortOrder', 'asc')
          }
        } else {
          params.set('sortBy', column)
          params.set('sortOrder', 'asc')
        }
      })
    },
    [updateParams, defaultSortBy, defaultSortOrder]
  )

  const setFilter = React.useCallback(
    (key: string, value: string | null | undefined) => {
      updateParams((params) => {
        const valStr = value !== null && value !== undefined ? String(value).trim() : ''
        if (
          !valStr ||
          valStr.toUpperCase() === 'ALL' ||
          valStr.toLowerCase() === 'all' ||
          valStr.toLowerCase() === 'todos' ||
          valStr.toUpperCase() === 'TODOS'
        ) {
          params.delete(key)
        } else {
          params.set(key, valStr)
        }
        params.delete('page') // reset to page 1 on filter change
      })
    },
    [updateParams]
  )

  const resetAll = React.useCallback(() => {
    const empty = new URLSearchParams()
    latestParamsRef.current = empty
    setSearchParams(empty, { replace: true })
  }, [setSearchParams])

  return {
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setPageSize,
    setSearch,
    toggleSort,
    setFilter,
    resetAll,
  }
}
