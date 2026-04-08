export interface Citation {
  id: number
  short_research_tag?: string
  citation_type?: string
  title_of_paper?: string
  publication_cited?: string
  year_of_publication_cited?: number
  faculty: string
  cited_in?: string
  year_of_government_publication?: number
  publisher?: string
  link?: string
  policy_area?: string
  notes?: string
  is_auto_detected: boolean
  created_at: string
  updated_at?: string
}

export interface ReviewQueueItem {
  id: number
  short_research_tag?: string
  citation_type?: string
  title_of_paper?: string
  publication_cited?: string
  year_of_publication_cited?: number
  policy_area?: string
  notes?: string
  faculty: string
  cited_in?: string
  year_of_government_publication?: number
  publisher?: string
  link?: string
  matched_text?: string
  confidence_score?: number
  source_id?: number
  status: string
  created_at: string
}

export interface Person {
  id: number
  full_name: string
  name_variations: string[]
  title?: string
  role?: string
  department?: string
  is_active: boolean
  created_at: string
}

export interface Source {
  id: number
  name: string
  url: string
  source_type: string
  agency_group?: string
  is_enabled: boolean
  last_checked?: string
  check_frequency: string
  config: Record<string, unknown>
  created_at: string
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  items: T[]
}

export interface OverviewStats {
  total_citations: number
  pending_review: number
  total_people: number
  total_sources: number
  recent_citations: Citation[]
  top_faculty: { faculty: string; count: number }[]
}

export interface CitationFilters {
  faculty?: string
  publisher?: string
  policy_area?: string
  citation_type?: string
  year_gov?: number
  year_pub?: number
  search?: string
  page?: number
  page_size?: number
}
