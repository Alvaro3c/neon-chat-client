import Avatar from '../../shared/Avatar'
import { getStatusLabel, getStatusDot } from '../../../constants/statuses'
import './ContactList.css'

/**
 * ContactList
 *
 * Scrollable, drag-to-reorder list of contacts.
 * Expects contacts already enriched with liveStatus and liveMood
 * so this component stays purely presentational.
 */
function ContactList({ contacts, openIds, getDragProps, getDropProps, onOpenChat, totalCount }) {
  return (
    <ul className="sidebar__list">
      {contacts.length === 0 ? (
        <li className="sidebar__empty-state">
          {totalCount === 0
            ? 'no conversations yet — start one above!'
            : 'no contacts match ur search'}
        </li>
      ) : (
        contacts.map((contact, index) => {
          const isOpen = openIds.includes(contact.id)
          return (
            <li
              key={contact.id}
              className={[
                'contact-item',
                isOpen ? 'contact-item--open' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onOpenChat(contact.id)}
              {...getDragProps(index)}
              {...getDropProps(index)}
            >
              <span className="contact-item__drag-handle">⠿</span>
              <Avatar
                src={contact.photoURL || undefined}
                emoji={contact.avatar}
                status={getStatusDot(contact.liveStatus)}
                size="md"
              />
              <div className="contact-item__info">
                <p className="contact-item__name">{contact.name}</p>
                <p className="contact-item__mood">{contact.liveMood}</p>
                <p className={`contact-item__status-label contact-item__status-label--${getStatusDot(contact.liveStatus)}`}>
                  {getStatusLabel(contact.liveStatus)}
                </p>
              </div>
              {isOpen && <span className="contact-item__open-dot" title="Chat open" />}
            </li>
          )
        })
      )}
    </ul>
  )
}

export default ContactList
