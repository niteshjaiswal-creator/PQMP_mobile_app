// Messages and files (DETAIL-06, DETAIL-08, ATTACH-01…04, FLOW-03, SRS 8.8, 13.10).
// A reply to an open clarification request is sent as its response. Failed sends keep the text.
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, userMessageFor } from '../../api';
import type { Attachment, CaseDetail, Comment } from '../../api/types';
import { Icon } from '../../components/Icon';
import { SectionFallback } from '../../components/states';
import { Button, Card, Divider, ListRow, SectionTitle } from '../../components/ui';
import { attachmentProblem, formatSize } from '../../domain/attachment-policy';
import { customerFacingOwner } from '../../domain/case-status';
import { displayDate, displayDateTime, displayText } from '../../domain/display';
import { useQuery } from '../../hooks/useQuery';
import { colors, fonts, spacing, type } from '../../theme';
import { chooseAndPick } from '../attachments/pickFile';

type Props = { detail: CaseDetail; internalView: boolean; onChanged: () => void };

const SOURCE: Record<Attachment['source'], string> = { user: 'Uploaded', support: 'From support', scan: 'Scanned invoice' };

/** The open clarification request the user should answer, if any. */
export function openClarification(comments: Comment[]): Comment | null {
  const visible = comments.filter(c => !c.internal);
  const last = visible[visible.length - 1];
  return last?.isClarificationRequest ? last : null;
}

export function MessagesTab({ detail, internalView, onChanged }: Props) {
  const q = useQuery(async () => {
    const [comments, files] = await Promise.all([api.getComments(detail.id), api.getAttachments(detail.id)]);
    return { comments, files };
  }, [detail.id]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const author = (c: Comment) =>
    c.author.type === 'dealer' ? (internalView ? displayText(c.author.name, 'Dealer') : 'You') : internalView ? displayText(c.author.name, 'Support') : customerFacingOwner(c.author.name);
  const mine = (c: Comment) => (internalView ? c.author.type !== 'dealer' : c.author.type === 'dealer');
  const ask = q.data && !internalView ? openClarification(q.data.comments) : null;

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const c = await api.postComment(detail.id, { text: body, inReplyTo: ask?.id ?? null });
      setText('');
      q.setData(d => (d ? { ...d, comments: [...d.comments, c] } : d));
      onChanged();
    } catch (err) {
      setSendError(userMessageFor(err)); // text stays in the box
    } finally {
      setSending(false);
    }
  };

  const addFile = async () => {
    setFileError(null);
    const picked = await chooseAndPick();
    if (!picked) return;
    const problem = attachmentProblem(picked.file, 0);
    if (problem) return setFileError(problem);
    setUploading(true);
    try {
      const up = await api.uploadAttachment(picked.file, 'case_file', picked.source);
      const linked = await api.linkAttachments(detail.id, [up.id]);
      q.setData(d => (d ? { ...d, files: [...d.files, ...linked] } : d));
    } catch (err) {
      setFileError(userMessageFor(err));
    } finally {
      setUploading(false);
    }
  };

  const open = async (a: Attachment) => {
    try {
      const { url } = await api.getDownloadUrl(a.id);
      await Linking.openURL(url);
    } catch (err) {
      setFileError(userMessageFor(err));
    }
  };

  if (q.loading) return <Text style={s.muted}>Loading messages…</Text>;
  if (q.error || !q.data)
    return (
      <View style={{ gap: spacing.sm }}>
        <SectionFallback message={q.error ?? ''} testID="messages.error" />
        <Button label="Try again" variant="ghost" small onPress={q.reload} testID="messages.retry" />
      </View>
    );

  return (
    <View style={{ gap: spacing.lg }} testID="messages">
      <View style={{ gap: spacing.md }}>
        <SectionTitle right={detail.actions.canAddFiles ? <Button label="Add file" icon="clip" variant="ghost" small loading={uploading} onPress={addFile} testID="messages.addFile" /> : undefined}>
          {`Files · ${q.data.files.length}`}
        </SectionTitle>
        {fileError ? <Text style={s.err} testID="messages.fileError">{fileError}</Text> : null}
        {q.data.files.length ? (
          <Card>
            {q.data.files.map((a, i) => (
              <React.Fragment key={a.id}>
                {i ? <Divider /> : null}
                <ListRow
                  icon="file"
                  title={displayText(a.fileName)}
                  subtitle={`${SOURCE[a.source]} · ${a.uploadedBy.type === 'dealer' ? (internalView ? displayText(a.uploadedBy.name, 'Dealer') : 'You') : internalView ? displayText(a.uploadedBy.name) : customerFacingOwner(a.uploadedBy.name)} · ${displayDate(a.uploadedAt)} · ${formatSize(a.sizeBytes)}`}
                  onPress={() => open(a)}
                  right={<Icon name="download" color={colors.inkMuted} size={18} />}
                  testID={`messages.file.${i}`}
                />
              </React.Fragment>
            ))}
          </Card>
        ) : (
          <Text style={s.muted}>No files yet.</Text>
        )}
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle>Messages</SectionTitle>
        {q.data.comments.length ? (
          q.data.comments.map((c, i) => (
            <View
              key={c.id}
              style={[s.msg, mine(c) ? s.me : s.them, c.isClarificationRequest && !mine(c) && s.ask, c.internal && s.internal]}
              testID={`messages.item.${i}`}
            >
              <Text style={[s.who, mine(c) && s.mineMeta, c.isClarificationRequest && !mine(c) && { color: colors.danger }]}>
                {author(c)}
                {c.isClarificationRequest ? (internalView ? ' · question for the dealer' : ' · question for you') : ''}
                {c.internal ? ' · internal' : ''}
              </Text>
              <Text style={[s.msgText, mine(c) && { color: colors.paper }]}>{displayText(c.text)}</Text>
              <Text style={[s.time, mine(c) && s.mineMeta]}>{displayDateTime(c.at)}</Text>
            </View>
          ))
        ) : (
          <Text style={s.muted}>No messages yet.</Text>
        )}
      </View>

      {detail.actions.canComment ? (
        <View style={{ gap: spacing.sm }}>
          {ask ? <Text style={s.askHint}>Replying to: “{displayText(ask.text)}”</Text> : null}
          <View style={s.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={ask ? 'Reply to support' : internalView ? 'Message the dealer' : 'Message support'}
              placeholderTextColor={colors.inkSubtle}
              multiline
              maxLength={1000}
              style={s.input}
              accessibilityLabel="Message"
              testID="messages.input"
            />
            <Pressable onPress={send} disabled={!text.trim() || sending} accessibilityRole="button" accessibilityLabel="Send" style={[s.send, (!text.trim() || sending) && s.disabled]} testID="messages.send">
              <Icon name="send" color={colors.paper} size={20} />
            </Pressable>
          </View>
          {sendError ? <Text style={s.err} testID="messages.sendError">{sendError}</Text> : null}
        </View>
      ) : (
        <SectionFallback message={
            detail.statusGroup === 'closed'
              ? detail.actions.canReopen ? 'This case is closed. Reopen it to send a message.' : 'This case is closed.'
              : 'Messages are read-only for your role.'
          } testID="messages.readOnly" />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  muted: { ...type.bodySmall, color: colors.inkMuted },
  err: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  msg: { maxWidth: '86%', padding: 12, borderRadius: 18, gap: 4 },
  them: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E4E8F0', borderBottomLeftRadius: 6 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  ask: { backgroundColor: '#FDEEEE', borderColor: '#F3C3C3' },
  internal: { borderStyle: 'dashed', borderColor: '#B9C6DC' },
  who: { fontFamily: fonts.extrabold, fontSize: 11, color: colors.inkMuted },
  msgText: { ...type.bodySmall, color: colors.ink },
  time: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkMuted },
  mineMeta: { color: '#DCE6F5' },
  disabled: { opacity: 0.5 },
  askHint: { ...type.caption, fontFamily: fonts.semibold, color: colors.danger },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 14, borderWidth: 1, borderColor: '#D6DDE9', backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
