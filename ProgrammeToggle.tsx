'use client';

import { useState, useTransition } from 'react';
import { toggleProgrammeStatus } from '@/app/actions/programme';

type Programme = {
  id: string;
  name: string;
  isApplicationOpen: boolean;
};

export default function ProgrammeToggle({ programme }: { programme: Programme }) {
  const [isOpen, setIsOpen] = useState(programme.isApplicationOpen);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newStatus = !isOpen;
    // Optimistically update the UI immediately
    setIsOpen(newStatus);

    startTransition(async () => {
      const result = await toggleProgrammeStatus(programme.id, newStatus);
      if (!result.success) {
        // If the server action fails, revert the UI and show an alert
        setIsOpen(!newStatus);
        alert(`Error: ${result.error}. Could not update status.`);
      }
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{programme.name}</h3>
        <p className={`text-sm ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
          Applications are currently{' '}
          <span className="font-medium">{isOpen ? 'OPEN' : 'CLOSED'}</span>
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isOpen}
        disabled={isPending}
        onClick={handleToggle}
        className={`${
          isOpen ? 'bg-blue-600' : 'bg-gray-300'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          aria-hidden="true"
          className={`${
            isOpen ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  );
}