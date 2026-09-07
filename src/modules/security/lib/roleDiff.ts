export interface RoleDiff {
  associate: string[]
  disassociate: string[]
}

export const roleDiff = (assigned: readonly string[], staged: readonly string[]): RoleDiff => {
  const assignedSet = new Set(assigned)
  const stagedSet = new Set(staged)
  return {
    associate: [...stagedSet].filter((id) => !assignedSet.has(id)),
    disassociate: [...assignedSet].filter((id) => !stagedSet.has(id)),
  }
}

export const hasChanges = (diff: RoleDiff): boolean => diff.associate.length > 0 || diff.disassociate.length > 0
