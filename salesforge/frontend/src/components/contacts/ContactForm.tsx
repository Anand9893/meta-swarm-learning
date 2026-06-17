import { useState } from 'react'
import type { ContactCreate, ContactUpdate } from '../../types/contact'

interface ContactFormProps {
  initialValues?: Partial<ContactUpdate>
  onSubmit: (data: ContactCreate) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

export default function ContactForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: ContactFormProps) {
  const [firstName, setFirstName] = useState(initialValues?.first_name ?? '')
  const [lastName, setLastName] = useState(initialValues?.last_name ?? '')
  const [email, setEmail] = useState(initialValues?.email ?? '')
  const [phone, setPhone] = useState(initialValues?.phone ?? '')
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const isEditing = !!initialValues

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    if (!firstName.trim()) {
      setValidationError('First name is required')
      return
    }
    if (!lastName.trim()) {
      setValidationError('Last name is required')
      return
    }
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      title: title.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {isEditing ? 'Edit Contact' : 'New Contact'}
      </h2>

      {(error ?? validationError) && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error ?? validationError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
            First Name *
          </label>
          <input
            id="first_name"
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
            Last Name *
          </label>
          <input
            id="last_name"
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isEditing ? 'Save Changes' : 'Create Contact'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
