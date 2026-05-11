import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { useResolvedScheme } from '@/hooks/useResolvedScheme';

import { SelectButton } from './FormField';

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseIsoDate(value: string | undefined): Date {
  if (!value) return new Date();
  const parts = value.split('-').map(Number) as [number, number, number];
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function parseTime(value: string | undefined): Date {
  const d = new Date();
  if (!value) return d;
  const [h, m] = value.split(':').map(Number);
  if (Number.isFinite(h)) d.setHours(h ?? 0);
  if (Number.isFinite(m)) d.setMinutes(m ?? 0);
  return d;
}

export interface DateFieldProps {
  value: string | undefined;
  onChange: (next: string) => void;
  invalid?: boolean;
  placeholder?: string;
}

export function DateField({ value, onChange, invalid, placeholder }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const effectivePlaceholder = placeholder ?? t('form.date_placeholder');

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (date) onChange(formatDateIso(date));
  };

  return (
    <>
      <SelectButton
        value={value}
        placeholder={effectivePlaceholder}
        onPress={() => setOpen(true)}
        invalid={invalid}
      />
      {open ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
            <View className="flex-1 justify-end bg-black/40">
              <View className="bg-surface-light dark:bg-surface-dark p-4 pb-8">
                <DateTimePicker
                  mode="date"
                  display="spinner"
                  value={parseIsoDate(value)}
                  onChange={handleChange}
                  themeVariant={scheme}
                />
                <Pressable
                  onPress={() => setOpen(false)}
                  className="mt-2 items-center rounded-full bg-primary py-3"
                >
                  <Text className="font-semibold text-white">{t('common.done')}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker mode="date" value={parseIsoDate(value)} onChange={handleChange} />
        )
      ) : null}
    </>
  );
}

export interface TimeFieldProps {
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function TimeField({ value, onChange, placeholder }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const scheme = useResolvedScheme();
  const effectivePlaceholder = placeholder ?? t('form.time_placeholder');

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (date) onChange(formatTime(date));
  };

  return (
    <>
      <SelectButton
        value={value}
        placeholder={effectivePlaceholder}
        onPress={() => setOpen(true)}
      />
      {open ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
            <View className="flex-1 justify-end bg-black/40">
              <View className="bg-surface-light dark:bg-surface-dark p-4 pb-8">
                <DateTimePicker
                  mode="time"
                  display="spinner"
                  value={parseTime(value)}
                  onChange={handleChange}
                  themeVariant={scheme}
                />
                <Pressable
                  onPress={() => setOpen(false)}
                  className="mt-2 items-center rounded-full bg-primary py-3"
                >
                  <Text className="font-semibold text-white">{t('common.done')}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker mode="time" value={parseTime(value)} onChange={handleChange} />
        )
      ) : null}
    </>
  );
}
