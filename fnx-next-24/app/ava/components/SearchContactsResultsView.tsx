import React, { useState, useCallback } from 'react';
import {
  MapPin,
  Users,
  Linkedin,
  Briefcase,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Lock,
  AlertCircle,
  Mail,
  Plus,
  X,
  Calendar,
  Clock,
  FileText,
  Tag,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  designation: string;
  seniority: string;
  functional_level: string;
  company_name: string;
  industry: string;
  location: string;
  email: string | null;
  linkedin: string | null;
  unlocked: boolean;
  primary_email?: string;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  location?: string;
}

interface SearchData {
  contacts: Contact[];
  companies: Company[];
  summary?: string;
}

interface SearchResultsViewProps {
  message: string;
  data: SearchData;
  onGenerateEmail: (company: string, contact: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onContactsUpdate?: (contacts: Contact[]) => void;
  onCreateCadence?: (selectedContacts: Contact[]) => void;
  onAddToExistingCadence?: (selectedContacts: Contact[]) => void;
  messageId?: string;
  apiBaseUrl?: string;
  userId?: string;
  apiKey?: string;
}

interface UnlockResponse {
  unlockedContactData?: Array<{
    contactId: string;
    primaryEmail: string;
  }>;
  success?: boolean;
  error?: string;
}

interface CadenceFormData {
  name: string;
  tags: string[];
  startDate: string;
  startTime: string;
  whiteDays: string[];
  emailSubject: string;
  emailBody: string;
}

const WEEK_DAYS = [
  { value: 'Mo', label: 'Monday' },
  { value: 'Tu', label: 'Tuesday' },
  { value: 'We', label: 'Wednesday' },
  { value: 'Th', label: 'Thursday' },
  { value: 'Fr', label: 'Friday' },
  { value: 'Sa', label: 'Saturday' },
  { value: 'Su', label: 'Sunday' },
];

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  message,
  data,
  onScrollToMessage,
  onContactsUpdate,
  onCreateCadence,
  messageId,
  apiBaseUrl = 'http://localhost:8000/',
  userId = '68400fdecc7f4762201b755f',
}) => {
  const { contacts: initialContacts, summary } = data;
  console.log("SearchResultsView rendered with data:", data);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // const [loadingBulk, setLoadingBulk] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState<string | null>(null);
  const [loadingCadence, setLoadingCadence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCadenceModal, setShowCadenceModal] = useState(false);
  const [currentTag, setCurrentTag] = useState('');
  const [showSelectContactsAlert, setShowSelectContactsAlert] = useState(false);

  // Initialize form with default values
  const getDefaultFormData = (): CadenceFormData => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      name: '',
      tags: [],
      startDate: tomorrow.toISOString().split('T')[0],
      startTime: '09:00',
      whiteDays: ['Mo', 'Tu', 'We', 'Th', 'Fr'],
      emailSubject: '',
      emailBody: '',
    };
  };

  const [cadenceForm, setCadenceForm] = useState<CadenceFormData>(getDefaultFormData());

  const hasContacts = contacts?.length > 0;
  const hasSelectedContacts = selected.size > 0;
  const selectedContacts = contacts?.filter(contact => selected.has(contact.id));

  const unlockEmail = useCallback(async (id: string) => {
    setLoadingUnlock(id);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}proxy/unlock_bulk_contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [id], source: 'search', compCount: 999999970 }),
      });
      const result: UnlockResponse = await res.json();
      const unlocked = result.unlockedContactData?.find(c => c.contactId === id);
      if (unlocked) {
        const updatedContacts = contacts.map(c =>
          c.id === id ? { ...c, unlocked: true, primary_email: unlocked.primaryEmail } : c
        );
        setContacts(updatedContacts);
        onContactsUpdate?.(updatedContacts);
      }
    } catch {
      setError('Failed to unlock contact');
    } finally {
      setLoadingUnlock(null);
    }
  }, [contacts, apiBaseUrl, onContactsUpdate]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleCreateCadenceAPI = async (formData: CadenceFormData) => {
    if (!formData.name.trim()) {
      setError('Cadence name is required');
      return;
    }

    if (!formData.emailSubject.trim() || !formData.emailBody.trim()) {
      setError('Email subject and body are required');
      return;
    }

    setLoadingCadence(true);
    setError(null);

    try {
      const startDate = new Date(formData.startDate);
      const [hour, minute] = formData.startTime.split(':').map(Number);

      const payload = {
        name: formData.name,
        type: "constant",
        tags: formData.tags,
        schedule: {
          startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate(),
          },
          startTime: {
            hour: hour,
            minute: minute,
            second: 0,
          },
          whiteDays: formData.whiteDays,
        },
        listType: "",
        listId: null,
        toEmails: [],
        steps: [],
        isActive: true,
        status: "paused",
        copyTempPhases: false,
        userId: userId,
        template: { "body": formData.emailBody, "subject": formData.emailSubject },
        recipients: selectedContacts.map(c => c.id),
      };

      console.log('Creating cadence with payload:', payload);

      console.log(`before creating cadencecreate response-->`);
      // Create cadence
      const cadenceResponse = await fetch(`${apiBaseUrl}proxy/create_new_cadence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      console.log(`cadencecreate response-->${cadenceResponse}`);

      if (!cadenceResponse.ok) {
        throw new Error(`Failed to create cadence: ${cadenceResponse.statusText}`);
      }

      const cadenceResult = await cadenceResponse.json();
      const cadenceId = cadenceResult._id?.$oid || cadenceResult._id;

      console.log('Cadence created:', cadenceResult);

      // Clear selection and close modal
      setSelected(new Set());
      setShowCadenceModal(false);
      setCadenceForm(getDefaultFormData());

      // Success message
      setError(null);
      console.log('Cadence created successfully with ID:', cadenceId);

      // Call the callback if provided
      if (onCreateCadence) {
        await onCreateCadence(selectedContacts);
      }

    } catch (err) {
      console.error('Error creating cadence:', err);
      setError(`Failed to create cadence: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingCadence(false);
    }
  };

  const handleCreateCadence = useCallback(async () => {
    // Check if no contacts are selected
    if (selected.size === 0) {
      setShowSelectContactsAlert(true);
      // Auto-hide alert after 3 seconds
      setTimeout(() => {
        setShowSelectContactsAlert(false);
      }, 3000);
      return;
    }

    setShowCadenceModal(true);
  }, [selected.size]);

  const selectAll = useCallback(() => {
    setSelected(new Set(contacts.map(c => c.id)));
  }, [contacts]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleFormChange = (field: keyof CadenceFormData, value: any) => {
    setCadenceForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWhiteDayToggle = (day: string) => {
    setCadenceForm(prev => ({
      ...prev,
      whiteDays: prev.whiteDays.includes(day)
        ? prev.whiteDays.filter(d => d !== day)
        : [...prev.whiteDays, day]
    }));
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !cadenceForm.tags.includes(currentTag.trim())) {
      setCadenceForm(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCadenceForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const isFormValid = cadenceForm.name.trim() && cadenceForm.emailSubject.trim() && cadenceForm.emailBody.trim();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">Search Results</span>
        </div>
        {onScrollToMessage && messageId && (
          <button
            onClick={() => onScrollToMessage(messageId)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Go to message
          </button>
        )}
      </div>

      <p className="text-gray-800 mb-4">{summary || message}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Alert for no contacts selected */}
      {showSelectContactsAlert && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 transition-all duration-300">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <span className="text-yellow-700 text-sm">Please select at least one contact to create a cadence.</span>
          <button
            onClick={() => setShowSelectContactsAlert(false)}
            className="ml-auto text-yellow-600 hover:text-yellow-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!hasContacts && <p className="text-gray-500 italic">No contacts found.</p>}

      {hasContacts && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Select All
            </button>
            {hasSelectedContacts && (
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline"
              >
                Clear Selection
              </button>
            )}
            {hasSelectedContacts && (
              <span className="text-sm text-gray-600">
                {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          {/* Always show the Create Cadence button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateCadence}
              disabled={loadingCadence}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${hasSelectedContacts
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loadingCadence ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              New Cadence
              {hasSelectedContacts && ` (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {contacts?.map(contact => (
          <div
            key={contact.id}
            className="p-4 border border-gray-200 rounded-lg shadow-sm flex items-start justify-between gap-4"
          >
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(contact.id)}
                onChange={() => toggleSelect(contact.id)}
                className="mt-1"
              />
              <div>
                <h4 className="text-md font-semibold text-gray-900">{contact.name}</h4>
                <p className="text-sm text-gray-700">{contact.designation} at {contact.company_name}</p>
                <div className="text-xs text-gray-500 mt-1">
                  <p><Briefcase className="inline w-3 h-3 mr-1" /> {contact.industry}</p>
                  <p><MapPin className="inline w-3 h-3 mr-1" /> {contact.location}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {contact.linkedin ? (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 text-sm hover:text-gray-800 hover:underline flex items-center gap-1"
                >
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              ) : (
                <span className="text-gray-400 text-sm">No LinkedIn</span>
              )}
              <div className="text-sm">
                {contact.unlocked ? (
                  <span className="text-green-600 inline-flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> {contact.primary_email || 'Email N/A'}
                  </span>
                ) : (
                  <button
                    disabled={loadingUnlock === contact.id}
                    onClick={() => unlockEmail(contact.id)}
                    className="text-gray-600 hover:text-gray-800 hover:underline inline-flex items-center gap-1 text-sm disabled:opacity-50"
                  >
                    {loadingUnlock === contact.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    Unlock
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cadence Creation Modal */}
      {showCadenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create New Cadence</h3>
                <button
                  onClick={() => setShowCadenceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Creating cadence for {selected.size} selected contact{selected.size !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Cadence Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cadence Name *
                </label>
                <input
                  type="text"
                  value={cadenceForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Enter cadence name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cadenceForm.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={cadenceForm.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="inline w-4 h-4 mr-1" />
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={cadenceForm.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* White Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Active Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map(day => (
                    <button
                      key={day.value}
                      onClick={() => handleWhiteDayToggle(day.value)}
                      className={`px-3 py-1 text-xs rounded-full border ${cadenceForm.whiteDays.includes(day.value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email Subject *
                </label>
                <input
                  type="text"
                  value={cadenceForm.emailSubject}
                  onChange={(e) => handleFormChange('emailSubject', e.target.value)}
                  placeholder="Enter email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="inline w-4 h-4 mr-1" />
                  Email Body *
                </label>
                <textarea
                  value={cadenceForm.emailBody}
                  onChange={(e) => handleFormChange('emailBody', e.target.value)}
                  placeholder="Enter email body content"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCadenceModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateCadenceAPI(cadenceForm)}
                disabled={!isFormValid || loadingCadence}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingCadence ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Cadence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};