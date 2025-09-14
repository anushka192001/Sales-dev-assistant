import React, { useState } from 'react';
import { Mail, Copy, Edit, Send, Check, ArrowLeft } from 'lucide-react';
import { EmailData } from '../types/api';

interface EmailGeneratedViewProps {
  message: string;
  data: {
    email: EmailData;
  };
  onScrollToMessage?: (messageId: string) => void;
  messageId?: string;
}

export const EmailGeneratedView: React.FC<EmailGeneratedViewProps> = ({
  message,
  data,
  onScrollToMessage,
  messageId
}) => {
  console.log("data",data)
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Extract subject and body from the new data structure
  //@ts-ignore
  const subject = data.subject || 'No Subject';
    //@ts-ignore
  const body = data.body || '';

  const [editedContent, setEditedContent] = useState(body);
  const [editedSubject, setEditedSubject] = useState(subject);

  const handleCopy = async () => {
    try {
      const fullEmail = `Subject: ${editedSubject}\n\n${editedContent}`;
      await navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Generated Email</h3>
              <p className="text-sm text-gray-600">Ready to send</p>
            </div>
          </div>
          {onScrollToMessage && messageId && (
            <button
              onClick={() => onScrollToMessage(messageId)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to message
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-gray-800 mb-6 leading-relaxed">{message}</p>

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">Email Details</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Subject:</label>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  />
                ) : (
                  <div className="text-gray-900 font-medium">{editedSubject}</div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Message:</label>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-gray-900 font-sans leading-relaxed">
                    {editedContent}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            {isEditing ? 'Save' : 'Edit'}
          </button>

          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};