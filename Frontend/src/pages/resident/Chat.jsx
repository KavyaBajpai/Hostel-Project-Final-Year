import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const socketRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!user?.token) return
    const socket = io('http://localhost:5000/resident-chat', {
      auth: { token: user.token },
    })
    console.log(user.token)
    socketRef.current = socket

    socket.on('message', (msg) => {
      setMessages((m)=>[...m, msg])
    })
    socket.on('presence', (evt) => {
      setMessages((m)=>[...m, { system: true, text: evt.type === 'join' ? 'Someone joined' : 'Someone left', ts: Date.now() }])
    })

    return () => { socket.disconnect() }
  }, [user?.token])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages.length])

  function sendMessage(e){
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    socketRef.current?.emit('message', { text })
    setInput('')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Hostel Chat</h3>
      <p className="text-sm text-gray-600">Chat with residents of your hostel.</p>
      <div ref={listRef} className="mt-4 h-96 overflow-y-auto border rounded bg-white p-3 space-y-2">
        {messages.map((m, i)=> (
          <div key={i} className={`text-sm ${m.system ? 'text-gray-500' : ''}`}>
            {m.system ? (
              <em>{m.text}</em>
            ) : (
              <span>{m.userId === user?.id ? 'You' : m.userName||`User ${m.userId}`}: {m.text}</span>
            )}
          </div>
        ))}
        {messages.length===0 && <div className="text-sm text-gray-500">No messages yet.</div>}
      </div>
      <form onSubmit={sendMessage} className="mt-3 flex gap-2">
        <input value={input} onChange={(e)=>setInput(e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm" placeholder="Type a message" />
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white">Send</button>
      </form>
    </div>
  )
}


