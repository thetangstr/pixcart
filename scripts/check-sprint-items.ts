#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSprintItems() {
  try {
    // Get active sprint
    const activeSprint = await prisma.sprint.findFirst({
      where: {
        status: 'ACTIVE'
      },
      include: {
        feedbacks: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          },
          orderBy: {
            priority: 'desc'
          }
        }
      }
    });

    if (!activeSprint) {
      console.log('📋 No active sprint found.');
      
      // Show scheduled feedback not in any sprint
      const scheduledFeedback = await prisma.feedback.findMany({
        where: {
          status: 'SCHEDULED',
          sprintId: null
        },
        include: {
          user: {
            select: {
              email: true,
              name: true
            }
          }
        },
        orderBy: {
          priority: 'desc'
        }
      });

      if (scheduledFeedback.length > 0) {
        console.log('\n⏳ Scheduled feedback waiting for sprint assignment:');
        scheduledFeedback.forEach(fb => {
          console.log(`
ID: ${fb.id}
Priority: ${fb.priority}
Type: ${fb.type}
User: ${fb.user.name || fb.user.email}
Message: ${fb.message}
${fb.expectedBehavior ? `Expected: ${fb.expectedBehavior}` : ''}
${fb.actualBehavior ? `Actual: ${fb.actualBehavior}` : ''}
---`);
        });
      }
      return;
    }

    console.log(`🏃 Active Sprint: ${activeSprint.name}`);
    console.log(`📅 Period: ${activeSprint.startDate.toLocaleDateString()} - ${activeSprint.endDate.toLocaleDateString()}`);
    console.log(`📝 Total items: ${activeSprint.feedbacks.length}`);

    if (activeSprint.goals) {
      console.log(`🎯 Goals: ${activeSprint.goals}`);
    }

    console.log('\n📋 Sprint Items:\n');

    const priorityEmojis = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '🟢'
    };

    const statusEmojis = {
      NEW: '🆕',
      REVIEWED: '👀',
      IN_PROGRESS: '🔄',
      SCHEDULED: '📅',
      RESOLVED: '✅',
      ARCHIVED: '📦'
    };

    activeSprint.feedbacks.forEach((feedback, index) => {
      console.log(`
${index + 1}. ${priorityEmojis[feedback.priority]} ${statusEmojis[feedback.status]} ${feedback.type.toUpperCase()}
ID: ${feedback.id}
User: ${feedback.user.name || feedback.user.email}
Page: ${feedback.page}
Message: ${feedback.message}
${feedback.expectedBehavior ? `Expected: ${feedback.expectedBehavior}` : ''}
${feedback.actualBehavior ? `Actual: ${feedback.actualBehavior}` : ''}
${feedback.adminNotes ? `Admin Notes: ${feedback.adminNotes}` : ''}
Status: ${feedback.status} | Priority: ${feedback.priority}
---`);
    });

    // Summary
    const statusCounts = activeSprint.feedbacks.reduce((acc, fb) => {
      acc[fb.status] = (acc[fb.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${statusEmojis[status]} ${status}: ${count}`);
    });

  } catch (error) {
    console.error('Error checking sprint items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSprintItems();