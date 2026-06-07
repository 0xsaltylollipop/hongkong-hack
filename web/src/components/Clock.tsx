import { useState, useEffect } from 'react'

export function Clock() {
  const [time, setTime] = useState('00:00:00.000')

  useEffect(() => {
    function tick() {
      const t = new Date()
      const hms = [t.getHours(), t.getMinutes(), t.getSeconds()]
        .map(n => String(n).padStart(2, '0'))
        .join(':')
      setTime(hms + '.' + String(t.getMilliseconds()).padStart(3, '0'))
    }
    tick()
    const id = setInterval(tick, 71)
    return () => clearInterval(id)
  }, [])

  return <span>{time}</span>
}
