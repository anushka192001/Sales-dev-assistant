'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Bookmark } from 'lucide-react';

interface SaveSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (searchName: string) => void;
}

export const SaveSearchModal: React.FC<SaveSearchModalProps> = ({ isOpen, onClose, onSave }) => {
    const [searchName, setSearchName] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (dialogRef.current) {
            if (isOpen) {
                if (!dialogRef.current.open) {
                    dialogRef.current.showModal();
                }
            } else {
                if (dialogRef.current.open) {
                    dialogRef.current.close();
                }
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleCancel = (event: Event) => {
            event.preventDefault();
            onClose();
        };

        const handleClose = () => {
            onClose();
        };

        dialog.addEventListener('cancel', handleCancel);
        dialog.addEventListener('close', handleClose);

        return () => {
            dialog.removeEventListener('cancel', handleCancel);
            dialog.removeEventListener('close', handleClose);
        };
    }, [onClose]);

    const handleSave = () => {
        if (searchName.trim()) {
            onSave(searchName.trim());
            setSearchName('');
            if (dialogRef.current) {
                dialogRef.current.close();
            }
        } else {
            console.log('Search name cannot be empty.');
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className="rounded-lg shadow-2xl w-full max-w-md"
        >
            <div className="flex justify-between items-center border-b pb-4 mb-4 px-4 py-4">
                <h2 className="flex items-center text-lg font-semibold text-gray-800">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 border border-blue-200 mr-3">
                        <Bookmark className="h-4 w-4 text-blue-600" />
                    </div>
                    Save Your Search
                </h2>
                <button
                    onClick={() => dialogRef.current?.close()}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label="Close modal"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="px-4 py-4">
                <input
                    type="text"
                    className="w-full px-4 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black-700 placeholder-gray-400"
                    placeholder="Enter Unique Search Name"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            </div>
            <div className="flex justify-end space-x-2 pt-4 px-4 py-4">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    Save
                </button>
            </div>
        </dialog>
    );
};