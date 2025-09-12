export async function closePosition(positionId: string, tradingAccountId: string) {
  try {
    const response = await fetch('/api/trading/positions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        positionId,
        tradingAccountId
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to close position')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error closing position:', error)
    throw error
  }
}
