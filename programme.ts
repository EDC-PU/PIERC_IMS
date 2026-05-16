'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma'; // Adjust this import to your prisma client path
import { getCurrentUser } from '@/lib/auth'; // Adjust this import to your auth helper

/**
 * Toggles the application status for a given programme.
 * Only accessible by users with the SUPER_ADMIN role.
 * @param programmeId - The ID of the programme to update.
 * @param isOpen - The new application status.
 */
export async function toggleProgrammeStatus(programmeId: string, isOpen: boolean) {
  // 1. Verify Authentication & Authorization
  const user = await getCurrentUser();

  if (!user || user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Update the database
  try {
    await prisma.programme.update({
      where: { id: programmeId },
      data: { isApplicationOpen: isOpen },
    });

    revalidatePath('/settings'); // Revalidate the cache for the settings page
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Database update failed.' };
  }
}