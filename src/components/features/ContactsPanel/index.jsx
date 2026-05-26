import { useState } from 'react'
import { useChat } from '../../../context/ChatContext'
import useDragAndDrop from '../../../hooks/useDragAndDrop'
import { getStatusDot } from '../../../constants/statuses'
import PanelHeader from '../PanelHeader'
import SearchArea from '../SearchArea'
import ContactList from '../ContactList'
import RequestList from '../RequestList'
import ProfileFooter from '../ProfileFooter'
import './ContactsPanel.css'

/**
 * ContactsPanel
 *
 * Orchestrator: reads context, derives filtered data, and composes
 * PanelHeader + SearchArea + ContactList/RequestList + ProfileFooter.
 * No JSX beyond the root <aside> and its four children.
 */
function ContactsPanel() {
  const {
    contacts, setContacts, openChats, openChat, contactStatuses,
    requests, acceptRequest, declineRequest,
  } = useChat()

  const { getDragProps, getDropProps } = useDragAndDrop(contacts, setContacts)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'online' | 'requests'

  // ── Helpers ───────────────────────────────────────────────
  const getLiveStatus = (contact) =>
    contactStatuses[contact.uid]?.status ?? contact.status

  const getLiveMood = (contact) =>
    contactStatuses[contact.uid]?.mood ?? contact.mood

  // ── Derived data ──────────────────────────────────────────
  const onlineCount = contacts.filter(
    (c) => getStatusDot(getLiveStatus(c)) === 'online'
  ).length

  const openIds = openChats.map((oc) => oc.contactId)

  // Filtered + enriched contacts passed down to ContactList
  const enrichedContacts = contacts
    .filter((c) => {
      const matchName = c.name.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || getStatusDot(getLiveStatus(c)) === 'online'
      return matchName && matchFilter
    })
    .map((c) => ({
      ...c,
      liveStatus: getLiveStatus(c),
      liveMood: getLiveMood(c),
    }))

  // ── Request actions ───────────────────────────────────────
  async function handleAcceptRequest(reqId) {
    await acceptRequest(reqId)
    setFilter('all')
  }

  return (
    <aside className="sidebar">
      <PanelHeader onlineCount={onlineCount} />
      <SearchArea
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        contactCount={contacts.length}
        onlineCount={onlineCount}
        requestCount={requests.length}
        onConvCreated={openChat}
      />
      {filter === 'requests' ? (
        <RequestList
          requests={requests}
          onAccept={handleAcceptRequest}
          onDecline={declineRequest}
        />
      ) : (
        <ContactList
          contacts={enrichedContacts}
          openIds={openIds}
          getDragProps={getDragProps}
          getDropProps={getDropProps}
          onOpenChat={openChat}
          totalCount={contacts.length}
        />
      )}
      <ProfileFooter />
    </aside>
  )
}

export default ContactsPanel
