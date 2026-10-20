'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  DEFAULT_REMINDER_WORDING,
  REMINDER_OFFSETS,
  type ReminderKind,
  type ReminderWording,
} from '@invoica/core';
import { saveReminderSettingsAction } from '@/lib/actions/settings';
import { Button, Checkbox, Field, FormMessage, Input, Panel, Textarea } from './ui';
import { reach } from '@/lib/reach';

const WHEN: Record<number, string> = {
  [-3]: '3 days before the due date',
  0: 'On the due date',
  7: '7 days after',
  14: '14 days after',
  30: '30 days after',
};

const KINDS: { kind: ReminderKind; label: string }[] = [
  { kind: 'before', label: 'Before the due date' },
  { kind: 'due', label: 'On the due date' },
  { kind: 'late', label: 'After the due date' },
];

/** When reminders go and what they say (docs/specs/reminders.md). */
export function ReminderSettings({
  initial,
  inPlan,
}: {
  initial: {
    remindersEnabled: boolean;
    reminderOffsets: number[];
    reminderWording: Partial<Record<ReminderKind, ReminderWording>>;
  };
  inPlan: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.remindersEnabled);
  const [offsets, setOffsets] = useState<number[]>(initial.reminderOffsets);
  const [wording, setWording] = useState<Record<ReminderKind, ReminderWording>>({
    before: initial.reminderWording.before ?? DEFAULT_REMINDER_WORDING.before,
    due: initial.reminderWording.due ?? DEFAULT_REMINDER_WORDING.due,
    late: initial.reminderWording.late ?? DEFAULT_REMINDER_WORDING.late,
  });
  const [message, setMessage] = useState<{ tone: 'danger' | 'info'; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    // Wording left as the default is not saved, so it follows any later change to the default.
    const own = Object.fromEntries(
      KINDS.filter(
        ({ kind }) =>
          wording[kind].subject !== DEFAULT_REMINDER_WORDING[kind].subject ||
          wording[kind].body !== DEFAULT_REMINDER_WORDING[kind].body,
      ).map(({ kind }) => [kind, wording[kind]]),
    );
    start(async () => {
      const r = await reach(
        saveReminderSettingsAction({
          remindersEnabled: enabled,
          reminderOffsets: offsets,
          reminderWording: own,
        }),
      );
      if (!r.ok) return setMessage({ tone: 'danger', text: r.message });
      setMessage({ tone: 'info', text: 'Reminder settings saved.' });
      router.refresh();
    });
  }

  return (
    <Panel id="reminders" className="scroll-mt-24">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="text-[16px] font-semibold">Reminders</h2>
          <p className="mt-1 text-[14px] text-muted">
            Email clients about unpaid invoices, with the invoice attached and what is owed at that moment.
          </p>
        </div>
        <div className="flex flex-col gap-5">
          {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
          {!inPlan ? (
            <p className="text-[14px] text-muted">Reminders are part of the Pro and Studio plans.</p>
          ) : null}
          <Checkbox
            label="Remind clients about unpaid invoices"
            hint="Each client can be left out on their page, and each invoice paused."
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {enabled ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[14px] font-medium">When</legend>
              {REMINDER_OFFSETS.map((o) => (
                <Checkbox
                  key={o}
                  label={WHEN[o]!}
                  checked={offsets.includes(o)}
                  onChange={(e) =>
                    setOffsets((list) =>
                      e.target.checked ? [...list, o].sort((a, b) => a - b) : list.filter((x) => x !== o),
                    )
                  }
                />
              ))}
            </fieldset>
          ) : null}
          {enabled ? (
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-medium">What they say</p>
              <p className="text-[13px] text-muted">
                These are filled in for each invoice: {'{client}'}, {'{number}'}, {'{amount}'} (owed now),{' '}
                {'{due_date}'}, {'{days_late}'} and {'{business}'}.
              </p>
              {KINDS.map(({ kind, label }) => (
                <details key={kind} className="rounded-[12px] border border-line px-4 py-3">
                  <summary className="cursor-pointer text-[14px] font-medium">{label}</summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <Field label="Subject" htmlFor={`r-${kind}-subject`}>
                      <Input
                        id={`r-${kind}-subject`}
                        value={wording[kind].subject}
                        onChange={(e) =>
                          setWording((w) => ({ ...w, [kind]: { ...w[kind], subject: e.target.value } }))
                        }
                      />
                    </Field>
                    <Field label="Email" htmlFor={`r-${kind}-body`}>
                      <Textarea
                        id={`r-${kind}-body`}
                        value={wording[kind].body}
                        onChange={(e) =>
                          setWording((w) => ({ ...w, [kind]: { ...w[kind], body: e.target.value } }))
                        }
                        className="min-h-40"
                      />
                    </Field>
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setWording((w) => ({ ...w, [kind]: DEFAULT_REMINDER_WORDING[kind] }))}
                      >
                        Use the standard wording
                      </Button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : null}
          <div>
            <Button onClick={save} disabled={pending}>
              {pending ? 'Saving' : 'Save reminder settings'}
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
