// Order summary, part-wise status and consignment tracking (ORDER-01…04, PART-01…06, CONSIGN-01…03,
// DATA-02, SRS 8.6, 8.7, 13.6, 13.7). Each section loads on its own; a failure shows that section's
// fallback while the others and the rest of the case stay usable (SRS 11.9.1).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import type { Consignment, PartLine, SectionStatus } from '../../api/types';
import { LastRefreshed, SectionFallback } from '../../components/states';
import { Timeline } from '../../components/Timeline';
import { Button, Card, KeyValue, Pill, SectionTitle, L } from '../../components/ui';
import { displayDate, displayDateTime, displayQuantity, displayText, FALLBACK } from '../../domain/display';
import { derivePartStatus, PART_STATUS_LABEL, pendingQuantity, type PartDeliveryStatus } from '../../domain/part-status';
import { useQuery } from '../../hooks/useQuery';
import { colors, fonts, spacing, type } from '../../theme';

const PART_TONE: Record<PartDeliveryStatus, [string, string]> = {
  'fully-delivered': [colors.successTint, colors.success],
  'partially-delivered': [colors.warningTint, colors.warning],
  'not-delivered': [colors.neutralTint, colors.neutral],
  'under-review': [colors.escalatedTint, colors.escalated],
  'not-available': [colors.neutralTint, colors.neutral],
};

const SECTION_DEFAULT: Record<string, string> = {
  order: 'Order details are not available for this case yet.',
  parts: 'Part details are not available for this case yet.',
  tracking: 'Tracking is not available for this case.',
};

function stateMessage(section: SectionStatus, key: keyof typeof SECTION_DEFAULT) {
  if (section.state === 'unavailable') return section.message ?? 'The latest information is being updated. Please check again later.';
  return section.message ?? SECTION_DEFAULT[key];
}

function SectionError({ what, onRetry, testID }: { what: string; onRetry: () => void; testID: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionFallback message={`${what} ${FALLBACK.temporarilyUnavailable.toLowerCase()}. Please try again.`} testID={testID} />
      <Button label="Try again" variant="ghost" small onPress={onRetry} testID={`${testID}.retry`} />
    </View>
  );
}

export function OrderPartsTab({ caseId, show }: { caseId: string; show: { order: boolean; parts: boolean; consignment: boolean } }) {
  const order = useQuery(() => api.getOrder(caseId), [caseId]);
  const parts = useQuery(() => (show.parts ? api.getParts(caseId) : Promise.resolve(null)), [caseId, show.parts]);
  const tracking = useQuery(() => (show.consignment ? api.getConsignments(caseId) : Promise.resolve(null)), [caseId, show.consignment]);

  return (
    <View style={{ gap: spacing.lg }} testID="orderParts">
      {/* Order */}
      <Card style={s.pad} testID="orderParts.order">
        <View style={s.head}>
          <SectionTitle>Order</SectionTitle>
          {order.data?.order?.overallStatus ? <Pill label={displayText(order.data.order.overallStatus.label)} bg={colors.warningTint} fg={colors.warning} testID="orderParts.order.status" /> : null}
        </View>
        {order.loading ? (
          <Text style={s.muted}>Loading order details…</Text>
        ) : order.error ? (
          <SectionError what="Order details are" onRetry={order.reload} testID="orderParts.order.error" />
        ) : order.data?.order && order.data.section.state === 'available' ? (
          <>
            <View style={s.qty}>
              <Qty label="Parts" value={displayQuantity(order.data.order.totalParts)} />
              <Qty label="Delivered" value={displayQuantity(order.data.order.deliveredParts)} color={colors.success} />
              <Qty label="Pending" value={displayQuantity(order.data.order.pendingParts)} color={colors.warning} />
            </View>
            <View>
              <KeyValue first label="Order number" value={displayText(order.data.order.salesOrderNo)} testID="orderParts.order.number" />
              <KeyValue label="Order type" value={displayText(order.data.order.orderType?.label)} />
              <KeyValue label="PO number" value={displayText(order.data.order.poNumber)} />
              <KeyValue label="PO date" value={displayDate(order.data.order.poDate)} />
              <KeyValue label="Plant" value={displayText(order.data.order.plant?.label)} />
              <KeyValue label="Dealer" value={order.data.order.dealer ? `${order.data.order.dealer.name} (${order.data.order.dealer.dealerCode})` : FALLBACK.notAvailable} />
              {order.data.order.soldToParty ? <KeyValue label="Sold-to party" value={displayText(order.data.order.soldToParty)} /> : null}
              {order.data.order.chassisNumber ? <KeyValue label="Chassis number" value={displayText(order.data.order.chassisNumber)} /> : null}
            </View>
            <LastRefreshed at={order.data.section.lastRefreshedAt} testID="orderParts.order.refreshed" />
          </>
        ) : order.data ? (
          <>
            <SectionFallback message={stateMessage(order.data.section, 'order')} testID="orderParts.order.fallback" />
            {order.data.section.lastRefreshedAt ? <LastRefreshed at={order.data.section.lastRefreshedAt} /> : null}
          </>
        ) : null}
      </Card>

      {/* Parts */}
      {show.parts ? (
        <View style={{ gap: spacing.md }} testID="orderParts.parts">
          <SectionTitle>Parts</SectionTitle>
          {parts.loading ? (
            <Text style={s.muted}>Loading parts…</Text>
          ) : parts.error ? (
            <SectionError what="Part details are" onRetry={parts.reload} testID="orderParts.parts.error" />
          ) : parts.data && parts.data.parts.length ? (
            <>
              {parts.data.parts.map((p, i) => <PartCard key={p.lineId} part={p} testID={`orderParts.part.${i}`} />)}
              <LastRefreshed at={parts.data.section.lastRefreshedAt} testID="orderParts.parts.refreshed" />
            </>
          ) : parts.data ? (
            <SectionFallback message={stateMessage(parts.data.section, 'parts')} testID="orderParts.parts.fallback" />
          ) : null}
        </View>
      ) : null}

      {/* Tracking */}
      {show.consignment ? (
        <View style={{ gap: spacing.md }} testID="orderParts.tracking">
          <SectionTitle>Tracking</SectionTitle>
          {tracking.loading ? (
            <Text style={s.muted}>Loading tracking…</Text>
          ) : tracking.error ? (
            <SectionError what="Tracking is" onRetry={tracking.reload} testID="orderParts.tracking.error" />
          ) : tracking.data && tracking.data.consignments.length ? (
            tracking.data.consignments.map((c, i) => <ConsignmentCard key={c.reference} c={c} testID={`orderParts.consignment.${i}`} />)
          ) : (
            <SectionFallback message={SECTION_DEFAULT.tracking} testID="orderParts.tracking.fallback" />
          )}
        </View>
      ) : null}
    </View>
  );
}

function Qty({ label, value, color = colors.ink }: { label: string; value: string; color?: string }) {
  const long = value.length > 4;
  return (
    <View style={s.qtyCell} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[s.qtyValue, { color }, long && s.qtyLong]}>{value}</Text>
      <Text style={s.qtyLabel}>{label}</Text>
    </View>
  );
}

function PartCard({ part, testID }: { part: PartLine; testID: string }) {
  const status = derivePartStatus(part.orderedQty, part.deliveredQty);
  const pending = pendingQuantity(part.orderedQty, part.deliveredQty);
  const [bg, fg] = PART_TONE[status];
  return (
    <Card style={s.pad} testID={testID}>
      <View style={s.head}>
        <View style={L.flex1}>
          <Text style={s.partNo}>{displayText(part.partNumber)}</Text>
          <Text style={s.muted}>
            {displayText(part.description)}
            {part.hsnCode ? ` · HSN ${part.hsnCode}` : ''}
          </Text>
        </View>
        <Pill label={PART_STATUS_LABEL[status]} bg={bg} fg={fg} testID={`${testID}.status`} />
      </View>
      <View style={s.qty}>
        <Qty label="Ordered" value={displayQuantity(part.orderedQty)} />
        <Qty label="Delivered" value={displayQuantity(part.deliveredQty)} />
        <Qty label="Pending" value={displayQuantity(pending)} color={pending ? colors.warning : colors.ink} />
      </View>
      <View>
        {status !== 'fully-delivered' ? <KeyValue first label="Expected delivery" value={displayDate(part.expectedDeliveryDate)} muted={!part.expectedDeliveryDate} testID={`${testID}.eda`} /> : null}
        <KeyValue first={status === 'fully-delivered'} label="Delivery no." value={displayText(part.deliveryNumber)} muted={!part.deliveryNumber} />
        <KeyValue label="Delivery date" value={displayDate(part.deliveryDate)} muted={!part.deliveryDate} />
        <KeyValue label="Invoice no." value={displayText(part.invoiceNumber)} muted={!part.invoiceNumber} />
        <KeyValue label="Invoice date" value={displayDate(part.invoiceDate)} muted={displayDate(part.invoiceDate) === FALLBACK.awaitingUpdate} testID={`${testID}.invoiceDate`} />
        {part.remarks ? <KeyValue label="Remarks" value={displayText(part.remarks)} /> : null}
      </View>
      {part.consignmentReference ? (
        <View style={s.track}>
          <Text style={s.trackText}>
            {displayText(part.consignmentReference)} · {part.consignmentStatus ? displayText(part.consignmentStatus.label) : 'Tracking unavailable'}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function ConsignmentCard({ c, testID }: { c: Consignment; testID: string }) {
  return (
    <Card style={s.pad} testID={testID}>
      <View style={s.head}>
        <Text style={s.partNo}>{displayText(c.reference)}</Text>
        <Text style={s.muted}>{[c.transporter, c.mode?.label].filter(Boolean).join(' · ') || ' '}</Text>
      </View>
      {c.section.state === 'available' && c.events.length ? (
        <>
          {c.status ? <Pill label={displayText(c.status.label)} bg={colors.infoTint} fg={colors.info} /> : null}
          <Timeline
            items={c.events.map((e, i) => ({ id: String(i), title: displayText(e.description), body: e.location, meta: displayDateTime(e.at) }))}
            testID={`${testID}.events`}
          />
          <LastRefreshed at={c.section.lastRefreshedAt} testID={`${testID}.refreshed`} />
        </>
      ) : (
        <SectionFallback message={c.section.message ?? 'Tracking unavailable right now. Please check again later.'} testID={`${testID}.fallback`} />
      )}
      {c.expectedDeliveryDate ? <KeyValue label="Expected delivery" value={displayDate(c.expectedDeliveryDate)} /> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  pad: { padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  muted: { ...type.caption, fontFamily: fonts.semibold, color: colors.inkMuted },
  qty: { flexDirection: 'row', gap: spacing.sm },
  qtyCell: { flex: 1, borderRadius: 12, backgroundColor: colors.canvas, paddingVertical: 8, paddingHorizontal: 10 },
  qtyValue: { fontFamily: fonts.extrabold, fontSize: 18 },
  qtyLong: { fontSize: 12, fontFamily: fonts.bold },
  qtyLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.inkMuted },
  partNo: { fontFamily: fonts.extrabold, fontSize: 15, color: colors.ink },
  track: { padding: 10, borderRadius: 12, backgroundColor: colors.infoTint },
  trackText: { fontFamily: fonts.bold, fontSize: 13, color: colors.info },
});
