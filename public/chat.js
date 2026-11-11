// Plain JavaScript on purpose: no build step. All text from the API is inserted with
// textContent, never innerHTML, so a message cannot inject HTML or scripts (XSS).
const $ = (id) => document.getElementById(id)
const state = {
  user: null,
  socket: null,
  conversationId: null,
  conversations: new Map(),
  renderedIds: new Set(),
  nextCursor: null,
  typingTimer: null,
  lastTypingSentAt: 0,
}
const mySide = () => (state.user.role === 'patient' ? 'patient' : 'clinic')
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const emptyNote = (text) => {
  const note = document.createElement('p')
  note.className = 'empty'
  note.textContent = text
  return note
}
const showError = (id, message) => {
  $(id).textContent = message ?? ''
}

// fetch() sends the httpOnly session cookie automatically (same origin)
const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  })
  const body = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
  return body
}

// ----- Rendering -----

const renderInbox = () => {
  const inbox = $('inbox')
  inbox.replaceChildren()
  const sorted = [...state.conversations.values()].sort((a, b) =>
    (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''),
  )
  if (sorted.length === 0) {
    inbox.append(emptyNote('No conversations yet'))
  }
  for (const conversation of sorted) {
    const item = document.createElement('button')
    item.className = conversation.id === state.conversationId ? 'active' : ''
    const name = document.createElement('span')
    name.textContent = `${conversation.patient.firstName} ${conversation.patient.lastName}`
    if (conversation.status === 'closed') name.textContent += ' (closed)'
    item.append(name)
    if (conversation.unreadCount > 0) {
      const badge = document.createElement('span')
      badge.className = 'badge'
      badge.textContent = String(conversation.unreadCount)
      item.append(badge)
    }
    item.addEventListener('click', () => void openConversation(conversation.id))
    inbox.append(item)
  }
}

const renderHeader = () => {
  const conversation = state.conversations.get(state.conversationId)
  const isStaff = mySide() === 'clinic'
  if (!conversation) {
    $('conversationTitle').textContent = isStaff
      ? 'Select a conversation'
      : 'Write your first message to the clinic'
    $('readInfo').hidden = true
    $('toggleStatus').hidden = true
    return
  }
  $('conversationTitle').textContent = isStaff
    ? `${conversation.patient.firstName} ${conversation.patient.lastName}`
    : 'Clinic front desk'
  // Read receipt: when the other side last read the conversation
  const otherReadAt = isStaff ? conversation.patientLastReadAt : conversation.clinicLastReadAt
  $('readInfo').hidden = !otherReadAt
  if (otherReadAt) $('readInfo').textContent = `Seen ${formatTime(otherReadAt)}`
  $('toggleStatus').hidden = !isStaff
  $('toggleStatus').textContent = conversation.status === 'open' ? 'Close' : 'Reopen'
}

const messageElement = (message) => {
  const element = document.createElement('div')
  element.className = message.senderId === state.user.id ? 'message mine' : 'message'
  element.textContent = message.body
  const time = document.createElement('small')
  time.textContent = formatTime(message.createdAt)
  element.append(time)
  return element
}

// The sender gets a message twice (callback and "message:new"): ids avoid duplicates
const appendMessage = (message) => {
  if (state.renderedIds.has(message.id)) return
  state.renderedIds.add(message.id)
  const list = $('messages')
  list.querySelector('.empty')?.remove()
  list.append(messageElement(message))
  list.scrollTop = list.scrollHeight
}

const renderOlderButton = () => {
  $('messages').querySelector('#older')?.remove()
  if (!state.nextCursor) return
  const button = document.createElement('button')
  button.id = 'older'
  button.textContent = 'Load older messages'
  button.addEventListener('click', () => void loadOlder())
  $('messages').prepend(button)
}

// ----- Actions -----

const upsertConversation = (conversation) => {
  state.conversations.set(conversation.id, conversation)
  if (mySide() === 'clinic') renderInbox()
  if (conversation.id === state.conversationId) renderHeader()
}

const markAsRead = () => {
  if (!state.conversationId || document.visibilityState !== 'visible') return
  state.socket.emit('conversation:read', { conversationId: state.conversationId }, () => {})
}

const openConversation = async (conversationId) => {
  state.conversationId = conversationId
  state.renderedIds.clear()
  $('messages').replaceChildren()
  const page = await api(`/conversations/${conversationId}/messages?limit=30`)
  if (page.messages.length === 0) $('messages').append(emptyNote('No messages yet'))
  page.messages.forEach(appendMessage)
  state.nextCursor = page.nextCursor
  renderOlderButton()
  renderHeader()
  if (mySide() === 'clinic') renderInbox()
  markAsRead()
}

const loadOlder = async () => {
  const page = await api(
    `/conversations/${state.conversationId}/messages?limit=30&before=${state.nextCursor}`,
  )
  const list = $('messages')
  const previousHeight = list.scrollHeight
  for (const message of [...page.messages].reverse()) {
    if (state.renderedIds.has(message.id)) continue
    state.renderedIds.add(message.id)
    list.prepend(messageElement(message))
  }
  state.nextCursor = page.nextCursor
  renderOlderButton()
  // Keep the view where it was instead of jumping to the top
  list.scrollTop = list.scrollHeight - previousHeight
}

const sendMessage = (body) => {
  const payload = state.conversationId ? { conversationId: state.conversationId, body } : { body }
  // timeout(): the callback gets an error if the server does not answer in 5 s
  state.socket.timeout(5000).emit('message:send', payload, (timeoutError, response) => {
    if (timeoutError) return showError('chatError', 'The server did not answer')
    if (!response.ok) return showError('chatError', response.error)
    showError('chatError', '')
    // A patient's first message creates the conversation
    if (!state.conversationId) state.conversationId = response.data.message.conversationId
    appendMessage(response.data.message)
  })
}

// ----- Socket.IO -----

const connectSocket = () => {
  // The handshake carries the session cookie, as any request to this origin does
  const socket = io()
  state.socket = socket

  socket.on('connect', () => {
    $('status').textContent = 'online'
    $('status').className = 'pill online'
    showError('chatError', '')
  })
  socket.on('disconnect', (reason) => {
    $('status').textContent = 'offline'
    $('status').className = 'pill'
    // The server closed it (session expired or account disabled): do not retry
    if (reason === 'io server disconnect') showError('chatError', 'Session closed by the server')
  })
  socket.on('connect_error', (error) => showError('chatError', error.message))

  socket.on('message:new', ({ message, conversation }) => {
    if (!state.conversationId && mySide() === 'patient') {
      state.conversationId = conversation.id
    }
    upsertConversation(conversation)
    if (message.conversationId !== state.conversationId) return
    appendMessage(message)
    if (message.senderId !== state.user.id) markAsRead()
  })

  socket.on('conversation:updated', ({ conversation }) => upsertConversation(conversation))

  socket.on('typing', ({ conversationId, side }) => {
    if (conversationId !== state.conversationId || side === mySide()) return
    $('typing').textContent =
      side === 'patient' ? 'The patient is typing…' : 'The clinic is typing…'
    clearTimeout(state.typingTimer)
    state.typingTimer = setTimeout(() => ($('typing').textContent = ''), 3000)
  })
}

// ----- Start -----

const start = async (user) => {
  state.user = user
  $('login').hidden = true
  $('logout').hidden = false
  $('whoami').textContent = `${user.email} (${user.role})`
  if (user.role !== 'patient' && user.role !== 'employee') {
    $('whoami').textContent += ' — the chat is only for patients and front desk staff'
    return
  }
  $('app').hidden = false
  $('app').className = user.role
  $('inbox').hidden = user.role === 'patient'
  connectSocket()

  if (user.role === 'employee') {
    const { conversations } = await api('/conversations?pageSize=100')
    conversations.forEach((conversation) => state.conversations.set(conversation.id, conversation))
    renderInbox()
    renderHeader()
  } else {
    const { conversation } = await api('/conversations/me')
    if (conversation) {
      state.conversations.set(conversation.id, conversation)
      await openConversation(conversation.id)
    } else {
      renderHeader()
    }
  }
}

$('login').addEventListener('submit', async (event) => {
  event.preventDefault()
  try {
    const { user } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('email').value, password: $('password').value }),
    })
    showError('loginError', '')
    await start(user)
  } catch (error) {
    showError('loginError', error.message)
  }
})

$('logout').addEventListener('click', async () => {
  state.socket?.disconnect()
  await api('/auth/logout', { method: 'POST' })
  location.reload()
})

$('composer').addEventListener('submit', (event) => {
  event.preventDefault()
  const body = $('body').value.trim()
  if (!body) return
  if (mySide() === 'clinic' && !state.conversationId) {
    return showError('chatError', 'Select a conversation first')
  }
  sendMessage(body)
  $('body').value = ''
})

// At most one "typing" event every 2 seconds
$('body').addEventListener('input', () => {
  if (!state.conversationId || Date.now() - state.lastTypingSentAt < 2000) return
  state.lastTypingSentAt = Date.now()
  state.socket.emit('typing', { conversationId: state.conversationId })
})

$('toggleStatus').addEventListener('click', async () => {
  const conversation = state.conversations.get(state.conversationId)
  const status = conversation.status === 'open' ? 'closed' : 'open'
  try {
    const response = await api(`/conversations/${state.conversationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    upsertConversation(response.conversation)
  } catch (error) {
    showError('chatError', error.message)
  }
})

// Coming back to the tab marks the open conversation as read
document.addEventListener('visibilitychange', markAsRead)

// Reuse an existing session if the cookie is still valid
api('/auth/me')
  .then(({ user }) => start(user))
  .catch(() => ($('login').hidden = false))
