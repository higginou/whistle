/**
 * Determine verdict display tier.
 * @param {"win"|"loss"|"draw"} result
 * @param {"large"|"medium"|"close"} magnitude
 * @param {{ offensive: boolean, defensive: boolean }} lrBonus
 * @returns {"win-large"|"win-small"|"draw"|"loss-small"|"loss-large"}
 */
export function getVerdictTier(result, magnitude, lrBonus) {
  if (result === 'draw') return 'draw'
  if (result === 'win') {
    if (magnitude === 'large' || lrBonus.offensive) return 'win-large'
    return 'win-small'
  }
  // loss
  if (magnitude === 'close' || lrBonus.defensive) return 'loss-small'
  return 'loss-large'
}
