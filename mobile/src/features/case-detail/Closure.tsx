// Closure remarks, feedback and reopen (DETAIL-12…14, FEEDBACK-01/02, ATTACH-05, FLOW-04).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, userMessageFor } from '../../api';
import type { CaseDetail } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Button, Card, TextField } from '../../components/ui';
import { RATING_LABEL, validateFeedback, validateReopen } from '../../domain/closure-rules';
import { displayDateTime, displayText } from '../../domain/display';
import { colors, fonts, spacing, type } from '../../theme';

export function ClosureCard({ closure }: { closure: NonNullable<CaseDetail['closure']> }) {
  return (
    <View style={s.closure} testID="caseDetail.closure">
      <Text style={s.closureOver}>Resolution · Closed {displayDateTime(closure.closedAt)}</Text>
      <Text style={s.closureText}>{displayText(closure.remarks, 'No closing remarks were added.')}</Text>
    </View>
  );
}

export function FeedbackCard({ detail, onDone }: { detail: CaseDetail; onDone: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (detail.feedback) {
    return (
      <Card style={s.pad} testID="feedback.given">
        <Text style={s.title}>Your feedback</Text>
        <Stars value={detail.feedback.rating} readOnly />
        {detail.feedback.remarks ? <Text style={s.body}>{displayText(detail.feedback.remarks)}</Text> : null}
        <Text style={s.caption}>Thank you. Submitted {displayDateTime(detail.feedback.submittedAt)}</Text>
      </Card>
    );
  }
  if (!detail.actions.canGiveFeedback) return null;

  const submit = async () => {
    const problem = validateFeedback(rating, remarks);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await api.submitFeedback(detail.id, { rating: rating as 1 | 2 | 3 | 4 | 5, remarks: remarks.trim() || null });
      onDone();
    } catch (err) {
      setError(userMessageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={s.pad} testID="feedback">
      <View>
        <Text style={s.title}>How was the support on this case?</Text>
        <Text style={s.caption}>1 is poor, 5 is excellent</Text>
      </View>
      <Stars value={rating ?? 0} onChange={r => { setRating(r); setError(null); }} />
      {rating ? <Text style={s.caption} testID="feedback.ratingLabel">{RATING_LABEL[rating]}</Text> : null}
      <TextField label="Anything to add? (optional)" value={remarks} onChangeText={setRemarks} multiline maxLength={500} testID="feedback.remarks" />
      {error ? <Text style={s.err} testID="feedback.error">{error}</Text> : null}
      <Button label="Submit feedback" onPress={submit} loading={busy} testID="feedback.submit" />
    </Card>
  );
}

function Stars({ value, onChange, readOnly }: { value: number; onChange?: (n: number) => void; readOnly?: boolean }) {
  return (
    <View style={s.stars} accessibilityRole={readOnly ? undefined : 'radiogroup'} accessibilityLabel={readOnly ? `Rated ${value} out of 5` : 'Rating'}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = n <= value;
        const star = <Icon name="star" color={on ? '#B26A00' : colors.inkSubtle} filled={on} size={26} />;
        return readOnly ? (
          <View key={n} style={[s.star, s.starSmall, on && s.starOn]}>{star}</View>
        ) : (
          <Pressable
            key={n}
            onPress={() => onChange?.(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: n === value }}
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}, ${RATING_LABEL[n]}`}
            style={[s.star, on && s.starOn]}
            testID={`feedback.star.${n}`}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReopenCard({ onPress }: { onPress: () => void }) {
  return (
    <Card style={s.pad} testID="reopen.card">
      <Text style={s.title}>Issue not solved?</Text>
      <Text style={s.caption}>You can reopen this case and tell support what is still pending.</Text>
      <Button label="Reopen case" variant="ghost" small onPress={onPress} testID="reopen.open" />
    </Card>
  );
}

export function ReopenSheet({ detail, visible, onClose, onDone }: { detail: CaseDetail; visible: boolean; onClose: () => void; onDone: () => void }) {
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const problem = validateReopen(remarks);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await api.reopenCase(detail.id, { remarks: remarks.trim() });
      setRemarks('');
      onDone();
    } catch (err) {
      setError(userMessageFor(err)); // remarks stay in the box
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Reopen this case?" subtitle="Support will review it again. Tell them what is still pending." testID="reopen">
      <TextField
        label="Why are you reopening it?"
        required
        value={remarks}
        onChangeText={t => { setRemarks(t); setError(null); }}
        multiline
        maxLength={300}
        error={error ?? undefined}
        hint="At least 10 characters"
        testID="reopen.remarks"
      />
      <Button label="Reopen case" onPress={submit} loading={busy} testID="reopen.submit" />
      <Button label="Cancel" variant="ghost" onPress={onClose} testID="reopen.cancel" />
    </Sheet>
  );
}

const s = StyleSheet.create({
  pad: { padding: spacing.lg, gap: spacing.md },
  closure: { borderRadius: 20, backgroundColor: '#F3FAF5', borderWidth: 1, borderColor: '#CFE9D6', padding: spacing.lg, gap: spacing.sm },
  closureOver: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.success },
  closureText: { ...type.body, fontFamily: fonts.semibold, color: colors.ink },
  title: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  body: { ...type.bodySmall, color: colors.inkStrong },
  caption: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted, marginTop: 2 },
  err: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  stars: { flexDirection: 'row', gap: spacing.sm },
  star: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#D6DDE9', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  starSmall: { width: 40, height: 40, borderRadius: 12 },
  starOn: { backgroundColor: colors.warningTint, borderColor: '#F0C96A' },
});
