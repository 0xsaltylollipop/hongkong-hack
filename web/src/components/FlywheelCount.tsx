import { useState, useEffect } from 'react'

interface FlywheelCountProps {
  initial?: number
}

export function FlywheelCount({ initial = 1248 }: FlywheelCountProps) {
  const [count, setCount] = useState(initial)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(v => v + (Math.random() < 0.6 ? 1 : 0))
    }, 1400)
    return () => clearInterval(id)
  }, [])

  return <span>{count.toLocaleString()}</span>
}
