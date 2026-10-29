export interface PersonNode {
  id: string
  full_name: string
  gender: 'male' | 'female' | 'other'
  birth_year: number | null
  birth_month?: number | null
  birth_day?: number | null
  birth_order: number | null
  generation: number | null
  is_in_law: boolean
  avatar_url?: string | null
}

export interface RelEdge {
  type: string
  person_a: string
  person_b: string
}

export const getGenderStyle = (gender: string) => {
  if (gender === 'male') return 'bg-sky-100 text-sky-600'
  if (gender === 'female') return 'bg-rose-100 text-rose-600'
  return 'bg-stone-100 text-stone-600'
}
